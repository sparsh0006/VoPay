import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are SplitAgent, an expense splitting assistant.
Parse natural language expense messages into structured JSON.

## Output format
Return ONLY a valid JSON object. No markdown, no explanation.

{
  "description": string,    // 2-5 words, title case e.g. "Team Dinner"
  "total": number,          // final total after all adjustments
  "currency": string,       // inferred code e.g. "USD". Default "USD"
  "payer": string,          // "@username" of who paid
  "splits": [
    {
      "member": string,     // "@username"
      "amount": number,     // their share
      "wallet": string      // "0x..." or "" if unknown
    }
  ]
}

## Rules
- Split amounts MUST sum exactly to total.
- If no members list is provided, infer members from the message itself (e.g. "me and Alice" → @me and @alice).
- "Split equally" or no instruction → divide evenly.
- Adjustments like "Bob had extra $20" → apply first, split remainder equally.
- Payer is always included in splits with their own share.
- If it IS an expense message (mentions money, splitting, bills, food, transport, etc.) → parse it even if members list is empty.
- ONLY return { "error": "not an expense" } if the message contains absolutely no expense-related content.`;

export async function parseExpense(text, members, payerUsername) {
  const memberSection = members.length
  ? `Registered members:\n${members.map(m =>
      `  - @${m.username} → ${m.ens ? m.ens + ' (' + m.wallet + ')' : m.wallet}`
    ).join('\n')}`
  : `No pre-registered members. Infer members from the message text itself.`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    temperature: 0.1,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Payer: @${payerUsername}

${memberSection}

Expense message:
"${text}"`,
      },
    ],
  });

  const result = JSON.parse(response.choices[0].message.content);
  if (result.error) throw new Error(result.error);

  // Fix rounding drift
  const splitSum = result.splits.reduce((s, sp) => s + sp.amount, 0);
  const drift = parseFloat((result.total - splitSum).toFixed(2));
  if (Math.abs(drift) > 0 && result.splits.length > 0) {
    result.splits[0].amount = parseFloat((result.splits[0].amount + drift).toFixed(2));
  }

  return result;
}

export async function isExpenseMessage(text) {
  if (text.startsWith('/') || text.length < 8) return false;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    max_tokens: 5,
    messages: [
      {
        role: 'system',
        content: `Detect expense messages. Reply only "yes" or "no".
Yes if: mentions money, splitting costs, bills, who paid, food, transport, shopping, debts.
No if: greetings, questions, commands, random chat.`,
      },
      { role: 'user', content: text },
    ],
  });

  return response.choices[0].message.content.trim().toLowerCase() === 'yes';
}