// backend/src/agentRunner.js

import { runAgent } from "./agent.js";

async function main() {
  const input = "Dinner was $120 split between me, Alice and Bob";

  const result = await runAgent(input);

  console.log("Agent executed:", result);
}

main();