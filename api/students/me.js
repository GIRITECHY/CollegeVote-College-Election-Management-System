// api/students/me.js
// GET /api/students/me — Get current student's profile
// GET /api/students/me?vote_status=1&election_id=X — Get vote status

const { query } = require('../../lib/db');
const { requireStudent } = require('../../lib/auth');
const { isValidId, sendSuccess, sendError, methodNotAllowed } = require('../../lib/validation');

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        return methodNotAllowed(res, ['GET']);
    }

    const session = await requireStudent(req);
    if (!session) {
        return sendError(res, 'Unauthorized. Student access required.', 401);
    }

    try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const voteStatus = url.searchParams.get('vote_status');
        const electionId = url.searchParams.get('election_id');

        // If vote_status query param is set, return vote status
        if (voteStatus === '1' && electionId) {
            return handleVoteStatus(req, res, session.userId, electionId);
        }

        // Otherwise return student profile
        const students = await query(
            'SELECT id, student_id, name, department, status FROM students WHERE id = ?',
            [session.userId]
        );

        if (students.length === 0) {
            return sendError(res, 'Student not found', 404);
        }

        return sendSuccess(res, { student: students[0] });
    } catch (error) {
        console.error('Get student profile error:', error);
        return sendError(res, 'Failed to fetch profile', 500);
    }
};

async function handleVoteStatus(req, res, studentId, electionId) {
    if (!isValidId(electionId)) {
        return sendError(res, 'Invalid election ID', 400);
    }

    try {
        // Check if student has voted
        const votes = await query(
            'SELECT id, voted_at FROM votes WHERE student_id = ? AND election_id = ?',
            [studentId, electionId]
        );

        // Get election status
        const elections = await query(
            'SELECT id, title, status, start_time, end_time FROM elections WHERE id = ?',
            [electionId]
        );

        const election = elections.length > 0 ? elections[0] : null;

        return sendSuccess(res, {
            hasVoted: votes.length > 0,
            votedAt: votes.length > 0 ? votes[0].voted_at : null,
            election: election ? {
                id: election.id,
                title: election.title,
                status: election.status,
                isOpen: election.status === 'open'
            } : null
        });
    } catch (error) {
        console.error('Vote status error:', error);
        return sendError(res, 'Failed to check vote status', 500);
    }
}
