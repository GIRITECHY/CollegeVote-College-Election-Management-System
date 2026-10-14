// js/student.js
// Student dashboard and candidate viewing functionality

// ============================================
// Student Dashboard
// ============================================

async function initStudentDashboard() {
    var authData = await checkAuth('student');
    if (!authData) return;

    var student = authData.user;

    // Display student info
    document.getElementById('student-name').textContent = student.name;
    document.getElementById('student-id-display').textContent = student.student_id;
    document.getElementById('student-department').textContent = student.department;

    // Load current election
    await loadStudentElection(student);
}

async function loadStudentElection(student) {
    var result = await apiRequest('/api/elections');
    if (!result.ok || !result.data.success) {
        document.getElementById('election-info').innerHTML =
            '<div class="empty-state"><p>Unable to load election information.</p></div>';
        return;
    }

    var elections = result.data.elections;
    // Find the most relevant election (open > scheduled > draft)
    var election = elections.find(function(e) { return e.status === 'open'; })
        || elections.find(function(e) { return e.status === 'scheduled'; })
        || elections[0];

    if (!election) {
        document.getElementById('election-info').innerHTML =
            '<div class="empty-state"><p>No elections are currently available.</p></div>';
        return;
    }

    // Display election info
    document.getElementById('election-title').textContent = election.title;
    document.getElementById('election-status').innerHTML = statusBadge(election.status);
    document.getElementById('election-start').textContent = formatDateTime(election.start_time);
    document.getElementById('election-end').textContent = formatDateTime(election.end_time);

    // Check vote status
    var voteResult = await apiRequest('/api/students/me?vote_status=1&election_id=' + election.id);
    if (voteResult.ok && voteResult.data.success) {
        var hasVoted = voteResult.data.hasVoted;
        var voteStatusEl = document.getElementById('vote-status');

        if (hasVoted) {
            voteStatusEl.innerHTML = '<span class="badge badge-active">Voted</span>';
            document.getElementById('vote-action').innerHTML =
                '<p style="color: var(--success);">✓ You have already voted in this election.</p>';
        } else if (election.status === 'open') {
            voteStatusEl.innerHTML = '<span class="badge badge-scheduled">Not Yet Voted</span>';
            document.getElementById('vote-action').innerHTML =
                '<a href="/candidates.html?election_id=' + election.id + '" class="btn btn-primary">View Candidates & Vote</a>';
        } else {
            voteStatusEl.innerHTML = '<span class="badge badge-draft">Not Voted</span>';
            document.getElementById('vote-action').innerHTML =
                '<p style="color: var(--text-secondary);">Voting is not currently open.</p>';
        }
    }

    // Store election ID for other pages
    sessionStorage.setItem('currentElectionId', election.id);
}

// ============================================
// Candidates Page (Student View)
// ============================================

async function initCandidatesPage() {
    var authData = await checkAuth('student');
    if (!authData) return;

    var urlParams = new URLSearchParams(window.location.search);
    var electionId = urlParams.get('election_id') || sessionStorage.getItem('currentElectionId');

    if (!electionId) {
        document.getElementById('candidates-container').innerHTML =
            '<div class="empty-state"><p>No election selected. <a href="/student-dashboard.html">Go to dashboard</a></p></div>';
        return;
    }

    // Load election info
    var electionResult = await apiRequest('/api/elections/' + electionId);
    if (!electionResult.ok) {
        document.getElementById('candidates-container').innerHTML =
            '<div class="empty-state"><p>Election not found.</p></div>';
        return;
    }

    var election = electionResult.data.election;
    document.getElementById('election-title').textContent = election.title;
    document.getElementById('election-status-display').innerHTML = statusBadge(election.status);

    // Check if student already voted
    var voteResult = await apiRequest('/api/students/me?vote_status=1&election_id=' + electionId);
    var hasVoted = voteResult.ok && voteResult.data.success && voteResult.data.hasVoted;

    // Load candidates
    var candidatesResult = await apiRequest('/api/candidates?election_id=' + electionId);
    if (!candidatesResult.ok || !candidatesResult.data.success) {
        document.getElementById('candidates-container').innerHTML =
            '<div class="empty-state"><p>Unable to load candidates.</p></div>';
        return;
    }

    var candidates = candidatesResult.data.candidates;
    if (candidates.length === 0) {
        document.getElementById('candidates-container').innerHTML =
            '<div class="empty-state"><p>No candidates have been registered for this election yet.</p></div>';
        return;
    }

    var html = '<div class="candidates-grid">';
    candidates.forEach(function (c) {
        html += '<div class="candidate-card">';
        if (c.photo_url) {
            html += '<img class="candidate-photo" src="' + escapeHtml(c.photo_url) + '" alt="' + escapeHtml(c.name) + '">';
        } else {
            html += '<div class="candidate-photo">' + escapeHtml(getInitials(c.name)) + '</div>';
        }
        html += '<div class="candidate-info">';
        html += '<div class="candidate-name">' + escapeHtml(c.name) + '</div>';
        html += '<div class="candidate-meta">' + escapeHtml(c.department) + ' · ' + escapeHtml(c.position) + '</div>';
        if (c.description) {
            html += '<div class="candidate-description">' + escapeHtml(c.description) + '</div>';
        }
        html += '<div class="candidate-actions">';
        if (hasVoted) {
            html += '<button class="btn btn-secondary btn-sm" disabled>Already Voted</button>';
        } else if (election.status === 'open') {
            html += '<button class="btn btn-primary btn-sm" onclick="selectCandidate(' + c.id + ', \'' + escapeHtml(c.name).replace(/'/g, "\\'") + '\', \'' + escapeHtml(c.department).replace(/'/g, "\\'") + '\', \'' + escapeHtml(c.position).replace(/'/g, "\\'") + '\')">Vote for ' + escapeHtml(c.name.split(' ')[0]) + '</button>';
        } else {
            html += '<span class="badge badge-closed">Voting Closed</span>';
        }
        html += '</div>';
        html += '</div>';
        html += '</div>';
    });
    html += '</div>';

    document.getElementById('candidates-container').innerHTML = html;
}

function selectCandidate(candidateId, name, department, position) {
    var electionId = new URLSearchParams(window.location.search).get('election_id')
        || sessionStorage.getItem('currentElectionId');

    // Store selection and redirect to vote confirmation
    sessionStorage.setItem('voteCandidate', JSON.stringify({
        id: candidateId,
        name: name,
        department: department,
        position: position,
        electionId: electionId
    }));

    window.location.href = '/vote.html';
}
