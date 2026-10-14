// js/auth.js
// Authentication functions — login and logout

// ============================================
// Student Login
// ============================================

function initStudentLogin() {
    var form = document.getElementById('student-login-form');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        clearAlert('login-message');

        var studentId = document.getElementById('student-id').value.trim();
        var password = document.getElementById('password').value;
        var submitBtn = form.querySelector('button[type="submit"]');

        if (!studentId || !password) {
            showAlert('login-message', 'Please enter your Student ID and password.', 'danger');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in...';

        var result = await apiRequest('/api/auth/student-login', {
            method: 'POST',
            body: JSON.stringify({ student_id: studentId, password: password })
        });

        submitBtn.disabled = false;
        submitBtn.textContent = 'Login';

        if (result.ok && result.data.success) {
            window.location.href = '/student-dashboard.html';
        } else {
            showAlert('login-message', result.data.error || 'Login failed. Please try again.', 'danger');
        }
    });
}

// ============================================
// Admin Login
// ============================================

function initAdminLogin() {
    var form = document.getElementById('admin-login-form');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        clearAlert('login-message');

        var username = document.getElementById('username').value.trim();
        var password = document.getElementById('password').value;
        var submitBtn = form.querySelector('button[type="submit"]');

        if (!username || !password) {
            showAlert('login-message', 'Please enter your username and password.', 'danger');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in...';

        var result = await apiRequest('/api/auth/admin-login', {
            method: 'POST',
            body: JSON.stringify({ username: username, password: password })
        });

        submitBtn.disabled = false;
        submitBtn.textContent = 'Login';

        if (result.ok && result.data.success) {
            window.location.href = '/admin-dashboard.html';
        } else {
            showAlert('login-message', result.data.error || 'Login failed. Please try again.', 'danger');
        }
    });
}

// ============================================
// Logout
// ============================================

async function logout() {
    await apiRequest('/api/auth/logout', { method: 'POST' });
    window.location.href = '/index.html';
}

// ============================================
// Auth Check (redirect if not logged in)
// ============================================

async function checkAuth(requiredRole) {
    var result = await apiRequest('/api/auth/me');

    if (!result.ok || !result.data.success) {
        if (requiredRole === 'admin') {
            window.location.href = '/admin-login.html';
        } else {
            window.location.href = '/student-login.html';
        }
        return null;
    }

    if (result.data.userType !== requiredRole) {
        if (requiredRole === 'admin') {
            window.location.href = '/admin-login.html';
        } else {
            window.location.href = '/student-login.html';
        }
        return null;
    }

    return result.data;
}
