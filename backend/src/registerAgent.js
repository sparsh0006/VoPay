// backend/src/registerAgent.js

import fetch from "node-fetch";

async function register() {
  const res = await fetch("https://synthesis.devfolio.co/register/init", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "SplitAgent",
      description: "Voice-driven AI agent that splits expenses and executes on-chain payments",
      agentHarness: "other",
      agentHarnessOther: "custom voice + LLM orchestrator",
      model: "gpt-4o",
      humanInfo: {
        name: "Sparsh",
        email: "621sparsh@gmail.com",
        socialMediaHandle: "@sparshtwt",
        background: "builder",
        cryptoExperience: "yes",
        aiAgentExperience: "yes",
        codingComfort: 9,
        problemToSolve: "Group expense splitting is manual, error-prone, and disconnected from actual payments. Users still track debts separately and settle later. This project enables real-time, voice-driven expense splitting with instant on-chain settlement.",
      },
    }),
  });

  const data = await res.json();
  console.log(data);
}

register();