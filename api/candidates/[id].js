// api/candidates/[id].js
// PUT /api/candidates/:id — Update candidate (admin only)
// DELETE /api/candidates/:id — Delete candidate (admin only, only if no votes)

const { query } = require('../../lib/db');
const { requireAdmin } = require('../../lib/auth');
const {
    isNonEmptyString, isValidLength, isValidId,
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
        return sendError(res, 'Invalid candidate ID', 400);
    }

    if (req.method === 'PUT') {
        return handleUpdateCandidate(req, res, id);
    } else if (req.method === 'DELETE') {
        return handleDeleteCandidate(req, res, id);
    } else {
        return methodNotAllowed(res, ['PUT', 'DELETE']);
    }
};

async function handleUpdateCandidate(req, res, id) {
    try {
        const body = await parseBody(req);
        const { name, department, position, description, photo_url } = body;

        // Check candidate exists
        const existing = await query(
            'SELECT c.id, c.election_id FROM candidates c WHERE c.id = ?', [id]
        );
        if (existing.length === 0) {
            return sendError(res, 'Candidate not found', 404);
        }

        // Check if votes exist for this candidate (restrict edits)
        const votes = await query(
            'SELECT COUNT(*) as count FROM votes WHERE candidate_id = ?', [id]
        );
        if (votes[0].count > 0) {
            // Allow only description and photo updates if votes exist
            if (name || department || position) {
                return sendError(res, 'Cannot change name, department, or position after votes have been cast. You can only update the description and photo.', 400);
            }
            await query(
                'UPDATE candidates SET description = ?, photo_url = ? WHERE id = ?',
                [description ? description.trim() : null, photo_url ? photo_url.trim() : null, id]
            );
        } else {
            // No votes — allow full edit
            if (!isNonEmptyString(name) || !isValidLength(name, 2, 100)) {
                return sendError(res, 'Name must be 2-100 characters', 400);
            }
            if (!isNonEmptyString(department) || !isValidLength(department, 2, 100)) {
                return sendError(res, 'Department must be 2-100 characters', 400);
            }
            if (!isNonEmptyString(position) || !isValidLength(position, 2, 100)) {
                return sendError(res, 'Position must be 2-100 characters', 400);
            }

            await query(
                `UPDATE candidates SET name = ?, department = ?, position = ?, description = ?, photo_url = ? 
                 WHERE id = ?`,
                [name.trim(), department.trim(), position.trim(),
                 description ? description.trim() : null,
                 photo_url ? photo_url.trim() : null, id]
            );
        }

        return sendSuccess(res, { message: 'Candidate updated successfully' });
    } catch (error) {
        console.error('Update candidate error:', error);
        return sendError(res, 'Failed to update candidate', 500);
    }
}

async function handleDeleteCandidate(req, res, id) {
    try {
        // Check if votes exist
        const votes = await query(
            'SELECT COUNT(*) as count FROM votes WHERE candidate_id = ?', [id]
        );
        if (votes[0].count > 0) {
            return sendError(res, 'Cannot delete a candidate who has received votes', 400);
        }

        const result = await query('DELETE FROM candidates WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return sendError(res, 'Candidate not found', 404);
        }

        return sendSuccess(res, { message: 'Candidate deleted successfully' });
    } catch (error) {
        console.error('Delete candidate error:', error);
        return sendError(res, 'Failed to delete candidate', 500);
    }
}
