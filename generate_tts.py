import os
import requests

API_KEY = "sk_7e345ddaa6994ffcc64b50e2ede93cbfc80c579932c45acd"
VOICE_ID = "EXAVITQu4vr4xnSDxMaL" # Rachel voice, or I can use a default male voice for Julian like "pNInz6obpgDQGcFmaJgB" (Adam)
# Let's use Adam for Julian
VOICE_ID = "pNInz6obpgDQGcFmaJgB"

url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"

headers = {
  "Accept": "audio/mpeg",
  "Content-Type": "application/json",
  "xi-api-key": API_KEY
}

data = {
  "text": "Hello, how may I help you!",
  "model_id": "eleven_monolingual_v1",
  "voice_settings": {
    "stability": 0.5,
    "similarity_boost": 0.5
  }
}

response = requests.post(url, json=data, headers=headers)

if response.status_code == 200:
    with open(r"d:\Office-agent\frontend\public\julian-greeting.mp3", 'wb') as f:
        f.write(response.content)
    print("Successfully generated julian-greeting.mp3")
else:
    print(f"Error: {response.status_code}")
    print(response.text)
