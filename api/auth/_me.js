// api/auth/me.js
// GET /api/auth/me
// Returns the currently authenticated user's info

const { getAuthenticatedUser } = require('../../lib/auth');
const { query } = require('../../lib/db');
const { sendSuccess, sendError, methodNotAllowed } = require('../../lib/validation');

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        return methodNotAllowed(res, ['GET']);
    }

    try {
        const session = await getAuthenticatedUser(req);

        if (!session) {
            return sendError(res, 'Not authenticated', 401);
        }

        if (session.userType === 'student') {
            const students = await query(
                'SELECT id, student_id, name, department, status FROM students WHERE id = ?',
                [session.userId]
            );
            if (students.length === 0) {
                return sendError(res, 'User not found', 404);
            }
            return sendSuccess(res, {
                userType: 'student',
                user: students[0]
            });
        }

        if (session.userType === 'admin') {
            const admins = await query(
                'SELECT id, username FROM admins WHERE id = ?',
                [session.userId]
            );
            if (admins.length === 0) {
                return sendError(res, 'User not found', 404);
            }
            return sendSuccess(res, {
                userType: 'admin',
                user: admins[0]
            });
        }

        return sendError(res, 'Invalid session', 401);
    } catch (error) {
        console.error('Auth check error:', error);
        return sendError(res, 'Authentication check failed', 500);
    }
};
