const { callGemini } = require('../config/aiConfig');

async function summarizeNeeds(allNeeds) {
  // IMPROVEMENT: Specifically defined structure ensures your dashboard never breaks
  const message = `Summarize and find patterns across these community needs. Highlight critical shortages, most urgent areas, and skill gaps.

Needs Data:
${JSON.stringify(allNeeds, null, 2)}

Return ONLY valid JSON matching this exact structure:
{
  "summary": "Overall 2-3 sentence summary...",
  "insights": [
    "Insight 1 here",
    "Insight 2 here"
  ]
}`;

  // callGemini now automatically parses the JSON for us!
  return await callGemini(message);
}

// Export function
module.exports = summarizeNeeds;
