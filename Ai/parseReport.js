const { callGemini } = require('../config/aiConfig');

async function parseReport(reportText) {
  // IMPROVEMENT: Enforcing a strict schema for the output ensures consistency in testing
  const message = `Parse this field report and extract all community needs as structured JSON.
  
Field Report:
${reportText}

Return ONLY a valid JSON array of objects. Each object MUST have:
- "id" (generate a random unique string)
- "title" (short 3-word title)
- "category" (e.g., Food, Health, Education)
- "urgency" (High, Medium, Low)
- "location" (string)`;

  // callGemini now automatically parses the JSON for us!
  return await callGemini(message);
}

// Export the function so test.js can import it!
module.exports = parseReport;
