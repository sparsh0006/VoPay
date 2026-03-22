import fetch from "node-fetch";

const pendingId = "7909d1fcc8a2436aad967f209c0a24f5";

async function sendOTP() {
  const res = await fetch("https://synthesis.devfolio.co/register/verify/email/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pendingId }),
  });

  console.log(await res.json());
}

sendOTP();