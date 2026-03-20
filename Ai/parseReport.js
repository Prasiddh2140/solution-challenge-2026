async function parseReport(reportText) {
  const message = `Parse this field report and extract all community needs as structured JSON.
  
Field Report:
${reportText}

Return ONLY valid JSON array of needs, no explanation.`;

  const raw = await callGemini(message);
  return JSON.parse(raw);
}
