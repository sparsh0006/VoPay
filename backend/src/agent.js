// backend/src/agent.js

import fetch from "node-fetch";

const BASE_URL = "http://localhost:4000";

export async function runAgent(input) {
  // Step 1: parse user intent
  const res = await fetch(`${BASE_URL}/api/pay/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transcript: input,
      groupId: "default",
      payerUsername: "me",
    }),
  });

  const parsed = await res.json();

  // Step 2: create expense
  const expense = await fetch(`${BASE_URL}/api/expenses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      description: parsed.description,
      total: parsed.total,
      groupId: "default",
      payerId: "default",
      splits: parsed.splits.map(s => ({
        userId: s.member,
        amount: s.amount,
      })),
    }),
  });

  return await expense.json();
}