// lib/auth.js
// Authentication utility for CollegeVote
// Handles session creation, verification, and cookie management

const { randomUUID } = require('node:crypto');
const { query, getConnection } = require('./db');

const SESSION_DURATION_HOURS = 24;

// ============================================
// Session Management
// ============================================

// Create a new session in the database
async function createSession(userId, userType) {
    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);

    await query(
        'INSERT INTO sessions (id, user_id, user_type, expires_at) VALUES (?, ?, ?, ?)',
        [sessionId, userId, userType, expiresAt]
    );

    return { sessionId, expiresAt };
}

// Verify a session and return the user info
async function verifySession(sessionId) {
    if (!sessionId) return null;

    const rows = await query(
        'SELECT id, user_id, user_type, expires_at FROM sessions WHERE id = ? AND expires_at > NOW()',
        [sessionId]
    );

    if (rows.length === 0) return null;

    return {
        sessionId: rows[0].id,
        userId: rows[0].user_id,
        userType: rows[0].user_type,
        expiresAt: rows[0].expires_at
    };
}

// Delete a session (logout)
async function deleteSession(sessionId) {
    await query('DELETE FROM sessions WHERE id = ?', [sessionId]);
}

// Delete all sessions for a user (force logout everywhere)
async function deleteUserSessions(userId, userType) {
    await query(
        'DELETE FROM sessions WHERE user_id = ? AND user_type = ?',
        [userId, userType]
    );
}

// Clean up expired sessions (call periodically)
async function cleanExpiredSessions() {
    const result = await query('DELETE FROM sessions WHERE expires_at < NOW()');
    return result.affectedRows || 0;
}

// ============================================
// Cookie Helpers
// ============================================

// Parse cookies from the request header
function parseCookies(cookieHeader) {
    const cookies = {};
    if (!cookieHeader) return cookies;

    cookieHeader.split(';').forEach(cookie => {
        const [name, ...rest] = cookie.trim().split('=');
        if (name) {
            cookies[name.trim()] = decodeURIComponent(rest.join('=').trim());
        }
    });

    return cookies;
}

// Create a Set-Cookie header value
function createSessionCookie(sessionId, expiresAt) {
    const isProduction = process.env.NODE_ENV === 'production';
    let cookie = `session_id=${sessionId}; Path=/; HttpOnly; SameSite=Lax`;

    if (expiresAt) {
        cookie += `; Expires=${new Date(expiresAt).toUTCString()}`;
    }

    if (isProduction) {
        cookie += '; Secure';
    }

    return cookie;
}

// Create a cookie that deletes the session (for logout)
function createLogoutCookie() {
    return 'session_id=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

// ============================================
// Middleware-like helpers for API routes
// ============================================

// Get the current authenticated user from a request
async function getAuthenticatedUser(req) {
    const cookies = parseCookies(req.headers.cookie);
    const sessionId = cookies.session_id;

    if (!sessionId) return null;

    const session = await verifySession(sessionId);
    if (!session) return null;

    return session;
}

// Check if the user is an authenticated student
async function requireStudent(req) {
    const session = await getAuthenticatedUser(req);
    if (!session || session.userType !== 'student') {
        return null;
    }
    return session;
}

// Check if the user is an authenticated admin
async function requireAdmin(req) {
    const session = await getAuthenticatedUser(req);
    if (!session || session.userType !== 'admin') {
        return null;
    }
    return session;
}

module.exports = {
    createSession,
    verifySession,
    deleteSession,
    deleteUserSessions,
    cleanExpiredSessions,
    parseCookies,
    createSessionCookie,
    createLogoutCookie,
    getAuthenticatedUser,
    requireStudent,
    requireAdmin
};
