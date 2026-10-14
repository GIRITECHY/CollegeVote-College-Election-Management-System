// api/students/index.js
// GET /api/students — List all students (admin only)
// POST /api/students — Add a new student (admin only)

const bcrypt = require('bcryptjs');
const { query } = require('../../lib/db');
const { requireAdmin } = require('../../lib/auth');
const {
    isNonEmptyString, isValidStudentId, isValidPassword,
    isValidLength, isValidStudentStatus,
    parseBody, sendSuccess, sendError, methodNotAllowed
} = require('../../lib/validation');

module.exports = async function handler(req, res) {
    // Verify admin authentication
    const admin = await requireAdmin(req);
    if (!admin) {
        return sendError(res, 'Unauthorized. Admin access required.', 401);
    }

    if (req.method === 'GET') {
        return handleGetStudents(req, res);
    } else if (req.method === 'POST') {
        return handleCreateStudent(req, res);
    } else {
        return methodNotAllowed(res, ['GET', 'POST']);
    }
};

async function handleGetStudents(req, res) {
    try {
        // Support search by student_id or name via query params
        const url = new URL(req.url, `http://${req.headers.host}`);
        const search = url.searchParams.get('search') || '';

        let students;
        if (search) {
            students = await query(
                `SELECT id, student_id, name, department, status, created_at 
                 FROM students 
                 WHERE student_id LIKE ? OR name LIKE ?
                 ORDER BY created_at DESC`,
                [`%${search}%`, `%${search}%`]
            );
        } else {
            students = await query(
                'SELECT id, student_id, name, department, status, created_at FROM students ORDER BY created_at DESC'
            );
        }

        return sendSuccess(res, { students });
    } catch (error) {
        console.error('Get students error:', error);
        return sendError(res, 'Failed to fetch students', 500);
    }
}

async function handleCreateStudent(req, res) {
    try {
        const body = await parseBody(req);
        const { student_id, name, department, password } = body;

        // Validate all fields
        if (!isValidStudentId(student_id)) {
            return sendError(res, 'Student ID must be 3-20 alphanumeric characters', 400);
        }
        if (!isNonEmptyString(name) || !isValidLength(name, 2, 100)) {
            return sendError(res, 'Name must be 2-100 characters', 400);
        }
        if (!isNonEmptyString(department) || !isValidLength(department, 2, 100)) {
            return sendError(res, 'Department must be 2-100 characters', 400);
        }
        if (!isValidPassword(password)) {
            return sendError(res, 'Password must be at least 6 characters', 400);
        }

        // Check for duplicate student ID
        const existing = await query(
            'SELECT id FROM students WHERE student_id = ?',
            [student_id.trim()]
        );
        if (existing.length > 0) {
            return sendError(res, 'A student with this ID already exists', 409);
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Insert student
        const result = await query(
            'INSERT INTO students (student_id, name, department, password_hash) VALUES (?, ?, ?, ?)',
            [student_id.trim(), name.trim(), department.trim(), passwordHash]
        );

        return sendSuccess(res, {
            message: 'Student added successfully',
            student: {
                id: result.insertId,
                student_id: student_id.trim(),
                name: name.trim(),
                department: department.trim(),
                status: 'active'
            }
        }, 201);
    } catch (error) {
        console.error('Create student error:', error);
        return sendError(res, 'Failed to add student', 500);
    }
}
