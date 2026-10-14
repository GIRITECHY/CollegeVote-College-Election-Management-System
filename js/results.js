// js/results.js
// Election Results visualization module

async function initResultsPage() {
    var urlParams = new URLSearchParams(window.location.search);
    var electionId = urlParams.get('election_id') || sessionStorage.getItem('currentElectionId');

    var container = document.getElementById('results-container');
    if (!container) return;

    if (!electionId) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No election selected to view results.</p>
                <a href="/index.html" class="btn btn-primary">Go to Home</a>
            </div>
        `;
        return;
    }

    container.innerHTML = '<div class="loading"><p>Loading election results...</p></div>';

    var result = await apiRequest('/api/results/' + electionId);

    if (!result.ok || !result.data.success) {
        var errorMsg = result.data.error || 'Failed to load election results.';
        var isPending = result.status === 403;

        container.innerHTML = `
            <div class="card" style="max-width: 650px; margin: 40px auto; text-align: center;">
                <div class="card-body" style="padding: 40px 24px;">
                    <div style="font-size: 3rem; margin-bottom: 12px;">🔒</div>
                    <h2 style="margin-bottom: 12px; color: var(--text-primary); font-size: 1.3rem;">Results Not Public Yet</h2>
                    <p style="color: var(--text-secondary); margin-bottom: 24px;">${escapeHtml(errorMsg)}</p>
                    <div class="btn-group" style="justify-content: center;">
                        <a href="/student-dashboard.html" class="btn btn-secondary">Student Dashboard</a>
                        <a href="/admin-dashboard.html" class="btn btn-primary">Admin Login</a>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    var data = result.data;
    var election = data.election;
    var candidates = data.results || [];
    var summary = data.summary || {};
    var winner = data.winner;
    var isTie = data.isTie;

    // Set page headers
    var titleEl = document.getElementById('election-title');
    if (titleEl) titleEl.textContent = election.title;

    var statusEl = document.getElementById('election-status');
    if (statusEl) statusEl.innerHTML = statusBadge(election.status);

    var descEl = document.getElementById('election-desc');
    if (descEl && election.description) descEl.textContent = election.description;

    var timingEl = document.getElementById('election-timing');
    if (timingEl) {
        timingEl.textContent = `Voting period: ${formatDateTime(election.start_time)} to ${formatDateTime(election.end_time)}`;
    }

    var html = '';

    // Winner or Status Announcement Banner
    if (election.status === 'closed') {
        if (isTie && Array.isArray(winner)) {
            html += `
                <div class="alert alert-warning" style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
                    <span style="font-size: 1.8rem;">🤝</span>
                    <div>
                        <strong>Election Ended in a Tie!</strong>
                        <p style="margin: 0;">The top vote count is shared equally between: 
                            <strong>${winner.map(w => escapeHtml(w.candidate_name)).join(' & ')}</strong> (${winner[0].vote_count} votes each).
                        </p>
                    </div>
                </div>
            `;
        } else if (winner && winner.candidate_name) {
            html += `
                <div class="card" style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-color: #a7f3d0; margin-bottom: 24px;">
                    <div class="card-body" style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap;">
                        <div style="font-size: 3rem;">🏆</div>
                        <div style="flex: 1;">
                            <span class="badge badge-active" style="background: var(--success); color: white;">Winner Declared</span>
                            <h2 style="font-size: 1.4rem; color: #065f46; margin: 4px 0;">${escapeHtml(winner.candidate_name)}</h2>
                            <p style="color: #047857; margin: 0; font-size: 0.9rem;">
                                ${escapeHtml(winner.candidate_department)} · ${escapeHtml(winner.position)} · 
                                <strong>${winner.vote_count} votes (${winner.percentage}%)</strong>
                            </p>
                        </div>
                    </div>
                </div>
            `;
        }
    } else {
        html += `
            <div class="alert alert-info" style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
                <span style="font-size: 1.6rem;">📊</span>
                <div>
                    <strong>Live Election Results</strong>
                    <p style="margin: 0;">Voting is currently active. Results update dynamically as votes are cast.</p>
                </div>
            </div>
        `;
    }

    // Stats Grid
    html += `
        <div class="stats-grid">
            <div class="stat-card primary">
                <div class="stat-label">Total Votes Cast</div>
                <div class="stat-value">${summary.totalVotes || 0}</div>
            </div>
            <div class="stat-card success">
                <div class="stat-label">Registered Voters</div>
                <div class="stat-value">${summary.totalActiveStudents || 0}</div>
            </div>
            <div class="stat-card warning">
                <div class="stat-label">Voter Turnout</div>
                <div class="stat-value">${summary.participationRate || 0}%</div>
            </div>
        </div>
    `;

    // Candidate Vote Breakdown Card
    html += `
        <div class="card">
            <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                <span>Candidate Vote Breakdown</span>
                <span style="font-size: 0.8rem; color: var(--text-secondary);">${candidates.length} Registered Candidates</span>
            </div>
            <div class="card-body">
    `;

    if (candidates.length === 0) {
        html += '<div class="empty-state"><p>No candidates were found for this election.</p></div>';
    } else {
        candidates.forEach(function (c, index) {
            var isTop = index === 0 && c.vote_count > 0;
            var barClass = (election.status === 'closed' && isTop && !isTie) ? 'result-bar winner' : 'result-bar';

            html += `
                <div class="result-item" style="padding-bottom: 12px; border-bottom: 1px solid var(--border);">
                    <div class="result-header">
                        <div class="result-name">
                            <span>${index + 1}. ${escapeHtml(c.candidate_name)}</span>
                            <span style="font-size: 0.8rem; color: var(--text-secondary); font-weight: normal; margin-left: 6px;">
                                (${escapeHtml(c.candidate_department)} · ${escapeHtml(c.position)})
                            </span>
                            ${(election.status === 'closed' && isTop && !isTie) ? '<span class="result-winner-tag">Winner</span>' : ''}
                            ${(election.status === 'closed' && isTie && winner && winner.some(w => w.candidate_id === c.candidate_id)) ? '<span class="result-tie-tag">Tied</span>' : ''}
                        </div>
                        <div class="result-votes">
                            <strong>${c.vote_count}</strong> votes (${c.percentage}%)
                        </div>
                    </div>
                    <div class="result-bar-bg">
                        <div class="${barClass}" style="width: ${c.percentage > 0 ? Math.max(c.percentage, 4) : 0}%;">
                            ${c.percentage > 7 ? c.percentage + '%' : ''}
                        </div>
                    </div>
                </div>
            `;
        });
    }

    html += `
            </div>
        </div>
        <div style="margin-top: 24px; text-align: center;">
            <a href="/index.html" class="btn btn-secondary">← Back to Home</a>
        </div>
    `;

    container.innerHTML = html;
}
