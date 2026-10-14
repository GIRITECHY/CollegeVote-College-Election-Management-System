// api/students/[id].js
// PUT /api/students/:id — Update student info (admin only)
// PATCH /api/students/:id — Update student status (admin only)

const bcrypt = require('bcryptjs');
const { query } = require('../../lib/db');
const { requireAdmin } = require('../../lib/auth');
const {
    isNonEmptyString, isValidLength, isValidPassword,
    isValidStudentStatus, isValidId,
    parseBody, sendSuccess, sendError, methodNotAllowed
} = require('../../lib/validation');

module.exports = async function handler(req, res) {
    const admin = await requireAdmin(req);
    if (!admin) {
        return sendError(res, 'Unauthorized. Admin access required.', 401);
    }

    // Extract ID from URL path
    const urlParts = req.url.split('?')[0].split('/');
    const id = urlParts[urlParts.length - 1];

    if (!isValidId(id)) {
        return sendError(res, 'Invalid student ID', 400);
    }

    if (req.method === 'PUT') {
        return handleUpdateStudent(req, res, id);
    } else if (req.method === 'PATCH') {
        return handleUpdateStatus(req, res, id);
    } else {
        return methodNotAllowed(res, ['PUT', 'PATCH']);
    }
};

async function handleUpdateStudent(req, res, id) {
    try {
        const body = await parseBody(req);
        const { name, department, password } = body;

        // Check student exists
        const existing = await query('SELECT id FROM students WHERE id = ?', [id]);
        if (existing.length === 0) {
            return sendError(res, 'Student not found', 404);
        }

        // Validate fields
        if (!isNonEmptyString(name) || !isValidLength(name, 2, 100)) {
            return sendError(res, 'Name must be 2-100 characters', 400);
        }
        if (!isNonEmptyString(department) || !isValidLength(department, 2, 100)) {
            return sendError(res, 'Department must be 2-100 characters', 400);
        }

        // Build update query
        if (password && isValidPassword(password)) {
            const passwordHash = await bcrypt.hash(password, 10);
            await query(
                'UPDATE students SET name = ?, department = ?, password_hash = ? WHERE id = ?',
                [name.trim(), department.trim(), passwordHash, id]
            );
        } else {
            await query(
                'UPDATE students SET name = ?, department = ? WHERE id = ?',
                [name.trim(), department.trim(), id]
            );
        }

        return sendSuccess(res, { message: 'Student updated successfully' });
    } catch (error) {
        console.error('Update student error:', error);
        return sendError(res, 'Failed to update student', 500);
    }
}

async function handleUpdateStatus(req, res, id) {
    try {
        const body = await parseBody(req);
        const { status } = body;

        if (!isValidStudentStatus(status)) {
            return sendError(res, 'Status must be "active" or "inactive"', 400);
        }

        const existing = await query('SELECT id FROM students WHERE id = ?', [id]);
        if (existing.length === 0) {
            return sendError(res, 'Student not found', 404);
        }

        await query('UPDATE students SET status = ? WHERE id = ?', [status, id]);

        return sendSuccess(res, { message: `Student ${status === 'active' ? 'activated' : 'deactivated'} successfully` });
    } catch (error) {
        console.error('Update student status error:', error);
        return sendError(res, 'Failed to update student status', 500);
    }
}
