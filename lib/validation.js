// lib/validation.js
// Input validation utility for CollegeVote
// Validates and sanitizes user input before processing

// ============================================
// String validation
// ============================================

function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function isValidLength(value, min, max) {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    return trimmed.length >= min && trimmed.length <= max;
}

// ============================================
// Specific field validators
// ============================================

function isValidStudentId(studentId) {
    // Student IDs: alphanumeric, 3-20 characters
    if (!isNonEmptyString(studentId)) return false;
    return /^[A-Za-z0-9]{3,20}$/.test(studentId.trim());
}

function isValidUsername(username) {
    // Admin usernames: alphanumeric and underscores, 3-50 characters
    if (!isNonEmptyString(username)) return false;
    return /^[A-Za-z0-9_]{3,50}$/.test(username.trim());
}

function isValidPassword(password) {
    // Passwords must be at least 6 characters
    return typeof password === 'string' && password.length >= 6;
}

function isValidId(id) {
    // Database IDs must be positive integers
    const num = parseInt(id, 10);
    return !isNaN(num) && num > 0 && String(num) === String(id);
}

function isValidDateTime(dateStr) {
    // Check if a date string can be parsed into a valid date
    if (!isNonEmptyString(dateStr)) return false;
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
}

function isValidElectionStatus(status) {
    return ['draft', 'scheduled', 'open', 'closed'].includes(status);
}

function isValidResultsVisibility(visibility) {
    return ['after_close', 'live'].includes(visibility);
}

function isValidStudentStatus(status) {
    return ['active', 'inactive'].includes(status);
}

// ============================================
// HTML escaping (prevent XSS when rendering user content)
// ============================================

function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ============================================
// Request body parsing
// ============================================

async function parseBody(req) {
    return new Promise((resolve, reject) => {
        // If body is already parsed (by Vercel), return it
        if (req.body !== undefined && req.body !== null) {
            resolve(req.body);
            return;
        }

        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
            // Limit body size to 1MB
            if (body.length > 1024 * 1024) {
                reject(new Error('Request body too large'));
            }
        });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                reject(new Error('Invalid JSON in request body'));
            }
        });
        req.on('error', reject);
    });
}

// ============================================
// Standard API response helpers
// ============================================

function sendSuccess(res, data, statusCode = 200) {
    res.status(statusCode).json({ success: true, ...data });
}

function sendError(res, message, statusCode = 400) {
    res.status(statusCode).json({ success: false, error: message });
}

function methodNotAllowed(res, allowedMethods) {
    res.setHeader('Allow', allowedMethods.join(', '));
    res.status(405).json({ success: false, error: 'Method not allowed' });
}

module.exports = {
    isNonEmptyString,
    isValidLength,
    isValidStudentId,
    isValidUsername,
    isValidPassword,
    isValidId,
    isValidDateTime,
    isValidElectionStatus,
    isValidResultsVisibility,
    isValidStudentStatus,
    escapeHtml,
    parseBody,
    sendSuccess,
    sendError,
    methodNotAllowed
};
