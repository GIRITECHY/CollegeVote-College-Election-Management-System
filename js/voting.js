// js/voting.js
// Vote confirmation and submission

// ============================================
// Vote Confirmation Page
// ============================================

async function initVotePage() {
    var authData = await checkAuth('student');
    if (!authData) return;

    var candidateData = sessionStorage.getItem('voteCandidate');
    if (!candidateData) {
        window.location.href = '/student-dashboard.html';
        return;
    }

    var candidate = JSON.parse(candidateData);

    // Display candidate details
    document.getElementById('candidate-name').textContent = candidate.name;
    document.getElementById('candidate-department').textContent = candidate.department;
    document.getElementById('candidate-position').textContent = candidate.position;

    // Confirm vote button
    document.getElementById('confirm-vote-btn').addEventListener('click', function () {
        submitVote(candidate.electionId, candidate.id);
    });

    // Cancel button
    document.getElementById('cancel-vote-btn').addEventListener('click', function () {
        sessionStorage.removeItem('voteCandidate');
        window.location.href = '/candidates.html?election_id=' + candidate.electionId;
    });
}

async function submitVote(electionId, candidateId) {
    var confirmBtn = document.getElementById('confirm-vote-btn');
    var cancelBtn = document.getElementById('cancel-vote-btn');

    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Submitting...';
    cancelBtn.disabled = true;
    clearAlert('vote-message');

    var result = await apiRequest('/api/votes', {
        method: 'POST',
        body: JSON.stringify({
            election_id: parseInt(electionId),
            candidate_id: parseInt(candidateId)
        })
    });

    if (result.ok && result.data.success) {
        // Clear stored candidate
        sessionStorage.removeItem('voteCandidate');

        // Show success
        document.getElementById('vote-form-section').classList.add('hidden');
        document.getElementById('vote-success-section').classList.remove('hidden');
    } else {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Confirm Vote';
        cancelBtn.disabled = false;
        showAlert('vote-message', result.data.error || 'Failed to submit vote. Please try again.', 'danger');
    }
}

// ============================================
// Vote Status Page
// ============================================

async function initVoteStatusPage() {
    var authData = await checkAuth('student');
    if (!authData) return;

    var electionId = sessionStorage.getItem('currentElectionId');

    if (!electionId) {
        document.getElementById('status-container').innerHTML =
            '<div class="empty-state"><p>No election selected. <a href="/student-dashboard.html">Go to dashboard</a></p></div>';
        return;
    }

    var result = await apiRequest('/api/students/me?vote_status=1&election_id=' + electionId);

    if (!result.ok || !result.data.success) {
        document.getElementById('status-container').innerHTML =
            '<div class="alert alert-danger">Unable to check vote status.</div>';
        return;
    }

    var html = '<div class="card"><div class="card-body">';

    if (result.data.election) {
        html += '<p><strong>Election:</strong> ' + escapeHtml(result.data.election.title) + '</p>';
        html += '<p><strong>Status:</strong> ' + statusBadge(result.data.election.status) + '</p>';
    }

    html += '<hr style="margin: 16px 0; border: none; border-top: 1px solid var(--border);">';

    if (result.data.hasVoted) {
        html += '<div class="alert alert-success">✓ You have successfully voted in this election.</div>';
        html += '<p><strong>Voted on:</strong> ' + formatDateTime(result.data.votedAt) + '</p>';
    } else {
        html += '<div class="alert alert-info">You have not voted in this election yet.</div>';
        if (result.data.election && result.data.election.isOpen) {
            html += '<p><a href="/candidates.html?election_id=' + result.data.election.id + '" class="btn btn-primary mt-16">View Candidates & Vote</a></p>';
        }
    }

    html += '</div></div>';
    document.getElementById('status-container').innerHTML = html;
}
