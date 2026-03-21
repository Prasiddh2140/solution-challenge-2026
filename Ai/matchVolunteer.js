const { callGemini } = require('../config/aiConfig');

async function matchVolunteer(volunteers, needs) {
  const message = `Match these volunteers to community needs.

Volunteers:
${JSON.stringify(volunteers, null, 2)}

Community Needs:
${JSON.stringify(needs, null, 2)}

Return ONLY valid JSON using the exact output format from your system instructions. Do not include any markdown formatting.`;

  // callGemini now automatically parses the JSON for us!
  return await callGemini(message);
}

// Export function
module.exports = matchVolunteer;
