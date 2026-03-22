import fetch from "node-fetch";

const pendingId = "7909d1fcc8a2436aad967f209c0a24f5";

async function complete() {
  const res = await fetch("https://synthesis.devfolio.co/register/complete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pendingId }),
  });

  const data = await res.json();
  console.log(data);
}

complete();