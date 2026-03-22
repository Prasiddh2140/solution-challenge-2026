const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
require('dotenv').config();

const { fetchAndStoreDataPeriodically } = require('./services/cronJob');
const { getAssessmentByState } = require('./services/firebaseService');

const app = express();
app.use(cors());
app.use(express.json());

// API Endpoint to get the most affected and high-risk areas for a particular state
app.get('/api/state/:stateName', async (req, res) => {
    try {
        const stateName = req.params.stateName;
        const data = await getAssessmentByState(stateName);
        
        if (!data) {
            return res.status(404).json({ error: "Data for this state is not available yet or state name is invalid." });
        }
        
        res.json(data);
    } catch (error) {
        console.error("Error fetching state data:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Run the periodic update job every day at 2:00 AM
cron.schedule('0 2 * * *', () => {
    console.log('Running daily data aggregation and AI assessment job...');
    fetchAndStoreDataPeriodically();
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Drought AI Backend Server is running on port ${PORT}`);
    console.log(`Configured to run periodic AI data fetch and store tasks.`);
});
