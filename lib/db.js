// lib/db.js
// Database connection utility for CollegeVote
// Uses mysql2 with connection pooling suitable for serverless functions

const mysql = require('mysql2/promise');

// Create a connection pool (reused across function invocations within
// the same serverless container — avoids opening a new connection per request)
let pool = null;

function getPool() {
    if (pool) return pool;

    const config = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'collegevote',
        waitForConnections: true,
        connectionLimit: 5,        // Keep low for serverless
        queueLimit: 0,
        connectTimeout: 10000,     // 10 second timeout
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000
    };

    // Enable SSL for production (most managed MySQL providers require it)
    if (process.env.DB_SSL === 'true') {
        config.ssl = { rejectUnauthorized: true };
    }

    pool = mysql.createPool(config);
    return pool;
}

// Execute a query with parameterized values (prevents SQL injection)
async function query(sql, params = []) {
    const db = getPool();
    try {
        const [rows] = await db.execute(sql, params);
        return rows;
    } catch (error) {
        console.error('Database query error:', error.message);
        throw error;
    }
}

// Get a single connection (for transactions)
async function getConnection() {
    const db = getPool();
    return await db.getConnection();
}

// Test the database connection
async function testConnection() {
    try {
        const result = await query('SELECT 1 AS connected');
        return result[0].connected === 1;
    } catch (error) {
        console.error('Database connection test failed:', error.message);
        return false;
    }
}

module.exports = { query, getConnection, testConnection };
