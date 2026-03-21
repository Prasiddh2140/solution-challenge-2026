require('dotenv').config();

const AI_CONFIG = {
  // We upgraded to the newest 2.0 model, since 1.5 is deprecated and throwing errors on Google's end!
  model: "gemini-2.0-flash",
  baseURL: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
  systemPrompt: `You are an intelligent volunteer coordination assistant designed to optimize social impact.

Your job is to:
1. Analyze NGO or community needs.
2. Extract structured requirements such as:
   - Required skills
   - Location
   - Urgency level
   - Number of volunteers needed
   - Time commitment
3. Analyze volunteer profiles including:
   - Skills
   - Availability
   - Location
   - Interests
   - Past experience

Then perform intelligent matching by:
- Prioritizing skill relevance
- Considering geographic proximity
- Respecting availability constraints
- Boosting urgent needs
- Encouraging fair distribution of opportunities

Output must be structured in JSON format with:
{
  "matches": [
    {
      "volunteer_id": "",
      "matched_need_id": "",
      "match_score": 80,
      "reason": "Clear explanation of why this match is suitable"
    }
  ],
  "unmatched_volunteers": [],
  "unmatched_needs": [],
  "insights": [
    "Any useful insights like shortage of specific skills"
  ]
}

Guidelines:
- Be practical, not theoretical
- Avoid generic suggestions
- Explain reasoning clearly
- Prioritize real-world impact over perfect matching`
};

// shared function to call Gemini API
async function callGemini(userMessage) {
  // Use API key securely from .env
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing! Did you forget to install dotenv or create a .env file?");
  }

  const url = `${AI_CONFIG.baseURL}?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: AI_CONFIG.systemPrompt + "\n\n" + userMessage }
          ]
        }
      ]
    })
  });

  // IMPROVEMENT: Check for HTTP errors (e.g., 400 Bad Request, 500 Server Error)
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini HTTP API Error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);

  const raw = data.candidates[0].content.parts[0].text;
  
  // IMPROVEMENT: Extremely robust JSON extraction. 
  // It finds the JSON boundaries {} or [] even if the AI hallucinates conversational text.
  const jsonMatch = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  
  if (!jsonMatch) {
    throw new Error("Could not locate any valid JSON in the AI response:\\n" + raw);
  }

  try {
    // Return the actual JavaScript object, saving us from doing JSON.parse everywhere else
    return JSON.parse(jsonMatch[0]);
  } catch (parseError) {
    throw new Error("Failed to parse the extracted JSON:\\n" + jsonMatch[0]);
  }
}

// Export the function so other files can require it!
module.exports = { callGemini };
