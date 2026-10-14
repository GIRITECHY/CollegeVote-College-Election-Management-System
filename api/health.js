// api/health.js
// Health check endpoint — verifies the API and database are working
// GET /api/health

const { testConnection } = require('../lib/db');

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const dbConnected = await testConnection();

        if (dbConnected) {
            return res.status(200).json({
                success: true,
                message: 'CollegeVote API is running',
                database: 'connected',
                timestamp: new Date().toISOString()
            });
        } else {
            return res.status(500).json({
                success: false,
                message: 'CollegeVote API is running',
                database: 'disconnected',
                error: 'Cannot connect to database'
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'CollegeVote API is running',
            database: 'error',
            error: 'Database connection failed'
        });
    }
};
