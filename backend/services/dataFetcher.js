const axios = require('axios');

/**
 * Helper to get date string formatted YYYY-MM-DD
 */
function getDateString(yearsOffset = 0) {
    const d = new Date();
    d.setFullYear(d.getFullYear() - yearsOffset);
    return d.toISOString().split('T')[0];
}

/**
 * Fetches 10 years of historical weather data from Open-Meteo Archive API
 * to assess precipitation and soil moisture trends.
 * Processes daily data into yearly summaries to avoid overwhelming the AI prompt.
 */
async function fetchHistoricalData(lat, lon) {
    try {
        const endDate = getDateString(0);   // Today
        const startDate = getDateString(10); // 10 years ago

        const response = await axios.get('https://archive-api.open-meteo.com/v1/archive', {
            params: {
                latitude: lat,
                longitude: lon,
                start_date: startDate,
                end_date: endDate,
                daily: ['precipitation_sum', 'et0_fao_evapotranspiration'],
                timezone: 'auto'
            }
        });
        
        const data = response.data.daily;
        const yearlyData = {};

        // Aggregate 3650 days of data into 10 yearly averages
        for (let i = 0; i < data.time.length; i++) {
            const year = data.time[i].split('-')[0];
            if (!yearlyData[year]) {
                yearlyData[year] = { 
                    totalPrecipitation: 0, 
                    totalEvapotranspiration: 0, 
                    days: 0 
                };
            }
            if (data.precipitation_sum[i] !== null) {
                yearlyData[year].totalPrecipitation += data.precipitation_sum[i];
            }
            if (data.et0_fao_evapotranspiration[i] !== null) {
                yearlyData[year].totalEvapotranspiration += data.et0_fao_evapotranspiration[i];
            }
            yearlyData[year].days += 1;
        }

        // Return a clean 10-year summary
        return Object.keys(yearlyData).map(year => ({
            year: parseInt(year),
            totalPrecipitation_mm: parseFloat((yearlyData[year].totalPrecipitation).toFixed(2)),
            totalEvapotranspiration_mm: parseFloat((yearlyData[year].totalEvapotranspiration).toFixed(2))
        })).sort((a, b) => a.year - b.year);

    } catch (error) {
        console.error("Open-Meteo Fetch Error:", error.message);
        return null; // Return null if fetching fails
    }
}

/**
 * Mocking humanitarian food supply historical variations over 10 years.
 * In a real scenario, you'd pull from HDX HAPI or World Bank WFSO API datasets.
 */
async function fetchFoodSupplyHistory(stateName) {
    console.log(`Gathering 10-year historical food supply trends for ${stateName}...`);
    // Simulated general 10-year trend based on average agricultural outputs
    const currentYear = new Date().getFullYear();
    const trend = [];
    
    let baselineSupply = 100000; // Mock metric tons
    for (let i = 10; i >= 0; i--) {
        const year = currentYear - i;
        // Introduce random variance and an overall slight decrease or shock
        const shock = Math.random() > 0.8 ? 0.8 : 1.05; // 20% chance of a severe crop failure shock
        baselineSupply = baselineSupply * shock;
        
        trend.push({
            year: year,
            foodSupplyIndex: Math.floor(baselineSupply),
            waterReservoirLevelPercent: Math.floor(Math.random() * (90 - 30 + 1) + 30) // Random capacity 30-90%
        });
    }
    return trend;
}

/**
 * Gather 10-year historical trend data for the entire state
 */
async function gatherDataForState(stateName, lat, lon) {
    console.log(`Fetching 10 years of Weather (precipitation & water loss) for ${stateName}...`);
    const historicalWeather = await fetchHistoricalData(lat, lon);
    
    console.log(`Fetching 10 years of Food Supply and Reservoir records for ${stateName}...`);
    const historicalFoodSupply = await fetchFoodSupplyHistory(stateName);
    
    return {
        targetLocation: stateName,
        coordinates: { lat, lon },
        weatherTrends10Years: historicalWeather,
        essentialSupplyTrends10Years: historicalFoodSupply
    };
}

module.exports = {
    gatherDataForState
};
