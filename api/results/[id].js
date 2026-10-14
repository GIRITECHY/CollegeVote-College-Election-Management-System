// api/results/[id].js
// GET /api/results/:id — Get election results

const { query } = require('../../lib/db');
const { getAuthenticatedUser } = require('../../lib/auth');
const { isValidId, sendSuccess, sendError, methodNotAllowed } = require('../../lib/validation');

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        return methodNotAllowed(res, ['GET']);
    }

    // Extract election ID from URL
    const urlParts = req.url.split('?')[0].split('/').filter(Boolean);
    const resultsIndex = urlParts.indexOf('results');
    const electionId = urlParts[resultsIndex + 1];

    if (!isValidId(electionId)) {
        return sendError(res, 'Invalid election ID', 400);
    }

    try {
        // Get election details
        const elections = await query(
            'SELECT id, title, description, start_time, end_time, status, results_visibility FROM elections WHERE id = ?',
            [electionId]
        );

        if (elections.length === 0) {
            return sendError(res, 'Election not found', 404);
        }

        const election = elections[0];

        // Check if results should be visible
        if (election.results_visibility === 'after_close' && election.status !== 'closed') {
            // Check if user is admin (admins can always see results)
            const session = await getAuthenticatedUser(req);
            if (!session || session.userType !== 'admin') {
                return sendError(res, 'Results will be available after voting closes', 403);
            }
        }

        // Get vote counts per candidate
        const results = await query(
            `SELECT 
                c.id AS candidate_id,
                c.name AS candidate_name,
                c.department AS candidate_department,
                c.position,
                c.photo_url,
                COUNT(v.id) AS vote_count
             FROM candidates c
             LEFT JOIN votes v ON c.id = v.candidate_id AND v.election_id = ?
             WHERE c.election_id = ?
             GROUP BY c.id, c.name, c.department, c.position, c.photo_url
             ORDER BY vote_count DESC, c.name ASC`,
            [electionId, electionId]
        );

        // Calculate totals and percentages
        const totalVotes = results.reduce((sum, r) => sum + r.vote_count, 0);

        const candidateResults = results.map(r => ({
            candidate_id: r.candidate_id,
            candidate_name: r.candidate_name,
            candidate_department: r.candidate_department,
            position: r.position,
            photo_url: r.photo_url,
            vote_count: r.vote_count,
            percentage: totalVotes > 0
                ? Math.round((r.vote_count / totalVotes) * 10000) / 100  // 2 decimal places
                : 0
        }));

        // Determine winner(s)
        let winner = null;
        let isTie = false;

        if (totalVotes > 0 && election.status === 'closed') {
            const maxVotes = candidateResults[0].vote_count;
            const topCandidates = candidateResults.filter(c => c.vote_count === maxVotes);

            if (topCandidates.length === 1) {
                winner = topCandidates[0];
            } else {
                isTie = true;
                winner = topCandidates; // Array of tied candidates
            }
        }

        // Get voter participation
        const totalStudents = await query(
            "SELECT COUNT(*) as count FROM students WHERE status = 'active'"
        );
        const voterCount = await query(
            'SELECT COUNT(DISTINCT student_id) as count FROM votes WHERE election_id = ?',
            [electionId]
        );

        return sendSuccess(res, {
            election: {
                id: election.id,
                title: election.title,
                description: election.description,
                status: election.status,
                start_time: election.start_time,
                end_time: election.end_time
            },
            results: candidateResults,
            summary: {
                totalVotes,
                totalActiveStudents: totalStudents[0].count,
                votersCount: voterCount[0].count,
                participationRate: totalStudents[0].count > 0
                    ? Math.round((voterCount[0].count / totalStudents[0].count) * 10000) / 100
                    : 0
            },
            winner,
            isTie
        });
    } catch (error) {
        console.error('Get results error:', error);
        return sendError(res, 'Failed to fetch election results', 500);
    }
};
