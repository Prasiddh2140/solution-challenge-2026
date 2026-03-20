async function matchVolunteer(volunteers, needs) {
  const message = `Match these volunteers to community needs.

Volunteers:
${JSON.stringify(volunteers, null, 2)}

Community Needs:
${JSON.stringify(needs, null, 2)}

Return ONLY valid JSON using the exact output format from your instructions.`;

  const raw = await callGemini(message);
  return JSON.parse(raw);
}
