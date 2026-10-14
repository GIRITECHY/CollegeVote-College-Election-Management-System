// js/common.js
// Shared utility functions used across all pages

// ============================================
// API Helper
// ============================================

async function apiRequest(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'same-origin'  // Send cookies with requests
    };

    const mergedOptions = { ...defaultOptions, ...options };
    if (options.headers) {
        mergedOptions.headers = { ...defaultOptions.headers, ...options.headers };
    }

    try {
        const response = await fetch(url, mergedOptions);
        const data = await response.json();
        return { ok: response.ok, status: response.status, data };
    } catch (error) {
        console.error('API request error:', error);
        return { ok: false, status: 0, data: { success: false, error: 'Network error. Please check your connection.' } };
    }
}

// ============================================
// HTML Escaping (prevent XSS)
// ============================================

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

// ============================================
// Date Formatting
// ============================================

function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatDateTime(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ============================================
// Status Badge
// ============================================

function statusBadge(status) {
    const classes = {
        'active': 'badge-active',
        'inactive': 'badge-inactive',
        'open': 'badge-open',
        'closed': 'badge-closed',
        'draft': 'badge-draft',
        'scheduled': 'badge-scheduled'
    };
    const className = classes[status] || 'badge-draft';
    return '<span class="badge ' + className + '">' + escapeHtml(status) + '</span>';
}

// ============================================
// Alert Messages
// ============================================

function showAlert(containerId, message, type) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '<div class="alert alert-' + type + '">' + escapeHtml(message) + '</div>';
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearAlert(containerId) {
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = '';
}

// ============================================
// Mobile Nav Toggle
// ============================================

function initNavToggle() {
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.querySelector('.navbar-nav');
    if (toggle && nav) {
        toggle.addEventListener('click', function () {
            nav.classList.toggle('show');
        });
    }
}

// ============================================
// Candidate Initials (for photo placeholder)
// ============================================

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(function(w) { return w[0]; }).join('').toUpperCase().slice(0, 2);
}

// Initialize nav toggle on every page
document.addEventListener('DOMContentLoaded', initNavToggle);
