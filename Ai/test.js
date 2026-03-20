async function runTests() {
  console.log("🚀 Starting AI Feature Tests...\n");

  // TEST 1: parseReport
  console.log("📄 TEST 1: parseReport.js");
  try {
    const sampleReport = `
      Village: Koraput, Odisha
      Date: March 2026
      Issues:
      - 3 families without food for 2 days (critical)
      - 5 elderly residents need medical attention urgently
      - School closed due to flood damage, 200 students affected
    `;
    const parsed = await parseReport(sampleReport);
    console.log("✅ parseReport PASSED:", parsed);
  } catch (err) {
    console.error("❌ parseReport FAILED:", err.message);
  }

  // TEST 2: matchVolunteer
  console.log("\n🤝 TEST 2: matchVolunteer.js");
  try {
    const volunteers = [
      { id: "v1", name: "Priya", skills: ["Healthcare", "Counseling"], location: "Koraput", availability: "Weekends" },
      { id: "v2", name: "Raju", skills: ["Food Distribution", "Logistics"], location: "Jeypore", availability: "Weekdays" }
    ];
    const needs = [
      { id: "n1", title: "Medical aid for elderly", category: "Health", urgency: "High", location: "Koraput" },
      { id: "n2", title: "Food supply for families", category: "Food", urgency: "High", location: "Koraput" }
    ];
    const matched = await matchVolunteer(volunteers, needs);
    console.log("✅ matchVolunteer PASSED:", matched);
  } catch (err) {
    console.error("❌ matchVolunteer FAILED:", err.message);
  }

  // TEST 3: summarizeNeeds
  console.log("\n📊 TEST 3: summarizeNeeds.js");
  try {
    const allNeeds = [
      { id: "n1", title: "Medical aid for elderly", category: "Health", urgency: "High", location: "Koraput" },
      { id: "n2", title: "Food supply for families", category: "Food", urgency: "High", location: "Koraput" },
      { id: "n3", title: "School flood repair", category: "Education", urgency: "Medium", location: "Koraput" }
    ];
    const summary = await summarizeNeeds(allNeeds);
    console.log("✅ summarizeNeeds PASSED:", summary);
  } catch (err) {
    console.error("❌ summarizeNeeds FAILED:", err.message);
  }

  console.log("\n🏁 All tests done! Check above for ✅ or ❌");
}

runTests();
