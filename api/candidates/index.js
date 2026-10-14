// api/candidates/index.js
// GET /api/candidates?election_id=X — List candidates for an election
// POST /api/candidates — Add a candidate (admin only)

const { query } = require('../../lib/db');
const { getAuthenticatedUser, requireAdmin } = require('../../lib/auth');
const {
    isNonEmptyString, isValidLength, isValidId,
    parseBody, sendSuccess, sendError, methodNotAllowed
} = require('../../lib/validation');

module.exports = async function handler(req, res) {
    if (req.method === 'GET') {
        return handleGetCandidates(req, res);
    } else if (req.method === 'POST') {
        return handleCreateCandidate(req, res);
    } else {
        return methodNotAllowed(res, ['GET', 'POST']);
    }
};

async function handleGetCandidates(req, res) {
    try {
        // Must be authenticated (student or admin)
        const session = await getAuthenticatedUser(req);
        if (!session) {
            return sendError(res, 'Unauthorized', 401);
        }

        const url = new URL(req.url, `http://${req.headers.host}`);
        const electionId = url.searchParams.get('election_id');

        let candidates;
        if (electionId && isValidId(electionId)) {
            candidates = await query(
                `SELECT id, election_id, name, department, position, description, photo_url, created_at 
                 FROM candidates WHERE election_id = ? ORDER BY name`,
                [electionId]
            );
        } else {
            candidates = await query(
                'SELECT id, election_id, name, department, position, description, photo_url, created_at FROM candidates ORDER BY name'
            );
        }

        return sendSuccess(res, { candidates });
    } catch (error) {
        console.error('Get candidates error:', error);
        return sendError(res, 'Failed to fetch candidates', 500);
    }
}

async function handleCreateCandidate(req, res) {
    const admin = await requireAdmin(req);
    if (!admin) {
        return sendError(res, 'Unauthorized. Admin access required.', 401);
    }

    try {
        const body = await parseBody(req);
        const { election_id, name, department, position, description, photo_url } = body;

        // Validate fields
        if (!isValidId(election_id)) {
            return sendError(res, 'Valid election ID is required', 400);
        }
        if (!isNonEmptyString(name) || !isValidLength(name, 2, 100)) {
            return sendError(res, 'Name must be 2-100 characters', 400);
        }
        if (!isNonEmptyString(department) || !isValidLength(department, 2, 100)) {
            return sendError(res, 'Department must be 2-100 characters', 400);
        }
        if (!isNonEmptyString(position) || !isValidLength(position, 2, 100)) {
            return sendError(res, 'Position must be 2-100 characters', 400);
        }

        // Check election exists
        const elections = await query('SELECT id, status FROM elections WHERE id = ?', [election_id]);
        if (elections.length === 0) {
            return sendError(res, 'Election not found', 404);
        }

        // Insert candidate
        const result = await query(
            `INSERT INTO candidates (election_id, name, department, position, description, photo_url) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [election_id, name.trim(), department.trim(), position.trim(),
             description ? description.trim() : null,
             photo_url ? photo_url.trim() : null]
        );

        return sendSuccess(res, {
            message: 'Candidate added successfully',
            candidate: {
                id: result.insertId,
                election_id: parseInt(election_id),
                name: name.trim(),
                department: department.trim(),
                position: position.trim()
            }
        }, 201);
    } catch (error) {
        console.error('Create candidate error:', error);
        return sendError(res, 'Failed to add candidate', 500);
    }
}
