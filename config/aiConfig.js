const AI_CONFIG = {
  apiKey: AIzaSyBh0Hgsrf6DRRgrAuYE1GvYFgBD-aBKte8, // paste your Gemini API key here
  model: "gemini-1.5-flash",
  baseURL: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
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
      "match_score": (0-100),
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
  const url = `${AI_CONFIG.baseURL}?key=${AI_CONFIG.apiKey}`;

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

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);

  const raw = data.candidates[0].content.parts[0].text;
  return raw.replace(/```json|```/g, "").trim();
}
