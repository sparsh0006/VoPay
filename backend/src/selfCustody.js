import fetch from "node-fetch";
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = "sk-synth-613cd21e65bb1c6e9b84f3a7874a5fb06d83b4f040efec91";
const PRIVATE_KEY = process.env.PRIVATE_KEY;

async function transfer() {
  // 1. Create wallet
  const wallet = new ethers.Wallet(PRIVATE_KEY);

  // 2. Create message to sign
  const message = "I am claiming ownership of this agent";

  // 3. Sign message
  const signature = await wallet.signMessage(message);

  // 4. Send to API
  const res = await fetch("https://synthesis.devfolio.co/agents/claim", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      address: wallet.address,
      signature,
      message,
    }),
  });

  const text = await res.text();
  console.log(text);
}

transfer();