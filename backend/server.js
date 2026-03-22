require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const path = require('path');

if (!process.env.GEMINI_API_KEY) {
    console.error("❌ CRITICAL ERROR: GEMINI_API_KEY is not set in backend/.env");
    console.error("Checking path:", path.join(__dirname, '.env'));
}
const fs = require('fs');
const { fetchAndStoreDataPeriodically } = require('./services/cronJob');
const { gatherDataForState } = require('./services/dataFetcher');
const { analyzeDroughtRisk, genericChatbotResponse } = require('./services/aiAnalyzer');
const { storeAssessment, getAssessmentByState } = require('./services/firebaseService');
const { sendDroughtWarningEmail } = require('./services/notifier');
const indianStates = require('./constants/indianStates');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Serve the Single Unified Frontend Directory
app.use(express.static(path.join(__dirname, '../smart ngo')));

// Helper function to extract a State from the user's chat message
function findStateInString(text) {
    const txt = text.toLowerCase();
    for (const stateObj of indianStates) {
        if (txt.includes(stateObj.name.toLowerCase())) {
            return stateObj;
        }
    }
    return null;
}

// ----------------------------------------------------
// Unified Chat Bot Endpoint
// ----------------------------------------------------
app.post('/api/chat', async (req, res) => {
  try {
    const { history, message } = req.body;
    if (!history) return res.status(400).json({ error: "Invalid history format provided." });
    
    const lastUserMsg = message ? { text: message, role: 'user' } : history.filter(msg => msg.role === 'user').pop();
    if (!lastUserMsg) return res.json({ text: "How can I help you today?" });

    console.log("[SmartNGO ChatBot] Receiving user chat message...");
    
    // Check if they are asking about a specific state
    const stateObj = findStateInString(lastUserMsg.text);

    if (!stateObj) {
        // Hand off to the generic SmartNGO Chatbot AI to sustain conversation
        const pageContext = req.body.pageContext || "";
        const generalReply = await genericChatbotResponse(history, pageContext);
        return res.json({ text: generalReply });
    }

    const stateName = stateObj.name;
    console.log(`[SmartNGO ChatBot] Activating powerful Drought Analysis Engine for ${stateName}...`);
    
    // Attempt extracting it from Firebase Cloud DB logic first
    let data = await getAssessmentByState(stateName);
    
    if (!data) {
        // DB cache miss -> Live generate using Open-Meteo structural data
        console.log(`[Drought Engine] Cache miss. Gathering fresh 10-year historical data for ${stateName}...`);
        const rawData = await gatherDataForState(stateName, stateObj.lat, stateObj.lon);
        
        if (rawData) {
            data = await analyzeDroughtRisk(stateName, rawData);
            try { await storeAssessment(stateName, data); } catch (e) {
                console.warn("[Drought Engine] Could not formally sync result to Firebase.");
            }
        }
    }

    if (!data || !data.currentlyAffectedAreas) {
        return res.json({ text: `Sorry, I could not analyze the intricate structural data for ${stateName} at this moment.` });
    }

    const replyText = `### Drought Analysis Complete: **${data.stateName}**
    
**Historical Trend (10 Years):**
${data.historicalTrendAnalysis}

**Severely Affected Districts:**
${data.currentlyAffectedAreas.length > 0 ? data.currentlyAffectedAreas.join(', ') : 'None currently critical.'}

**High Risk Future Collapses:**
${data.eventualHighRiskAreas.length > 0 ? data.eventualHighRiskAreas.join(', ') : 'Stable detected.'}

**Overall Risk Indicator:** ${data.overallRiskLevel}

**Recommended Action:**
> ${data.recommendedIntervention}`;

    res.json({ text: replyText });
  } catch (error) {
    console.error("AI Chat Server Error:", error);
    res.status(500).json({ error: error.message || "An internal chatbot processing failure occurred." });
  }
});

// ----------------------------------------------------
// Automated Email Alert Engine
// ----------------------------------------------------
app.post('/api/run-drought-alert', async (req, res) => {
  try {
    const { email, location } = req.body;
    
    console.log(`Running background alert for ${location} (User: ${email}) ONLY IF REQUESTED.`);
    
    if (!email) {
        return res.json({ success: true, message: "User opted out of email notifications." });
    }

    const stateObj = findStateInString(location);
    if (!stateObj) {
        return res.json({ success: true, message: "Location not recognized as a major State for email alert." });
    }

    const stateName = stateObj.name;
    let data = await getAssessmentByState(stateName);

    if (!data) {
        const rawData = await gatherDataForState(stateName, stateObj.lat, stateObj.lon);
        if (rawData) {
            data = await analyzeDroughtRisk(stateName, rawData);
            await storeAssessment(stateName, data);
        }
    }

    if (data) {
        const riskReport = `
            <b>State Analyzed:</b> ${stateName}<br><br>
            <b>10 Year Trend:</b> ${data.historicalTrendAnalysis}<br><br>
            <b>Currently Affected Areas:</b> ${data.currentlyAffectedAreas.join(', ') || 'None'}<br><br>
            <b>Eventual High Risk Areas:</b> ${data.eventualHighRiskAreas.join(', ') || 'None'}<br><br>
            <b>Overall Risk Level:</b> ${data.overallRiskLevel}
        `;
        await sendDroughtWarningEmail(email, location, riskReport);
    }

    res.json({ success: true, message: "Checked risks and emailed the user beautifully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Alert task failed due to an internal error." });
  }
});

// Mock Data from the user's pasted app
const mockEvents = [
  { id: '1', title: 'River Cleanup Drive', location: 'Ganga Riverbank', date: '2026-04-10', expectedVolunteers: 50 },
  { id: '2', title: 'Drought Relief Ration Distribution', location: 'Maharashtra Rural', date: '2026-04-15', expectedVolunteers: 200 },
];
const mockNGOs = [
  { id: 'n1', title: 'Water For All', rating: '4.8', focus: 'Water Conservation', location: 'Maharashtra' },
  { id: 'n2', title: 'Green Earth', rating: '4.5', focus: 'Afforestation', location: 'Madhya Pradesh' }
];

app.get('/api/events', (req, res) => res.json(mockEvents));
app.get('/api/ngos', (req, res) => res.json(mockNGOs));

// Report Storage Endpoint
app.post('/api/report', (req, res) => {
  try {
    const reportData = req.body;
    const reportsPath = path.join(__dirname, 'reports.json');
    
    let reports = [];
    if (fs.existsSync(reportsPath)) {
      const data = fs.readFileSync(reportsPath, 'utf8');
      reports = JSON.parse(data || '[]');
    }
    
    reports.push({
      ...reportData,
      serverTimestamp: new Date().toISOString()
    });
    
    fs.writeFileSync(reportsPath, JSON.stringify(reports, null, 2));
    console.log("[SmartNGO Reports] New report stored successfully.");
    res.json({ success: true, message: "Report stored on server." });
  } catch (error) {
    console.error("Error storing report:", error);
    res.status(500).json({ error: "Failed to store report on server." });
  }
});

// Get Stored Reports Endpoint
app.get('/api/reports', (req, res) => {
  try {
    const reportsPath = path.join(__dirname, 'reports.json');
    if (fs.existsSync(reportsPath)) {
      const data = fs.readFileSync(reportsPath, 'utf8');
      res.json(JSON.parse(data || '[]'));
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error("Error reading reports:", error);
    res.status(500).json({ error: "Failed to fetch reports from server." });
  }
});

// Run the cron job to systematically update firebase everyday at 2 AM
cron.schedule('0 2 * * *', () => {
    console.log('Running daily data aggregation and AI assessment job...');
    fetchAndStoreDataPeriodically();
});

// Start the Backend Server!
app.listen(PORT, () => {
    console.log(`🚀 Unified Chatbot & Drought Backend Started Successfully!`);
    console.log(`🌐 Open http://localhost:${PORT}/ inside your browser!`);
});
