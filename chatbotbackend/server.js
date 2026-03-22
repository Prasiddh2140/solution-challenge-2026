import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { mockEvents, mockNGOs } from './data/mockData.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Gemini
// Note: if @google/genai is used, we instantiate it this way. 
// If it fails, fallback to standard fetch or ensure user provides correct key.
// Ensure GEMINI_API_KEY is an environment variable.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// REST APIs for Frontend/Admin (Optional usage)
app.get('/api/events', (req, res) => {
    res.json(mockEvents);
});

app.get('/api/ngos', (req, res) => {
    res.json(mockNGOs);
});

// Chatbot functionality
app.post('/api/chat', async (req, res) => {
    const { message, history } = req.body;

    if (!message) {
        return res.status(400).json({ error: "Message is required" });
    }

    try {
        // We provide events & ngos as context (RAG approach) rather than heavy tool calling
        // for this hackathon demo to ensure absolute reliability and speed.
        // Alternatively, we define tools if we strictly need function calling.

        // For simplicity & robustness, we'll inject minimal DB state into the prompt.
        const systemInstruction = `
      You are a helpful, expert AI Volunteer Coordination Assistant for a social impact platform.
      Your goal is to help volunteers find suitable NGOs or Events based on their queries, skills, and locations.
      
      Here is the current database of upcoming Events (in JSON):
      ${JSON.stringify(mockEvents, null, 2)}
      
      Here is the current database of NGOs (in JSON):
      ${JSON.stringify(mockNGOs, null, 2)}
      
      Follow these rules:
      1. Answer FAQs naturally.
      2. If the user asks for opportunities, match their skills/location with the Events or NGOs provided.
      3. CRITICAL: If you are recommending an Event or an NGO, you MUST provide your response primarily by returning a special JSON Markdown block at the CURRENT END of your message (after any conversation text), formatted EXACTLY like this:
      
      \`\`\`json
      {
        "cards": [
          {
            "type": "event",
            "title": "Event Name",
            "location": "Event Location",
            "id": "e1"
          }
        ]
      }
      \`\`\`
      (Use "type": "ngo" if it is an NGO). Do not return markdown JSON if you aren't suggesting specific ones.
    `;

        // Convert frontend history to Gemini format if needed. 
        // The new @google/genai syntax:
        const chat = ai.chats.create({
            model: "gemini-2.5-flash",
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.7
            }
        });

        // We can simulate history by sending past messages if needed, but for MVP we just send the message.
        // If you want to use the history array, you would construct contents:
        const contents = history ? history.map(h => ({ role: h.role, parts: [{ text: h.text }] })) : [];

        // Send message
        // Note: To send history with new SDK, one can pass it during create or send messages in loop.
        // For simplicity, we just send as one prompt including context if necessary, or use contents.
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [...contents, { role: "user", parts: [{ text: message }] }],
            config: {
                systemInstruction: systemInstruction,
            }
        });

        const aiText = response.text;
        res.json({ text: aiText });

    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ error: "Failed to process chat request.", details: error.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
