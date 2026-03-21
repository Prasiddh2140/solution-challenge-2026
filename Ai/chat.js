// Ai/chat.js

const AI_CONFIG = {
  model: "gemini-2.0-flash",
  baseURL: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
  systemInstruction: `You are a helpful and knowledgeable agricultural AI assistant. 
Your goal is to converse with the user, find out where they live natively, and then warn them about specific areas near them that face drought or have high chances of food and water shortages based on actual climate, geographic, and agricultural data. 
Keep your responses friendly, concise, and easy to read. 
Always ask probing questions if you don't know their location yet.`
};

async function chat(history) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("API Key missing from .env");

  // Format the history to match Gemini's strict history array
  const formattedContents = history.map(msg => ({
    role: msg.role === 'ai' ? 'model' : 'user', 
    parts: [{ text: msg.text }]
  }));

  const response = await fetch(`${AI_CONFIG.baseURL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: AI_CONFIG.systemInstruction }] },
      contents: formattedContents
    })
  });

  if (!response.ok) {
    const errObj = await response.json();
    throw new Error(`${errObj.error ? errObj.error.message : response.statusText}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

module.exports = chat;
