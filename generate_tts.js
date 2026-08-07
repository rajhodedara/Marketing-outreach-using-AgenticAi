const fs = require('fs');

const API_KEY = "sk_7e345ddaa6994ffcc64b50e2ede93cbfc80c579932c45acd";
const VOICE_ID = "pNInz6obpgDQGcFmaJgB"; // Adam

const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;

const headers = {
  "Accept": "audio/mpeg",
  "Content-Type": "application/json",
  "xi-api-key": API_KEY
};

const data = {
  "text": "Hello, how may I help you!",
  "model_id": "eleven_multilingual_v2",
  "voice_settings": {
    "stability": 0.5,
    "similarity_boost": 0.5
  }
};

fetch(url, {
  method: 'POST',
  headers: headers,
  body: JSON.stringify(data)
})
.then(async res => {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP error! status: ${res.status}, body: ${text}`);
  }
  return res.arrayBuffer();
})
.then(buffer => {
  fs.writeFileSync('d:\\Office-agent\\frontend\\public\\julian-greeting.mp3', Buffer.from(buffer));
  console.log("Successfully generated julian-greeting.mp3");
})
.catch(err => {
  console.error("Error generating TTS:", err);
});
