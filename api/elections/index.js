// api/elections/index.js
// GET /api/elections — List elections
// POST /api/elections — Create an election (admin only)

const { query } = require('../../lib/db');
const { getAuthenticatedUser, requireAdmin } = require('../../lib/auth');
const {
    isNonEmptyString, isValidLength, isValidDateTime,
    isValidResultsVisibility,
    parseBody, sendSuccess, sendError, methodNotAllowed
} = require('../../lib/validation');

module.exports = async function handler(req, res) {
    if (req.method === 'GET') {
        return handleGetElections(req, res);
    } else if (req.method === 'POST') {
        return handleCreateElection(req, res);
    } else {
        return methodNotAllowed(res, ['GET', 'POST']);
    }
};

async function handleGetElections(req, res) {
    try {
        // Public endpoint — can be accessed by anyone (home page shows election info)
        // But we'll include more details for authenticated users
        const session = await getAuthenticatedUser(req);

        const elections = await query(
            `SELECT id, title, description, start_time, end_time, status, results_visibility, created_at 
             FROM elections ORDER BY created_at DESC`
        );

        // For each election, count candidates and votes
        for (let election of elections) {
            const candidates = await query(
                'SELECT COUNT(*) as count FROM candidates WHERE election_id = ?',
                [election.id]
            );
            election.candidateCount = candidates[0].count;

            const votes = await query(
                'SELECT COUNT(*) as count FROM votes WHERE election_id = ?',
                [election.id]
            );
            election.voteCount = votes[0].count;
        }

        return sendSuccess(res, { elections });
    } catch (error) {
        console.error('Get elections error:', error);
        return sendError(res, 'Failed to fetch elections', 500);
    }
}

async function handleCreateElection(req, res) {
    const admin = await requireAdmin(req);
    if (!admin) {
        return sendError(res, 'Unauthorized. Admin access required.', 401);
    }

    try {
        const body = await parseBody(req);
        const { title, description, start_time, end_time, results_visibility } = body;

        // Validate fields
        if (!isNonEmptyString(title) || !isValidLength(title, 3, 200)) {
            return sendError(res, 'Title must be 3-200 characters', 400);
        }
        if (!isValidDateTime(start_time)) {
            return sendError(res, 'Valid start time is required', 400);
        }
        if (!isValidDateTime(end_time)) {
            return sendError(res, 'Valid end time is required', 400);
        }

        const startDate = new Date(start_time);
        const endDate = new Date(end_time);

        if (endDate <= startDate) {
            return sendError(res, 'End time must be after start time', 400);
        }

        const visibility = isValidResultsVisibility(results_visibility) ? results_visibility : 'after_close';

        const result = await query(
            `INSERT INTO elections (title, description, start_time, end_time, status, results_visibility) 
             VALUES (?, ?, ?, ?, 'draft', ?)`,
            [title.trim(), description ? description.trim() : null, startDate, endDate, visibility]
        );

        return sendSuccess(res, {
            message: 'Election created successfully',
            election: {
                id: result.insertId,
                title: title.trim(),
                status: 'draft'
            }
        }, 201);
    } catch (error) {
        console.error('Create election error:', error);
        return sendError(res, 'Failed to create election', 500);
    }
}
