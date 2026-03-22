// backend/src/services/bot.js
import { Telegraf, Markup } from 'telegraf';
import db from '../lib/db.js';
import { parseExpense, isExpenseMessage } from '../lib/llm.js';

export const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// ── MUST be declared before any handler that uses it
const pendingWalletRegistrations = new Map();

// ─── /start ───────────────────────────────────────────────────────────────
bot.start(async (ctx) => {
  const telegramId = String(ctx.from.id);
  const username = ctx.from.username;

  if (ctx.chat.type !== 'private') {
    return ctx.reply(
      `👋 Hi @${username || ctx.from.first_name}! Please register privately:\n👉 https://t.me/${ctx.botInfo.username}`
    );
  }

  if (!username) {
    return ctx.reply('❌ Please set a Telegram username in your settings first.');
  }

  const existing = await db.user.findUnique({ where: { telegramId } });
  if (existing) {
    return ctx.reply(`✅ Already registered!\nWallet: \`${existing.walletAddress}\``, { parse_mode: 'Markdown' });
  }

  pendingWalletRegistrations.set(telegramId, { username, telegramId });

  return ctx.reply(
  `👋 Welcome to SplitAgent!\n\nSend your Celo wallet address or ENS name to register.\n\nExamples:\n\`0xAAA...FFF\`\n\`deepak.eth\``,
  { parse_mode: 'Markdown' }
);
});

// ─── All text messages ─────────────────────────────────────────────────────
bot.on('text', async (ctx) => {
  const telegramId = String(ctx.from.id);
  const text = ctx.message.text.trim();
  const chatType = ctx.chat.type;

  console.log(`[MSG] chat=${chatType} from=@${ctx.from.username} text="${text}"`);

  // ── PRIVATE CHAT
 if (chatType === 'private') {
  const pending = pendingWalletRegistrations.get(telegramId);

  if (pending) {
    const input = text.trim();

    // Direct 0x address
    if (/^0x[a-fA-F0-9]{40}$/.test(input)) {
      try {
        await db.user.create({
          data: {
            telegramUsername: pending.username,
            telegramId: pending.telegramId,
            walletAddress: input,
          },
        });
        pendingWalletRegistrations.delete(telegramId);
        return ctx.reply(
          `✅ Wallet registered!\n\nAddress: \`${input}\`\n\nYou're all set! 🎉`,
          { parse_mode: 'Markdown' }
        );
      } catch (err) {
        console.error('DB create user error:', err);
        return ctx.reply('❌ Failed to save wallet. Please try again.');
      }
    }

    // ENS name e.g. deepak.eth
    if (input.endsWith('.eth')) {
      await ctx.reply(`🔍 Resolving ${input} on Sepolia…`);
      try {
        const { resolveENS } = await import('../lib/ens.js');
        const address = await resolveENS(input);

        if (!address) {
          return ctx.reply(
            `❌ Could not resolve \`${input}\`\n\nMake sure it's registered on Sepolia ENS and has an address record set.`,
            { parse_mode: 'Markdown' }
          );
        }

        await db.user.create({
          data: {
            telegramUsername: pending.username,
            telegramId: pending.telegramId,
            walletAddress: address,
            ensName: input,
          },
        });
        pendingWalletRegistrations.delete(telegramId);
        return ctx.reply(
          `✅ ENS registered!\n\n*${input}*\n\`${address}\`\n\nYou're all set! 🎉`,
          { parse_mode: 'Markdown' }
        );
      } catch (err) {
  console.error('ENS resolve error:', err);
  return ctx.reply(
    `❌ ENS resolution failed: ${err.message}\n\nPlease try again or register with your \`0x\` address directly.`,
    { parse_mode: 'Markdown' }
  );
}
    }

    // Wrong format
    return ctx.reply(
      '❌ Invalid input.\n\nSend either:\n• Your wallet: `0xAAA...FFF`\n• Your ENS name: `deepak.eth`',
      { parse_mode: 'Markdown' }
    );
  }

  return;
}

  // ── GROUP CHAT
  if (chatType === 'group' || chatType === 'supergroup') {

    try {
      await db.group.upsert({
        where: { telegramId: String(ctx.chat.id) },
        update: { name: ctx.chat.title || 'Group' },
        create: { telegramId: String(ctx.chat.id), name: ctx.chat.title || 'Group' },
      });
    } catch (err) {
      console.error('Group upsert error:', err);
    }

    if (text.startsWith('/balance')) return handleBalance(ctx);
    if (text.startsWith('/pending')) return handlePending(ctx);
    if (text.startsWith('/history')) return handleHistory(ctx);
    if (text.startsWith('/help'))    return handleHelp(ctx);
    if (text.startsWith('/'))        return;

    try {
      const looksLikeExpense = await isExpenseMessage(text);
      console.log(`[EXPENSE_DETECT] "${text}" → ${looksLikeExpense}`);
      if (looksLikeExpense) {
        return handleExpense(ctx, text);
      }
    } catch (err) {
      console.error('isExpenseMessage error:', err);
      return ctx.reply('❌ AI service error. Please try again.');
    }
  }
});

// ─── Group welcome ─────────────────────────────────────────────────────────
bot.on('new_chat_members', async (ctx) => {
  const botId = ctx.botInfo.id;
  const addedBot = ctx.message.new_chat_members.some(m => m.id === botId);
  if (!addedBot) return;

  await db.group.upsert({
    where: { telegramId: String(ctx.chat.id) },
    update: { name: ctx.chat.title || 'Group' },
    create: { telegramId: String(ctx.chat.id), name: ctx.chat.title || 'Group' },
  });

  ctx.reply(
    `👋 SplitAgent here!\n\nEveryone please register by sending /start to me privately:\n👉 https://t.me/${ctx.botInfo.username}\n\nOnce registered, just type any expense naturally!`
  );
});

// ─── Expense handler ───────────────────────────────────────────────────────
async function handleExpense(ctx, text) {
  const groupTelegramId = String(ctx.chat.id);
  const payerTgId = String(ctx.from.id);
  const payerHandle = ctx.from.username;

  const payer = await db.user.findUnique({ where: { telegramId: payerTgId } });
  if (!payer) {
    return ctx.reply(
      `❌ @${payerHandle}, you need to register first!\n\n👉 Send /start to @${ctx.botInfo.username} in a private chat.`
    );
  }

  const group = await db.group.findUnique({ where: { telegramId: groupTelegramId } });
  if (!group) return ctx.reply('❌ Group not found. Please re-add the bot.');

  const mentionedUsernames = [...text.matchAll(/@(\w+)/g)]
    .map(m => m[1])
    .filter(u => u !== payerHandle && u !== ctx.botInfo.username);

  const unregistered = [];
  for (const username of mentionedUsernames) {
    const user = await db.user.findUnique({ where: { telegramUsername: username } });
    if (!user) unregistered.push(`@${username}`);
  }

  if (unregistered.length > 0) {
    return ctx.reply(
      `⚠️ These members aren't registered: ${unregistered.join(', ')}\n\nAsk them to send /start to @${ctx.botInfo.username} privately.`
    );
  }

  const allUsernames = [payerHandle, ...mentionedUsernames].filter(Boolean);
  // In bot.js handleExpense, update memberList building:
const memberList = [];
for (const username of allUsernames) {
  const user = await db.user.findUnique({ where: { telegramUsername: username } });
  if (user) memberList.push({
    username: user.telegramUsername,
    wallet: user.walletAddress,
    ens: user.ensName || null,
  });
}

  console.log('[EXPENSE] memberList:', memberList);
  await ctx.sendChatAction('typing');

  let parsed;
  try {
    parsed = await parseExpense(text, memberList, payer.telegramUsername);
    console.log('[EXPENSE] parsed:', JSON.stringify(parsed));
  } catch (err) {
    console.error('parseExpense error:', err);
    return ctx.reply(`❌ Could not parse expense. Try: "Dinner was $90, split between me and @${mentionedUsernames[0] || 'username'}"`);
  }

  let expense;
  try {
    const splitData = (await Promise.all(
      parsed.splits
        .filter(s => s.member !== `@${payer.telegramUsername}`)
        .map(async (s) => {
          const username = s.member.replace('@', '');
          const user = await db.user.findUnique({ where: { telegramUsername: username } });
          if (!user) return null;
          return { userId: user.id, amount: s.amount };
        })
    )).filter(Boolean);

    expense = await db.expense.create({
      data: {
        description: parsed.description,
        total: parsed.total,
        groupId: group.id,
        payerId: payer.id,
        splits: { create: splitData },
      },
    });
  } catch (err) {
    console.error('DB expense create error:', err);
    return ctx.reply('❌ Failed to save expense. Please try again.');
  }

  const splitLines = parsed.splits
    .map(s => {
      const isYou = s.member === `@${payer.telegramUsername}`;
      return `${s.member}  →  $${Number(s.amount).toFixed(2)}  ${isYou ? '_(your share)_' : '_(owes you)_'}`;
    })
    .join('\n');

  return ctx.reply(
    `🧾 *${parsed.description}* — $${Number(parsed.total).toFixed(2)} total\n\n${splitLines}\n\n@${payer.telegramUsername} tap below to send payments:`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('✅ Confirm & Pay', `confirm:${expense.id}`),
          Markup.button.callback('❌ Cancel', `cancel:${expense.id}`),
        ],
      ]),
    }
  );
}

// ─── Confirm ───────────────────────────────────────────────────────────────
bot.action(/^confirm:(.+)$/, async (ctx) => {
  const expenseId = ctx.match[1];
  const payerTgId = String(ctx.from.id);

  const expense = await db.expense.findUnique({ where: { id: expenseId }, include: { payer: true } });
  if (!expense) return ctx.answerCbQuery('❌ Expense not found');
  if (expense.payer.telegramId !== payerTgId) return ctx.answerCbQuery('⚠️ Only the payer can confirm');

  const payUrl = `${process.env.FRONTEND_URL}/pay/${expenseId}`;
  await ctx.answerCbQuery('✅ Check your DMs!');
  await ctx.telegram.sendMessage(payerTgId, `💳 Sign the payment:\n\n👉 ${payUrl}\n\n(MetaMask required)`);
});

// ─── Cancel ────────────────────────────────────────────────────────────────
bot.action(/^cancel:(.+)$/, async (ctx) => {
  await db.expense.update({ where: { id: ctx.match[1] }, data: { status: 'CANCELLED' } });
  await ctx.answerCbQuery('Cancelled');
  await ctx.editMessageText('❌ Expense cancelled.');
});

// ─── /balance ──────────────────────────────────────────────────────────────
async function handleBalance(ctx) {
  const parts = ctx.message.text.split(' ');
  const targetUsername = parts[1]?.replace('@', '');
  const requesterTgId = String(ctx.from.id);

  const requester = await db.user.findUnique({ where: { telegramId: requesterTgId } });
  if (!requester) return ctx.reply('❌ Register first — send /start to me privately.');
  if (!targetUsername) return ctx.reply('Usage: /balance @username');

  const target = await db.user.findUnique({ where: { telegramUsername: targetUsername } });
  if (!target) return ctx.reply(`❌ @${targetUsername} hasn't registered yet.`);

  const splits = await db.split.findMany({
    where: { userId: target.id, status: 'PENDING', expense: { payerId: requester.id } },
    include: { expense: true },
  });

  if (!splits.length) return ctx.reply(`✅ @${targetUsername} owes you nothing!`);

  const total = splits.reduce((sum, s) => sum + s.amount, 0);
  const lines = splits.map(s => `${s.expense.description.padEnd(20)} $${s.amount.toFixed(2)} ❌`).join('\n');

  return ctx.reply(
    `📊 @${targetUsername} owes @${requester.telegramUsername}:\n\n${lines}\n${'─'.repeat(34)}\nTotal  $${total.toFixed(2)}`,
    Markup.inlineKeyboard([[Markup.button.callback('Settle All Now', `settle_all:${requester.id}:${target.id}`)]])
  );
}

// ─── /pending ──────────────────────────────────────────────────────────────
async function handlePending(ctx) {
  const group = await db.group.findUnique({ where: { telegramId: String(ctx.chat.id) } });
  if (!group) return ctx.reply('❌ Group not set up.');

  const expenses = await db.expense.findMany({
    where: { groupId: group.id, status: 'PENDING' },
    include: { payer: true },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  if (!expenses.length) return ctx.reply('✅ No pending expenses!');
  const lines = expenses.map(e => `⏳ ${e.description} — $${e.total.toFixed(2)} (by @${e.payer.telegramUsername})`).join('\n');
  return ctx.reply(`📋 Pending:\n\n${lines}`);
}

// ─── /history ──────────────────────────────────────────────────────────────
async function handleHistory(ctx) {
  const group = await db.group.findUnique({ where: { telegramId: String(ctx.chat.id) } });
  if (!group) return ctx.reply('❌ Group not set up.');

  const expenses = await db.expense.findMany({
    where: { groupId: group.id },
    include: { payer: true },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  if (!expenses.length) return ctx.reply('No expenses yet!');
  const lines = expenses.map(e => `${e.status === 'SETTLED' ? '✅' : '⏳'} ${e.description} — $${e.total.toFixed(2)} by @${e.payer.telegramUsername}`).join('\n');
  return ctx.reply(`📜 Last ${expenses.length} expenses:\n\n${lines}`);
}

// ─── /help ─────────────────────────────────────────────────────────────────
function handleHelp(ctx) {
  return ctx.reply(
    `🤖 *SplitAgent Commands*\n\n/balance @user — see what someone owes you\n/pending — unsettled expenses\n/history — last 10 expenses\n/help — this message\n\nJust type any expense naturally! 💬`,
    { parse_mode: 'Markdown' }
  );
}

// ─── Settle all ────────────────────────────────────────────────────────────
bot.action(/^settle_all:(.+):(.+)$/, async (ctx) => {
  const [payerId, debtorId] = [ctx.match[1], ctx.match[2]];
  const payer = await db.user.findUnique({ where: { id: payerId } });
  if (!payer || payer.telegramId !== String(ctx.from.id)) return ctx.answerCbQuery('Only the creditor can settle');

  const pendingSplits = await db.split.findMany({
    where: { userId: debtorId, status: 'PENDING', expense: { payerId } },
    include: { expense: true },
  });

  if (!pendingSplits.length) return ctx.answerCbQuery('Nothing to settle!');

  const total = pendingSplits.reduce((s, sp) => s + sp.amount, 0);
  const newExpense = await db.expense.create({
    data: {
      description: 'Settle All',
      total,
      groupId: pendingSplits[0].expense.groupId,
      payerId,
      splits: { create: [{ userId: debtorId, amount: total }] },
    },
  });

  await ctx.answerCbQuery('Check DMs!');
  await ctx.telegram.sendMessage(payer.telegramId, `💳 Settle all:\n\n👉 ${process.env.FRONTEND_URL}/pay/${newExpense.id}`);
});