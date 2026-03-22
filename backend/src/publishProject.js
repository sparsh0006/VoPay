import fetch from "node-fetch";

const API_KEY = "sk-synth-613cd21e65bb1c6e9b84f3a7874a5fb06d83b4f040efec91";
const PROJECT_UUID = "cfce359806ec4731a8a37886ca55f620";

async function publish() {
  const res = await fetch(`https://synthesis.devfolio.co/projects/${PROJECT_UUID}/publish`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
    },
  });

  const data = await res.json();
  console.log(data);
}

publish();