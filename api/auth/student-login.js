// api/auth/student-login.js
// POST /api/auth/student-login
// Authenticates a student and creates a session

const bcrypt = require('bcryptjs');
const { query } = require('../../lib/db');
const { createSession, createSessionCookie, deleteUserSessions } = require('../../lib/auth');
const { isValidStudentId, isValidPassword, parseBody, sendSuccess, sendError, methodNotAllowed } = require('../../lib/validation');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return methodNotAllowed(res, ['POST']);
    }

    try {
        const body = await parseBody(req);
        const { student_id, password } = body;

        // Validate input
        if (!isValidStudentId(student_id)) {
            return sendError(res, 'Please enter a valid student ID', 400);
        }
        if (!isValidPassword(password)) {
            return sendError(res, 'Please enter your password', 400);
        }

        // Find the student
        const students = await query(
            'SELECT id, student_id, name, department, password_hash, status FROM students WHERE student_id = ?',
            [student_id.trim()]
        );

        if (students.length === 0) {
            return sendError(res, 'Invalid student ID or password', 401);
        }

        const student = students[0];

        // Check if account is active
        if (student.status !== 'active') {
            return sendError(res, 'Your account has been deactivated. Contact the administrator.', 403);
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, student.password_hash);
        if (!passwordMatch) {
            return sendError(res, 'Invalid student ID or password', 401);
        }

        // Delete old sessions for this student (regenerate session)
        await deleteUserSessions(student.id, 'student');

        // Create new session
        const { sessionId, expiresAt } = await createSession(student.id, 'student');

        // Set cookie
        res.setHeader('Set-Cookie', createSessionCookie(sessionId, expiresAt));

        return sendSuccess(res, {
            message: 'Login successful',
            user: {
                id: student.id,
                student_id: student.student_id,
                name: student.name,
                department: student.department
            }
        });
    } catch (error) {
        console.error('Student login error:', error);
        return sendError(res, 'An error occurred during login. Please try again.', 500);
    }
};
