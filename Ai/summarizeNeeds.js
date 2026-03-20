async function summarizeNeeds(allNeeds) {
  const message = `Summarize and find patterns across these community needs. Highlight critical shortages, most urgent areas, and skill gaps.

Needs Data:
${JSON.stringify(allNeeds, null, 2)}

Return ONLY valid JSON with an "insights" array and a "summary" string.`;

  const raw = await callGemini(message);
  return JSON.parse(raw);
}
