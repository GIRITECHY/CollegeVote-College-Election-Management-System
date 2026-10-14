// api/votes/index.js
// POST /api/votes — Cast a vote (student only)
// GET /api/votes/status — alias for vote status check

const { query, getConnection } = require('../../lib/db');
const { requireStudent } = require('../../lib/auth');
const { isValidId, parseBody, sendSuccess, sendError, methodNotAllowed } = require('../../lib/validation');

module.exports = async function handler(req, res) {
    if (req.method === 'POST') {
        return handleCastVote(req, res);
    } else if (req.method === 'GET') {
        return handleVoteStatus(req, res);
    } else {
        return methodNotAllowed(res, ['GET', 'POST']);
    }
};

async function handleCastVote(req, res) {
    // 1. Authenticate student
    const session = await requireStudent(req);
    if (!session) {
        return sendError(res, 'Unauthorized. Student login required.', 401);
    }

    let connection;
    try {
        const body = await parseBody(req);
        const { election_id, candidate_id } = body;

        // 2. Validate input
        if (!isValidId(election_id)) {
            return sendError(res, 'Valid election ID is required', 400);
        }
        if (!isValidId(candidate_id)) {
            return sendError(res, 'Valid candidate ID is required', 400);
        }

        // 3. Use a transaction for vote integrity
        connection = await getConnection();
        await connection.beginTransaction();

        // 4. Check student is active
        const [students] = await connection.execute(
            'SELECT id, status FROM students WHERE id = ?',
            [session.userId]
        );
        if (students.length === 0 || students[0].status !== 'active') {
            await connection.rollback();
            return sendError(res, 'Your account is not active', 403);
        }

        // 5. Check election is open
        const [elections] = await connection.execute(
            'SELECT id, status, start_time, end_time FROM elections WHERE id = ?',
            [election_id]
        );
        if (elections.length === 0) {
            await connection.rollback();
            return sendError(res, 'Election not found', 404);
        }

        const election = elections[0];

        if (election.status !== 'open') {
            await connection.rollback();
            return sendError(res, 'This election is not currently open for voting', 400);
        }

        // 6. Check current time is within voting period
        const now = new Date();
        const startTime = new Date(election.start_time);
        const endTime = new Date(election.end_time);

        if (now < startTime) {
            await connection.rollback();
            return sendError(res, 'Voting has not started yet', 400);
        }
        if (now > endTime) {
            await connection.rollback();
            return sendError(res, 'Voting period has ended', 400);
        }

        // 7. Check candidate belongs to this election
        const [candidates] = await connection.execute(
            'SELECT id, election_id FROM candidates WHERE id = ? AND election_id = ?',
            [candidate_id, election_id]
        );
        if (candidates.length === 0) {
            await connection.rollback();
            return sendError(res, 'This candidate does not belong to the specified election', 400);
        }

        // 8. Check student hasn't already voted (application-level check before DB constraint)
        const [existingVotes] = await connection.execute(
            'SELECT id FROM votes WHERE election_id = ? AND student_id = ?',
            [election_id, session.userId]
        );
        if (existingVotes.length > 0) {
            await connection.rollback();
            return sendError(res, 'You have already voted in this election', 409);
        }

        // 9. Record the vote
        // The UNIQUE constraint on (election_id, student_id) prevents duplicates
        // even if two requests arrive simultaneously
        await connection.execute(
            'INSERT INTO votes (election_id, student_id, candidate_id) VALUES (?, ?, ?)',
            [election_id, session.userId, candidate_id]
        );

        // 10. Commit the transaction
        await connection.commit();

        return sendSuccess(res, {
            message: 'Your vote has been recorded successfully. Thank you for voting!',
            voted: true
        }, 201);

    } catch (error) {
        // Rollback on error
        if (connection) {
            try { await connection.rollback(); } catch (e) { /* ignore */ }
        }

        // Handle duplicate vote (database constraint violation)
        if (error.code === 'ER_DUP_ENTRY') {
            return sendError(res, 'You have already voted in this election', 409);
        }

        console.error('Cast vote error:', error);
        return sendError(res, 'An error occurred while recording your vote. Please try again.', 500);
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

async function handleVoteStatus(req, res) {
    const session = await requireStudent(req);
    if (!session) {
        return sendError(res, 'Unauthorized. Student login required.', 401);
    }

    try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const electionId = url.searchParams.get('election_id');

        if (!electionId || !isValidId(electionId)) {
            return sendError(res, 'Valid election_id query parameter is required', 400);
        }

        const votes = await query(
            'SELECT id, voted_at FROM votes WHERE student_id = ? AND election_id = ?',
            [session.userId, electionId]
        );

        return sendSuccess(res, {
            hasVoted: votes.length > 0,
            votedAt: votes.length > 0 ? votes[0].voted_at : null
        });
    } catch (error) {
        console.error('Vote status error:', error);
        return sendError(res, 'Failed to check vote status', 500);
    }
}
