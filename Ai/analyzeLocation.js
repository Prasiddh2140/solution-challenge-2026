const { callGemini } = require('../config/aiConfig');

async function analyzeLocation(locationText) {
  const message = `You are an AI drought and food shortage expert.
The user has inputted the following region/location:
${locationText}

Based on geographic data, climate trends, and agricultural knowledge, identify 3-5 specific districts, neighborhoods, or sub-regions within or near this location that are highly vulnerable to or likely experiencing food and water shortages.

Return ONLY a valid JSON array of objects. Each object MUST have:
- "area_name" (string, the specific sub-region)
- "shortage_type" (e.g., "Water Scarcity", "Crop Failure", "Food Shortage")
- "risk_level" (High, Medium, Critical)
- "reasoning" (Short 1-sentence explanation of why this area is at risk)`;

  // callGemini automatically processes it into a JSON object arrays
  return await callGemini(message);
}

module.exports = analyzeLocation;
