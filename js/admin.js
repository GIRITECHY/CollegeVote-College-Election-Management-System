// js/admin.js
// Administrator dashboard and management functionality

// ============================================
// Admin Dashboard
// ============================================

async function initAdminDashboard() {
    var authData = await checkAuth('admin');
    if (!authData) return;

    document.getElementById('admin-name').textContent = authData.user.username;

    // Load statistics
    await loadDashboardStats();
}

async function loadDashboardStats() {
    try {
        // Get students count
        var studentsResult = await apiRequest('/api/students');
        if (studentsResult.ok && studentsResult.data.success) {
            var students = studentsResult.data.students;
            var activeStudents = students.filter(function(s) { return s.status === 'active'; });
            document.getElementById('stat-total-students').textContent = activeStudents.length;
        }

        // Get elections and candidates
        var electionsResult = await apiRequest('/api/elections');
        if (electionsResult.ok && electionsResult.data.success) {
            var elections = electionsResult.data.elections;
            var totalCandidates = 0;
            var totalVotes = 0;
            var currentElection = elections.find(function(e) { return e.status === 'open'; }) || elections[0];

            elections.forEach(function(e) {
                totalCandidates += e.candidateCount || 0;
                totalVotes += e.voteCount || 0;
            });

            document.getElementById('stat-total-candidates').textContent = totalCandidates;
            document.getElementById('stat-total-votes').textContent = totalVotes;

            if (currentElection) {
                document.getElementById('stat-election-status').innerHTML = statusBadge(currentElection.status);
            } else {
                document.getElementById('stat-election-status').textContent = 'None';
            }
        }
    } catch (error) {
        console.error('Dashboard stats error:', error);
    }
}

// ============================================
// Manage Students Page
// ============================================

async function initManageStudents() {
    var authData = await checkAuth('admin');
    if (!authData) return;

    await loadStudentsList();

    // Search
    document.getElementById('search-btn').addEventListener('click', function () {
        var query = document.getElementById('search-input').value;
        loadStudentsList(query);
    });

    document.getElementById('search-input').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            var query = document.getElementById('search-input').value;
            loadStudentsList(query);
        }
    });

    // Add student form
    document.getElementById('add-student-form').addEventListener('submit', handleAddStudent);
}

async function loadStudentsList(search) {
    var url = '/api/students';
    if (search) url += '?search=' + encodeURIComponent(search);

    var result = await apiRequest(url);

    if (!result.ok || !result.data.success) {
        document.getElementById('students-table-body').innerHTML =
            '<tr><td colspan="5">Failed to load students.</td></tr>';
        return;
    }

    var students = result.data.students;

    if (students.length === 0) {
        document.getElementById('students-table-body').innerHTML =
            '<tr><td colspan="5" style="text-align:center;">No students found.</td></tr>';
        return;
    }

    var html = '';
    students.forEach(function (s) {
        html += '<tr>';
        html += '<td>' + escapeHtml(s.student_id) + '</td>';
        html += '<td>' + escapeHtml(s.name) + '</td>';
        html += '<td>' + escapeHtml(s.department) + '</td>';
        html += '<td>' + statusBadge(s.status) + '</td>';
        html += '<td>';
        html += '<div class="btn-group">';
        html += '<button class="btn btn-secondary btn-sm" onclick="editStudent(' + s.id + ', \'' + escapeHtml(s.name).replace(/'/g, "\\'") + '\', \'' + escapeHtml(s.department).replace(/'/g, "\\'") + '\')">Edit</button>';
        if (s.status === 'active') {
            html += '<button class="btn btn-warning btn-sm" onclick="toggleStudentStatus(' + s.id + ', \'inactive\')">Deactivate</button>';
        } else {
            html += '<button class="btn btn-success btn-sm" onclick="toggleStudentStatus(' + s.id + ', \'active\')">Activate</button>';
        }
        html += '</div>';
        html += '</td>';
        html += '</tr>';
    });

    document.getElementById('students-table-body').innerHTML = html;
}

async function handleAddStudent(e) {
    e.preventDefault();
    clearAlert('student-message');

    var data = {
        student_id: document.getElementById('new-student-id').value.trim(),
        name: document.getElementById('new-student-name').value.trim(),
        department: document.getElementById('new-student-dept').value.trim(),
        password: document.getElementById('new-student-password').value
    };

    var result = await apiRequest('/api/students', {
        method: 'POST',
        body: JSON.stringify(data)
    });

    if (result.ok && result.data.success) {
        showAlert('student-message', 'Student added successfully!', 'success');
        document.getElementById('add-student-form').reset();
        closeModal('add-student-modal');
        await loadStudentsList();
    } else {
        showAlert('student-message', result.data.error || 'Failed to add student.', 'danger');
    }
}

function editStudent(id, name, department) {
    document.getElementById('edit-student-id').value = id;
    document.getElementById('edit-student-name').value = name;
    document.getElementById('edit-student-dept').value = department;
    document.getElementById('edit-student-password').value = '';
    openModal('edit-student-modal');
}

async function saveEditStudent() {
    clearAlert('student-message');
    var id = document.getElementById('edit-student-id').value;
    var data = {
        name: document.getElementById('edit-student-name').value.trim(),
        department: document.getElementById('edit-student-dept').value.trim(),
        password: document.getElementById('edit-student-password').value || undefined
    };

    var result = await apiRequest('/api/students/' + id, {
        method: 'PUT',
        body: JSON.stringify(data)
    });

    if (result.ok && result.data.success) {
        showAlert('student-message', 'Student updated successfully!', 'success');
        closeModal('edit-student-modal');
        await loadStudentsList();
    } else {
        showAlert('student-message', result.data.error || 'Failed to update student.', 'danger');
    }
}

async function toggleStudentStatus(id, newStatus) {
    if (!confirm('Are you sure you want to ' + (newStatus === 'active' ? 'activate' : 'deactivate') + ' this student?')) {
        return;
    }

    var result = await apiRequest('/api/students/' + id, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
    });

    if (result.ok && result.data.success) {
        await loadStudentsList();
    } else {
        alert(result.data.error || 'Failed to update student status.');
    }
}

// ============================================
// Manage Candidates Page
// ============================================

async function initManageCandidates() {
    var authData = await checkAuth('admin');
    if (!authData) return;

    await loadElectionsForSelect();
    await loadCandidatesList();

    document.getElementById('add-candidate-form').addEventListener('submit', handleAddCandidate);

    // Filter by election
    document.getElementById('filter-election').addEventListener('change', function () {
        loadCandidatesList(this.value);
    });
}

async function loadElectionsForSelect() {
    var result = await apiRequest('/api/elections');
    if (!result.ok) return;

    var elections = result.data.elections;
    var filterSelect = document.getElementById('filter-election');
    var formSelect = document.getElementById('candidate-election');

    elections.forEach(function (e) {
        var option1 = document.createElement('option');
        option1.value = e.id;
        option1.textContent = e.title + ' (' + e.status + ')';
        filterSelect.appendChild(option1);

        var option2 = document.createElement('option');
        option2.value = e.id;
        option2.textContent = e.title;
        formSelect.appendChild(option2);
    });
}

async function loadCandidatesList(electionId) {
    var url = '/api/candidates';
    if (electionId) url += '?election_id=' + electionId;

    var result = await apiRequest(url);
    if (!result.ok || !result.data.success) {
        document.getElementById('candidates-table-body').innerHTML =
            '<tr><td colspan="6">Failed to load candidates.</td></tr>';
        return;
    }

    var candidates = result.data.candidates;
    if (candidates.length === 0) {
        document.getElementById('candidates-table-body').innerHTML =
            '<tr><td colspan="6" style="text-align:center;">No candidates found.</td></tr>';
        return;
    }

    var html = '';
    candidates.forEach(function (c) {
        html += '<tr>';
        html += '<td>' + escapeHtml(c.name) + '</td>';
        html += '<td>' + escapeHtml(c.department) + '</td>';
        html += '<td>' + escapeHtml(c.position) + '</td>';
        html += '<td>' + (c.description ? escapeHtml(c.description.substring(0, 60)) + '...' : '-') + '</td>';
        html += '<td>';
        html += '<div class="btn-group">';
        html += '<button class="btn btn-secondary btn-sm" onclick="editCandidate(' + c.id + ')">Edit</button>';
        html += '<button class="btn btn-danger btn-sm" onclick="deleteCandidate(' + c.id + ')">Delete</button>';
        html += '</div>';
        html += '</td>';
        html += '</tr>';
    });

    document.getElementById('candidates-table-body').innerHTML = html;
}

async function handleAddCandidate(e) {
    e.preventDefault();
    clearAlert('candidate-message');

    var data = {
        election_id: parseInt(document.getElementById('candidate-election').value),
        name: document.getElementById('candidate-name').value.trim(),
        department: document.getElementById('candidate-department').value.trim(),
        position: document.getElementById('candidate-position').value.trim(),
        description: document.getElementById('candidate-description').value.trim(),
        photo_url: document.getElementById('candidate-photo').value.trim() || null
    };

    if (!data.election_id) {
        showAlert('candidate-message', 'Please select an election.', 'danger');
        return;
    }

    var result = await apiRequest('/api/candidates', {
        method: 'POST',
        body: JSON.stringify(data)
    });

    if (result.ok && result.data.success) {
        showAlert('candidate-message', 'Candidate added successfully!', 'success');
        document.getElementById('add-candidate-form').reset();
        closeModal('add-candidate-modal');
        await loadCandidatesList();
    } else {
        showAlert('candidate-message', result.data.error || 'Failed to add candidate.', 'danger');
    }
}

async function editCandidate(id) {
    // Fetch candidate data
    var result = await apiRequest('/api/candidates');
    if (!result.ok) return;

    var candidate = result.data.candidates.find(function(c) { return c.id === id; });
    if (!candidate) return;

    document.getElementById('edit-candidate-id').value = candidate.id;
    document.getElementById('edit-candidate-name').value = candidate.name;
    document.getElementById('edit-candidate-department').value = candidate.department;
    document.getElementById('edit-candidate-position').value = candidate.position;
    document.getElementById('edit-candidate-description').value = candidate.description || '';
    document.getElementById('edit-candidate-photo').value = candidate.photo_url || '';
    openModal('edit-candidate-modal');
}

async function saveEditCandidate() {
    clearAlert('candidate-message');
    var id = document.getElementById('edit-candidate-id').value;

    var data = {
        name: document.getElementById('edit-candidate-name').value.trim(),
        department: document.getElementById('edit-candidate-department').value.trim(),
        position: document.getElementById('edit-candidate-position').value.trim(),
        description: document.getElementById('edit-candidate-description').value.trim(),
        photo_url: document.getElementById('edit-candidate-photo').value.trim() || null
    };

    var result = await apiRequest('/api/candidates/' + id, {
        method: 'PUT',
        body: JSON.stringify(data)
    });

    if (result.ok && result.data.success) {
        showAlert('candidate-message', 'Candidate updated successfully!', 'success');
        closeModal('edit-candidate-modal');
        await loadCandidatesList();
    } else {
        showAlert('candidate-message', result.data.error || 'Failed to update candidate.', 'danger');
    }
}

async function deleteCandidate(id) {
    if (!confirm('Are you sure you want to delete this candidate?')) return;

    var result = await apiRequest('/api/candidates/' + id, { method: 'DELETE' });

    if (result.ok && result.data.success) {
        await loadCandidatesList();
    } else {
        alert(result.data.error || 'Failed to delete candidate.');
    }
}

// ============================================
// Manage Elections Page
// ============================================

async function initManageElections() {
    var authData = await checkAuth('admin');
    if (!authData) return;

    await loadElectionsList();

    document.getElementById('add-election-form').addEventListener('submit', handleAddElection);
}

async function loadElectionsList() {
    var result = await apiRequest('/api/elections');
    if (!result.ok || !result.data.success) {
        document.getElementById('elections-table-body').innerHTML =
            '<tr><td colspan="6">Failed to load elections.</td></tr>';
        return;
    }

    var elections = result.data.elections;
    if (elections.length === 0) {
        document.getElementById('elections-table-body').innerHTML =
            '<tr><td colspan="6" style="text-align:center;">No elections found. Create one to get started.</td></tr>';
        return;
    }

    var html = '';
    elections.forEach(function (e) {
        html += '<tr>';
        html += '<td>' + escapeHtml(e.title) + '</td>';
        html += '<td>' + statusBadge(e.status) + '</td>';
        html += '<td>' + formatDateTime(e.start_time) + '</td>';
        html += '<td>' + formatDateTime(e.end_time) + '</td>';
        html += '<td>' + (e.candidateCount || 0) + ' candidates, ' + (e.voteCount || 0) + ' votes</td>';
        html += '<td>';
        html += '<div class="btn-group">';

        if (e.status === 'draft' || e.status === 'scheduled') {
            html += '<button class="btn btn-success btn-sm" onclick="openElection(' + e.id + ')">Open</button>';
        }
        if (e.status === 'open') {
            html += '<button class="btn btn-danger btn-sm" onclick="closeElection(' + e.id + ')">Close</button>';
        }
        if (e.status !== 'closed') {
            html += '<button class="btn btn-secondary btn-sm" onclick="editElection(' + e.id + ')">Edit</button>';
        }
        html += '<a href="/results.html?election_id=' + e.id + '" class="btn btn-secondary btn-sm">Results</a>';

        html += '</div>';
        html += '</td>';
        html += '</tr>';
    });

    document.getElementById('elections-table-body').innerHTML = html;
}

async function handleAddElection(e) {
    e.preventDefault();
    clearAlert('election-message');

    var data = {
        title: document.getElementById('election-title').value.trim(),
        description: document.getElementById('election-description').value.trim(),
        start_time: document.getElementById('election-start').value,
        end_time: document.getElementById('election-end').value,
        results_visibility: document.getElementById('election-visibility').value
    };

    var result = await apiRequest('/api/elections', {
        method: 'POST',
        body: JSON.stringify(data)
    });

    if (result.ok && result.data.success) {
        showAlert('election-message', 'Election created successfully!', 'success');
        document.getElementById('add-election-form').reset();
        closeModal('add-election-modal');
        await loadElectionsList();
    } else {
        showAlert('election-message', result.data.error || 'Failed to create election.', 'danger');
    }
}

async function editElection(id) {
    var result = await apiRequest('/api/elections/' + id);
    if (!result.ok) return;

    var e = result.data.election;
    document.getElementById('edit-election-id').value = e.id;
    document.getElementById('edit-election-title').value = e.title;
    document.getElementById('edit-election-description').value = e.description || '';

    // Format dates for datetime-local input
    var startDate = new Date(e.start_time);
    var endDate = new Date(e.end_time);
    document.getElementById('edit-election-start').value = formatDateTimeLocal(startDate);
    document.getElementById('edit-election-end').value = formatDateTimeLocal(endDate);
    document.getElementById('edit-election-visibility').value = e.results_visibility;

    openModal('edit-election-modal');
}

function formatDateTimeLocal(date) {
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var day = String(date.getDate()).padStart(2, '0');
    var hours = String(date.getHours()).padStart(2, '0');
    var minutes = String(date.getMinutes()).padStart(2, '0');
    return year + '-' + month + '-' + day + 'T' + hours + ':' + minutes;
}

async function saveEditElection() {
    clearAlert('election-message');
    var id = document.getElementById('edit-election-id').value;

    var data = {
        title: document.getElementById('edit-election-title').value.trim(),
        description: document.getElementById('edit-election-description').value.trim(),
        start_time: document.getElementById('edit-election-start').value,
        end_time: document.getElementById('edit-election-end').value,
        results_visibility: document.getElementById('edit-election-visibility').value
    };

    var result = await apiRequest('/api/elections/' + id, {
        method: 'PUT',
        body: JSON.stringify(data)
    });

    if (result.ok && result.data.success) {
        showAlert('election-message', 'Election updated!', 'success');
        closeModal('edit-election-modal');
        await loadElectionsList();
    } else {
        showAlert('election-message', result.data.error || 'Failed to update election.', 'danger');
    }
}

async function openElection(id) {
    if (!confirm('Are you sure you want to open this election for voting?')) return;

    var result = await apiRequest('/api/elections/' + id + '/open', { method: 'POST' });

    if (result.ok && result.data.success) {
        showAlert('election-message', 'Election is now open for voting!', 'success');
        await loadElectionsList();
    } else {
        alert(result.data.error || 'Failed to open election.');
    }
}

async function closeElection(id) {
    if (!confirm('Are you sure you want to close this election? This cannot be undone.')) return;

    var result = await apiRequest('/api/elections/' + id + '/close', { method: 'POST' });

    if (result.ok && result.data.success) {
        showAlert('election-message', 'Election has been closed.', 'success');
        await loadElectionsList();
    } else {
        alert(result.data.error || 'Failed to close election.');
    }
}

// ============================================
// Modal Helpers
// ============================================

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}
