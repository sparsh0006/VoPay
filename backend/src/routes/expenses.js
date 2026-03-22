// backend/src/routes/expenses.js
import { Router } from 'express';
import db from '../lib/db.js';

const router = Router();

// GET /api/expenses/:id — Get expense with splits (for web app pay page)
router.get('/:id', async (req, res) => {
  try {
    const expense = await db.expense.findUnique({
      where: { id: req.params.id },
      include: {
        payer: true,
        splits: { include: { user: true } },
        group: true,
      },
    });
    if (!expense) return res.status(404).json({ error: 'Not found' });
    res.json(expense);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/expenses — Create expense from web app (voice flow)
router.post('/', async (req, res) => {
  try {
    const { description, total, groupId, payerId, splits } = req.body;

    const expense = await db.expense.create({
      data: {
        description,
        total,
        groupId,
        payerId,
        splits: {
          create: splits.map(s => ({ userId: s.userId, amount: s.amount })),
        },
      },
      include: { splits: { include: { user: true } } },
    });
    res.json(expense);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/expenses/:id/settle — Mark expense as settled after on-chain tx
router.patch('/:id/settle', async (req, res) => {
  try {
    const { txHashes } = req.body; // { splitId: txHash }

    // Update individual splits
    for (const [splitId, txHash] of Object.entries(txHashes)) {
      await db.split.update({
        where: { id: splitId },
        data: { txHash, status: 'PAID' },
      });
    }

    // Check if all splits paid → mark expense settled
    const expense = await db.expense.findUnique({
      where: { id: req.params.id },
      include: { splits: true },
    });

    const allPaid = expense.splits.every(s => s.status === 'PAID');
    if (allPaid) {
      await db.expense.update({
        where: { id: req.params.id },
        data: { status: 'SETTLED', settledAt: new Date() },
      });
    }

    // Send Telegram group notification
    await notifyGroupSettled(expense.id);

    res.json({ settled: allPaid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function notifyGroupSettled(expenseId) {
  try {
    const { bot } = await import('../services/bot.js');
    const expense = await db.expense.findUnique({
      where: { id: expenseId },
      include: {
        group: true,
        splits: { include: { user: true } },
      },
    });

    if (!expense) return;

    const celoExplorer = 'https://alfajores.celoscan.io/tx';
    const lines = expense.splits
      .filter(s => s.txHash)
      .map(s => `@${s.user.telegramUsername}  $${s.amount.toFixed(2)} cUSD  [view tx →](${celoExplorer}/${s.txHash})`)
      .join('\n');

    const date = new Date(expense.settledAt).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });

    await bot.telegram.sendMessage(
      expense.group.telegramId,
      `✅ *${expense.description}* — Settled!\n\n${lines}\n\n📅 ${date} · Celo Sepolia`,
      { parse_mode: 'Markdown' }
    );
  } catch { /* non-critical */ }
}

export default router;