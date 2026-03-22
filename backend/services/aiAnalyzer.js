const { GoogleGenerativeAI } = require("@google/generative-ai");

// Helper to get Gemini model safely
function getGeminiModel(modelName = 'gemini-2.0-flash') {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is missing from environment.");
    }
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    return genAI.getGenerativeModel({ model: modelName });
}

/**
 * Uses the Google Gemini model to scrutinize 10-year historical weather and food 
 * supply data for a State, determine trends (increase/decrease in essential supply), 
 * identify areas facing immediate shortage, and predict areas facing long-term collapse.
 */
async function analyzeDroughtRisk(stateName, stateData) {
    const model = getGeminiModel('gemini-2.0-flash');
    
    // Format a prompt defining the multi-year history of rainfall and simulated supply
    const prompt = `
        You are an advanced predictive environmental AI. You have been provided 
        with exactly 10 years of historical average data indicating water availability 
        (estimated rainfall levels) and food supply levels (availability of basic grains 
        and crops) for the region: ${stateName}.

        Historical Decade Data:
        ${JSON.stringify(stateData, null, 2)}

        YOUR GOALS:
        1. **Analyze the 10-year trend**: Is it a steady decline, a sudden drop, or erratic?
        2. **Determine immediate risk**: Based on the MOST RECENT year data, is there an active shortage?
        3. **Predict long-term stability**: If the current 10-year trend continues, what happens in 5 years?
        4. **Provide a Risk Assessment Level**: One of [LOW, MODERATE, HIGH, CRITICAL].

        RESPONSE FORMAT:
        Return a well-formatted JSON with these keys: 
        - trendAnalysis: (string summary)
        - immediateRisk: (boolean)
        - immediateRiskReason: (string)
        - fiveYearPrediction: (string description)
        - riskLevel: (string)
        - recommendation: (string for government actions)

        Ensure the response is STRICT JSON only.
    `;

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        return JSON.parse(responseText.replace(/```json|```/g, "").trim());
    } catch (e) {
        console.error("AI Analysis Failed:", e);
        return {
            trendAnalysis: "Unable to process historical data trend at this time.",
            immediateRisk: false,
            immediateRiskReason: "AI Service Connectivity Issue",
            fiveYearPrediction: "Prediction unavailable.",
            riskLevel: "UNKNOWN",
            recommendation: "Please monitor local rainfall manually and consult environmental records."
        };
    }
}

/**
 * Generic Chatbot Response for user queries
 */
async function genericChatbotResponse(history, userMessage, pageContext) {
    const model = getGeminiModel('gemini-2.0-flash');

    const context = `
    You are the "SmartNGO Sentinel" - a specialized AI assistant for the SmartNGO platform.
    CURRENT PAGE CONTEXT: ${JSON.stringify(pageContext)}
    USER ROLE: ${pageContext.role || 'Community Member'}

    ### YOUR GUIDELINES:
    1. **Contextual Awareness**: The user is currently on "${pageContext.pageTitle || 'the platform'}".
    2. **Role-Based Assistance**: 
       - Standard Users: Help them report issues and find volunteer tasks.
       - Testers: Offer "Rapid Entry Mode". Provide JSON data for quick testing.
    3. **Knowledge Base**: You know about the Drought Monitor, Volunteer Dashboard, and Report feature.

    ### YOUR GOALS:
    1. **Guide Users**: Explain where features are located.
    2. **Collect Data**: If a user reports an issue, ask for Title, Description, Category, and Location.
    3. **Avoid Duplicates**: If a new report sounds like an existing one, inform the user.
    4. **Tester Mode**: If the role is "tester", offer structured JSON block suggestions for rapid testing.
    5. **Premium Tone**: Be concise, expert, and helpful.

    Conversation History:
    ${history.map(msg => `[${msg.role}]: ${msg.text}`).join('\n')}
    
    [user]: ${userMessage}
    [ai]:`;

    try {
        const result = await model.generateContent(context);
        return result.response.text().replace(/^\[ai\]:\s*/i, '').trim();
    } catch(e) {
        console.error("Chatbot response error:", e);
        return "I'm having a connection issue. Try asking about our drought or volunteer features!";
    }
}

module.exports = {
    analyzeDroughtRisk,
    genericChatbotResponse
};
