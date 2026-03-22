import fetch from "node-fetch";

const API_KEY = "sk-synth-613cd21e65bb1c6e9b84f3a7874a5fb06d83b4f040efec91";
const TEAM_ID = "329dfba2a9a84e55b33f2fc27c174974";

// Best track (autonomous agent)
const TRACK_ID = "10bd47fac07e4f85bda33ba482695b24";

async function submitProject() {
  const res = await fetch("https://synthesis.devfolio.co/projects", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      teamUUID: TEAM_ID,

      name: "VoPay — Voice AI for Instant Expense Settlement",

      description: `VoPay is an autonomous AI agent that converts natural language into real financial actions on Celo.

Users simply speak: "Dinner was $120 split between me, Alice and Bob" — and VoPay understands intent, structures the expense, and executes instant on-chain payments using Celo.

By combining voice interfaces, LLM reasoning, and Celo’s fast, low-cost transactions, VoPay removes the gap between splitting and settling expenses.

This enables real-time, trustless group payments without manual tracking or delays.`,

      problemStatement: `Group expense splitting today is manual, fragmented, and disconnected from actual payments. Users track debts separately and settle later, leading to delays, confusion, and lack of trust in group finances.`,

      repoURL: "https://github.com/sparsh0006/VoPay",

      trackUUIDs: [TRACK_ID],

      conversationLog: `User speaks expense → speech-to-text → LLM parses intent → structured splits created → expense recorded → on-chain payments executed via Celo → Telegram notifications sent`,

      submissionMetadata: {
        agentFramework: "other",
        agentFrameworkOther: "custom voice + LLM orchestration",

        agentHarness: "other",
        agentHarnessOther: "custom Node.js backend agent loop",

        model: "gpt-4o",

        skills: [
          "speech-to-text",
          "natural language understanding",
          "expense parsing",
          "autonomous execution",
          "blockchain payments"
        ],

        tools: [
          "OpenAI API",
          "Whisper",
          "Celo blockchain (payments execution)",
          "Next.js",
          "Express",
          "Prisma",
          "PostgreSQL",
          "Telegram Bot"
        ],

        helpfulResources: [
          "https://platform.openai.com/docs",
          "https://docs.celo.org"
        ],

        intention: "continuing",
        intentionNotes: "Scaling VoPay into a fully autonomous financial agent with cross-border payment capabilities"
      },

      videoURL: "https://youtu.be/vsPNEGxXQtE"
    }),
  });

  const data = await res.json();
  console.log(data);
}

submitProject();