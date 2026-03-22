import fetch from "node-fetch";

const pendingId = "7909d1fcc8a2436aad967f209c0a24f5";

async function confirmOTP() {
  const otp = "262480";

  const res = await fetch("https://synthesis.devfolio.co/register/verify/email/confirm", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pendingId, otp }),
  });

  console.log(await res.json());
}

confirmOTP();