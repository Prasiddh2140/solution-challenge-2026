require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import your custom AI logic!
const chat = require('./Ai/chat');
const analyzeLocation = require('./Ai/analyzeLocation');
const { sendDroughtWarningEmail } = require('./Ai/notifier');

const app = express();
const PORT = 3000;

// Enable accepting JSON bodies and Cross-Origin requests
app.use(cors());
app.use(express.json());

// Serve static frontend files (like piyush.html, images, CSS, etc.) directly from this folder
app.use(express.static('./')); 

// Create an API Endpoint that the Frontend can securely hit
app.post('/api/chat', async (req, res) => {
  try {
    const { history } = req.body;
    if (!history || !Array.isArray(history)) return res.status(400).json({ error: "Invalid history format provided." });
    
    console.log("Receiving user chat message...");
    const replyText = await chat(history);
    
    // Return the AI's response text back to the frontend chat UI
    res.json({ reply: replyText });
  } catch (error) {
    console.error("AI Chat Server Error:", error);
    res.status(500).json({ error: error.message || "AI Chat failed." });
  }
});

// Create our Notification Engine Endpoint
app.post('/api/run-drought-alert', async (req, res) => {
  try {
    const { email, location } = req.body;
    
    console.log(`Running background alert for ${location} (User: ${email})`);
    
    // Leverage our JSON-based Location Analyzer
    const risks = await analyzeLocation(location);
    
    // Format the JSON data into a clean HTML breakdown
    const riskReport = risks.map(r => `<strong>${r.area_name}</strong> - Risk: ${r.risk_level}<br/>Reason: ${r.reasoning}`).join('<br/><br/>');

    // Send the gorgeously formatted email alert
    await sendDroughtWarningEmail(email, location, riskReport);

    res.json({ success: true, message: "Checked risks and emailed the user beautifully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Alert task failed due to an internal error." });
  }
});

// Start listening for website traffic!
app.listen(PORT, () => {
  console.log(`🚀 Backend Server Started Successfully!`);
  console.log(`🌐 Open http://localhost:${PORT}/piyush.html inside your browser to see the complete Solution Challenge app!`);
});
