// api/auth/admin-login.js
// POST /api/auth/admin-login
// Authenticates an administrator and creates a session

const bcrypt = require('bcryptjs');
const { query } = require('../../lib/db');
const { createSession, createSessionCookie, deleteUserSessions } = require('../../lib/auth');
const { isValidUsername, isValidPassword, parseBody, sendSuccess, sendError, methodNotAllowed } = require('../../lib/validation');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return methodNotAllowed(res, ['POST']);
    }

    try {
        const body = await parseBody(req);
        const { username, password } = body;

        // Validate input
        if (!isValidUsername(username)) {
            return sendError(res, 'Please enter a valid username', 400);
        }
        if (!isValidPassword(password)) {
            return sendError(res, 'Please enter your password', 400);
        }

        // Find the admin
        const admins = await query(
            'SELECT id, username, password_hash FROM admins WHERE username = ?',
            [username.trim()]
        );

        if (admins.length === 0) {
            return sendError(res, 'Invalid username or password', 401);
        }

        const admin = admins[0];

        // Verify password
        const passwordMatch = await bcrypt.compare(password, admin.password_hash);
        if (!passwordMatch) {
            return sendError(res, 'Invalid username or password', 401);
        }

        // Delete old sessions (regenerate session)
        await deleteUserSessions(admin.id, 'admin');

        // Create new session
        const { sessionId, expiresAt } = await createSession(admin.id, 'admin');

        // Set cookie
        res.setHeader('Set-Cookie', createSessionCookie(sessionId, expiresAt));

        return sendSuccess(res, {
            message: 'Admin login successful',
            user: {
                id: admin.id,
                username: admin.username
            }
        });
    } catch (error) {
        console.error('Admin login error:', error);
        return sendError(res, 'An error occurred during login. Please try again.', 500);
    }
};
