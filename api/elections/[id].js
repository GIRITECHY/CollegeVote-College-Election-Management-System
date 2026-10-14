// api/elections/[id].js
// GET /api/elections/:id — Get election details
// PUT /api/elections/:id — Update election (admin only)

const { query } = require('../../lib/db');
const { getAuthenticatedUser, requireAdmin } = require('../../lib/auth');
const {
    isNonEmptyString, isValidLength, isValidDateTime,
    isValidResultsVisibility, isValidId,
    parseBody, sendSuccess, sendError, methodNotAllowed
} = require('../../lib/validation');

module.exports = async function handler(req, res) {
    // Extract ID — handle paths like /api/elections/1/open, /api/elections/1/close
    const urlParts = req.url.split('?')[0].split('/').filter(Boolean);
    // urlParts will be like ['api', 'elections', '1'] or ['api', 'elections', '1', 'open']
    const electionIndex = urlParts.indexOf('elections');
    const id = urlParts[electionIndex + 1];
    const action = urlParts[electionIndex + 2]; // 'open', 'close', or undefined

    if (!isValidId(id)) {
        return sendError(res, 'Invalid election ID', 400);
    }

    // Handle open/close actions
    if (action === 'open' && req.method === 'POST') {
        return handleOpenElection(req, res, id);
    }
    if (action === 'close' && req.method === 'POST') {
        return handleCloseElection(req, res, id);
    }

    if (req.method === 'GET') {
        return handleGetElection(req, res, id);
    } else if (req.method === 'PUT') {
        return handleUpdateElection(req, res, id);
    } else {
        return methodNotAllowed(res, ['GET', 'PUT', 'POST']);
    }
};

async function handleGetElection(req, res, id) {
    try {
        const elections = await query(
            `SELECT id, title, description, start_time, end_time, status, results_visibility, created_at 
             FROM elections WHERE id = ?`,
            [id]
        );

        if (elections.length === 0) {
            return sendError(res, 'Election not found', 404);
        }

        const election = elections[0];

        // Get candidates for this election
        const candidates = await query(
            `SELECT id, name, department, position, description, photo_url 
             FROM candidates WHERE election_id = ? ORDER BY name`,
            [id]
        );

        // Get vote count
        const voteCount = await query(
            'SELECT COUNT(*) as count FROM votes WHERE election_id = ?',
            [id]
        );

        election.candidates = candidates;
        election.voteCount = voteCount[0].count;

        return sendSuccess(res, { election });
    } catch (error) {
        console.error('Get election error:', error);
        return sendError(res, 'Failed to fetch election', 500);
    }
}

async function handleUpdateElection(req, res, id) {
    const admin = await requireAdmin(req);
    if (!admin) {
        return sendError(res, 'Unauthorized. Admin access required.', 401);
    }

    try {
        const body = await parseBody(req);
        const { title, description, start_time, end_time, results_visibility } = body;

        // Check election exists
        const existing = await query('SELECT id, status FROM elections WHERE id = ?', [id]);
        if (existing.length === 0) {
            return sendError(res, 'Election not found', 404);
        }

        // Cannot edit closed elections
        if (existing[0].status === 'closed') {
            return sendError(res, 'Cannot edit a closed election', 400);
        }

        // Cannot change dates of open elections
        if (existing[0].status === 'open') {
            // Only allow description and results_visibility changes for open elections
            await query(
                'UPDATE elections SET description = ?, results_visibility = ? WHERE id = ?',
                [description ? description.trim() : null,
                 isValidResultsVisibility(results_visibility) ? results_visibility : 'after_close',
                 id]
            );
            return sendSuccess(res, { message: 'Election updated (limited changes for open elections)' });
        }

        // Validate fields for draft/scheduled elections
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

        await query(
            `UPDATE elections SET title = ?, description = ?, start_time = ?, end_time = ?, results_visibility = ?
             WHERE id = ?`,
            [title.trim(), description ? description.trim() : null, startDate, endDate, visibility, id]
        );

        return sendSuccess(res, { message: 'Election updated successfully' });
    } catch (error) {
        console.error('Update election error:', error);
        return sendError(res, 'Failed to update election', 500);
    }
}

async function handleOpenElection(req, res, id) {
    const admin = await requireAdmin(req);
    if (!admin) {
        return sendError(res, 'Unauthorized. Admin access required.', 401);
    }

    try {
        const elections = await query('SELECT id, status FROM elections WHERE id = ?', [id]);
        if (elections.length === 0) {
            return sendError(res, 'Election not found', 404);
        }

        const election = elections[0];

        if (election.status === 'open') {
            return sendError(res, 'Election is already open', 400);
        }
        if (election.status === 'closed') {
            return sendError(res, 'Cannot reopen a closed election', 400);
        }

        // Check that there are candidates
        const candidates = await query(
            'SELECT COUNT(*) as count FROM candidates WHERE election_id = ?', [id]
        );
        if (candidates[0].count === 0) {
            return sendError(res, 'Cannot open an election with no candidates', 400);
        }

        await query("UPDATE elections SET status = 'open', start_time = IF(start_time > NOW(), NOW(), start_time) WHERE id = ?", [id]);

        return sendSuccess(res, { message: 'Election is now open for voting' });
    } catch (error) {
        console.error('Open election error:', error);
        return sendError(res, 'Failed to open election', 500);
    }
}

async function handleCloseElection(req, res, id) {
    const admin = await requireAdmin(req);
    if (!admin) {
        return sendError(res, 'Unauthorized. Admin access required.', 401);
    }

    try {
        const elections = await query('SELECT id, status FROM elections WHERE id = ?', [id]);
        if (elections.length === 0) {
            return sendError(res, 'Election not found', 404);
        }

        if (elections[0].status === 'closed') {
            return sendError(res, 'Election is already closed', 400);
        }

        await query("UPDATE elections SET status = 'closed' WHERE id = ?", [id]);

        return sendSuccess(res, { message: 'Election has been closed. Results are now available.' });
    } catch (error) {
        console.error('Close election error:', error);
        return sendError(res, 'Failed to close election', 500);
    }
}
