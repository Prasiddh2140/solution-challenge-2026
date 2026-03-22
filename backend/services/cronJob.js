const { gatherDataForState } = require('./dataFetcher');
const { analyzeDroughtRisk } = require('./aiAnalyzer');
const { storeAssessment } = require('./firebaseService');
const indianStates = require('../constants/indianStates');

/**
 * AI Bot orchestrator: Looping through all 28 states of India.
 * Pulling 10-year historic weather and essential supply data down from
 * Open-Meteo, grouping data, sending to Gemini AI to spot trends like 
 * the increase and decrease of food/water access over time, finding 
 * 'currently affected' districts and 'eventually affected' districts, 
 * and periodically storing predictions into Firebase.
 */
async function fetchAndStoreDataPeriodically() {
    console.log("Triggering 10-Year historical data pull and AI assessment for All India...");

    // To prevent hitting free-tier API rate limits all at once, 
    // a delay function can be useful between AI or Weather API calls.
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    for (const stateObj of indianStates) {
        try {
            console.log(`\nGathering 10-Year trend data for ${stateObj.name} (Lat: ${stateObj.lat}, Lon: ${stateObj.lon})...`);
            
            const rawData = await gatherDataForState(stateObj.name, stateObj.lat, stateObj.lon);
            
            // Wait 2 seconds so Open-Meteo and Gemini API limits aren't exceeded rapidly
            await sleep(2000); 

            if (!rawData) {
                console.warn(`Failed to retrieve valid 10-year historical data for ${stateObj.name}. Skipping...`);
                continue;
            }

            console.log(`Sending aggregated data to Gemini AI for 10-Year increase/decrease trend analysis...`);
            const aiAssessment = await analyzeDroughtRisk(stateObj.name, rawData);

            console.log(`Success: Saving assessment to Firebase Firestore under doc ID '${stateObj.name}'...`);
            await storeAssessment(stateObj.name, aiAssessment);
            
        } catch (error) {
            console.error(`Error processing state ${stateObj.name}:`, error);
        }
    }
    
    console.log("Periodic AI pipeline run across all states in India completed successfully.");
    
    // AI De-duplication Scan
    console.log("[AI Backend] Initiating data quality scan (De-duplication)...");
    const { getCollectionData, db } = require('./firebaseService');
    const { deleteDoc, doc } = require("firebase/firestore/lite");
    
    try {
        const issues = await getCollectionData('issues');
        const seen = new Set();
        let removed = 0;
        
        for (const issue of issues) {
            // Key based on title and rough location (3 decimal places approx 110m)
            const key = `${issue.title?.toLowerCase().trim()}_${issue.location?.lat?.toFixed(3)}_${issue.location?.lng?.toFixed(3)}`;
            if (seen.has(key)) {
                console.log(`[AI Backend] Removing duplicate: ${issue.title} (ID: ${issue.id})`);
                await deleteDoc(doc(db, 'issues', issue.id));
                removed++;
            } else {
                seen.add(key);
            }
        }
        console.log(`[AI Backend] Cleanup complete. Removed ${removed} duplicates.`);
    } catch (cleanupErr) {
        console.error("[AI Backend] Data quality scan failed:", cleanupErr);
    }
}

// Ensure the command runs manually if we want to bootstrap immediately 
// or let the index.js cron schedule trigger it.
module.exports = {
    fetchAndStoreDataPeriodically
};
