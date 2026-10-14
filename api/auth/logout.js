// api/auth/logout.js
// POST /api/auth/logout
// Destroys the current session and clears the cookie

const { getAuthenticatedUser, deleteSession, createLogoutCookie } = require('../../lib/auth');
const { sendSuccess, sendError, methodNotAllowed } = require('../../lib/validation');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return methodNotAllowed(res, ['POST']);
    }

    try {
        const session = await getAuthenticatedUser(req);

        if (session) {
            await deleteSession(session.sessionId);
        }

        res.setHeader('Set-Cookie', createLogoutCookie());
        return sendSuccess(res, { message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        // Even if there's an error, clear the cookie
        res.setHeader('Set-Cookie', createLogoutCookie());
        return sendSuccess(res, { message: 'Logged out' });
    }
};
