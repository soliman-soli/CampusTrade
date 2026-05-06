/**
 * CampusTrade — Shared Utility Functions
 *
 * This module provides reusable helpers used across all frontend pages:
 *   - authGuard()          — Redirect unauthenticated users to login
 *   - apiFetch()           — Fetch wrapper with error handling
 *   - showToast()          — Animated toast notifications
 *   - formatPrice()        — Currency formatting
 *   - getQueryParam()      — URL search param reader
 *   - setLoadingState()    — Button spinner toggle
 *   - renderSkeletonCards() — Skeleton loading placeholders
 */

const API_BASE = '/src';

async function authGuard() {
    try {
        const response = await fetch(`${API_BASE}/api/api_user_profile.php`, {
            credentials: 'include'
        });

        if (response.status === 401 || response.status === 404) {
            window.location.href = 'index.html';
            return false;
        }
        
        const data = await response.json();
        if (data.success && data.user && data.user.profileImage) {

            const accountIcon = document.querySelector('a[href="account.html"]');
            if (accountIcon) {
                accountIcon.innerHTML = `<img src="${data.user.profileImage}" alt="Account" class="w-8 h-8 rounded-full object-cover">`;

                accountIcon.classList.remove('p-2', 'p-1');
                accountIcon.classList.add('flex', 'items-center', 'justify-center', 'w-10', 'h-10', 'p-0');
            }
        }
        
        return true;
    } catch (error) {

        window.location.href = 'index.html';
        return false;
    }
}

async function apiFetch(url, options = {}) {

    const config = {
        credentials: 'include',
        ...options,
    };

    if (config.body && !(config.body instanceof FormData)) {
        config.headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            ...config.headers,
        };
    }

    try {
        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok || data.success === false) {
            const errorMsg = data.error || `Request failed with status ${response.status}`;
            showToast(errorMsg, 'error');
            return null;
        }

        return data;
    } catch (error) {
        console.error('API Fetch Error:', error);
        showToast('Network error. Please check your connection and try again.', 'error');
        return null;
    }
}

function showToast(message, type = 'info') {

    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed bottom-6 right-6 z-50 flex flex-col gap-3';
        container.style.pointerEvents = 'none';
        document.body.appendChild(container);
    }

    const icons = {
        success: `<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>`,
        error: `<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>`,
        info: `<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>`,
    };

    const colors = {
        success: 'bg-emerald-500 text-white',
        error: 'bg-red-500 text-white',
        info: 'bg-indigo-500 text-white',
    };

    const toast = document.createElement('div');
    toast.className = `flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl ${colors[type] || colors.info} toast-enter`;
    toast.style.pointerEvents = 'auto';
    toast.style.minWidth = '300px';
    toast.style.maxWidth = '420px';
    toast.innerHTML = `
        ${icons[type] || icons.info}
        <span class="text-sm font-medium leading-snug">${escapeHtml(message)}</span>
        <button class="ml-auto pl-2 opacity-70 hover:opacity-100 transition-opacity" onclick="this.closest('.toast-enter, .toast-exit')?.remove()">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
        </button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove('toast-enter');
        toast.classList.add('toast-exit');

        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

function formatPrice(amount) {
    const num = parseFloat(amount);
    if (isNaN(num)) return 'EGP 0.00';
    return 'EGP ' + num.toFixed(2);
}

function getQueryParam(key) {
    const params = new URLSearchParams(window.location.search);
    return params.get(key);
}

function setLoadingState(button, isLoading) {
    if (!button) return;

    if (isLoading) {

        button.dataset.originalText = button.innerHTML;
        button.disabled = true;
        button.classList.add('opacity-75', 'cursor-not-allowed');
        button.innerHTML = `
            <svg class="animate-spin h-5 w-5 inline-block mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
        `;
    } else {
        button.disabled = false;
        button.classList.remove('opacity-75', 'cursor-not-allowed');
        if (button.dataset.originalText) {
            button.innerHTML = button.dataset.originalText;
        }
    }
}

function renderSkeletonCards(container, count = 6) {
    if (!container) return;

    let html = '';
    for (let i = 0; i < count; i++) {
        html += `
            <div class="bg-white rounded-xl shadow-md overflow-hidden animate-pulse dark:bg-gray-800">
                <div class="h-48 bg-gray-200 dark:bg-gray-700"></div>
                <div class="p-5 space-y-3">
                    <div class="h-4 bg-gray-200 rounded w-1/3 dark:bg-gray-700"></div>
                    <div class="h-5 bg-gray-200 rounded w-3/4 dark:bg-gray-700"></div>
                    <div class="h-4 bg-gray-200 rounded w-1/2 dark:bg-gray-700"></div>
                    <div class="flex justify-between items-center pt-2">
                        <div class="h-6 bg-gray-200 rounded w-1/4 dark:bg-gray-700"></div>
                        <div class="h-8 bg-gray-200 rounded w-1/3 dark:bg-gray-700"></div>
                    </div>
                </div>
            </div>
        `;
    }
    container.innerHTML = html;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatRelativeTime(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return formatDate(dateString);
}

function buildFormData(obj) {
    const formData = new FormData();
    for (const [key, value] of Object.entries(obj)) {
        if (value !== null && value !== undefined) {
            formData.append(key, value);
        }
    }
    return formData;
}

async function handleLogout() {
    const formData = new FormData();
    formData.append('action', 'logout');

    await fetch(`${API_BASE}/auth/auth.php`, {
        method: 'POST',
        credentials: 'include',
        body: formData
    });

    window.location.href = 'index.html';
}

function renderNavbar(activePage = '') {
    const navLinks = [
        { id: 'nav-browse', href: 'dashboard.html', label: 'Browse', page: 'dashboard' },
        { id: 'nav-create', href: 'create_listing.html', label: 'Create Listing', page: 'create' },
        { id: 'nav-listings', href: 'my_listings.html', label: 'My Listings', page: 'my-listings' },
        { id: 'nav-offers', href: 'my_offers.html', label: 'My Offers', page: 'my-offers' },
    ];

    const linksHtml = navLinks.map(link => {
        const isActive = link.page === activePage;
        const activeClass = isActive
            ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 font-semibold'
            : 'text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors';
        return `<a id="${link.id}" href="${link.href}" class="${activeClass} pb-1 text-sm">${link.label}</a>`;
    }).join('');

    const accountIconClass = activePage === 'account' 
        ? 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-900/30' 
        : 'text-gray-500 hover:bg-gray-100 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-indigo-400';

    return `
        <nav class="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40 dark:border-gray-700">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex items-center justify-between h-16">
                    <!-- Logo -->
                    <div class="flex flex-1 justify-start">
                        <a href="dashboard.html" class="flex items-center gap-2 group" id="nav-logo">
                            <div class="w-9 h-9 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
                                </svg>
                            </div>
                            <span class="font-bold text-xl bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">CampusTrade</span>
                        </a>
                    </div>

                    <!-- Desktop Nav Links -->
                    <div class="hidden md:flex items-center justify-center gap-6">
                        ${linksHtml}
                    </div>

                    <!-- User Area -->
                    <div class="flex flex-1 justify-end items-center gap-2">
                        <a href="account.html" class="p-2 rounded-full transition-colors ${accountIconClass}" title="Account">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                            </svg>
                        </a>
                        <!-- Mobile menu toggle -->
                        <button id="btn-mobile-menu" class="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" onclick="document.getElementById('mobile-nav').classList.toggle('hidden')">
                            <svg class="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Mobile Nav -->
                <div id="mobile-nav" class="hidden md:hidden pb-4 border-t border-gray-100 dark:border-gray-800 pt-3 flex flex-col gap-3">
                    ${navLinks.map(link => {
                        const isActive = link.page === activePage;
                        const activeClass = isActive ? 'text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-900/30' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800';
                        return `<a href="${link.href}" class="${activeClass} px-3 py-2 rounded-lg text-sm transition-colors">${link.label}</a>`;
                    }).join('')}
                </div>
            </div>
        </nav>
    `;
}

function getStatusBadge(status) {
    const styles = {
        'Active':   'bg-emerald-100 text-emerald-700',
        'Sold':     'bg-red-100 text-red-700',
        'Archived': 'bg-gray-100 text-gray-600',
        'Pending':  'bg-yellow-100 text-yellow-700',
        'Accepted': 'bg-emerald-100 text-emerald-700',
        'Rejected': 'bg-red-100 text-red-700',
    };
    const cls = styles[status] || 'bg-gray-100 text-gray-600';
    return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}">${escapeHtml(status)}</span>`;
}

function getConditionBadge(condition) {
    const styles = {
        'New':      'bg-blue-100 text-blue-700',
        'Like New': 'bg-indigo-100 text-indigo-700',
        'Good':     'bg-teal-100 text-teal-700',
        'Fair':     'bg-amber-100 text-amber-700',
    };
    const cls = styles[condition] || 'bg-gray-100 text-gray-600';
    return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}">${escapeHtml(condition)}</span>`;
}

function renderEmptyState(message = 'Nothing here yet.', submessage = '') {
    return `
        <div class="flex flex-col items-center justify-center py-16 text-center fade-in">
            <div class="w-24 h-24 mb-6 rounded-full bg-indigo-50 flex items-center justify-center dark:bg-indigo-900/30">
                <svg class="w-12 h-12 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
                </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-700 mb-1 dark:text-gray-300">${escapeHtml(message)}</h3>
            ${submessage ? `<p class="text-sm text-gray-400 dark:text-gray-500">${escapeHtml(submessage)}</p>` : ''}
        </div>
    `;
}

function getPlaceholderImage() {
    return `data:image/svg+xml,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
            <rect width="400" height="300" fill="#F3F4F6"/>
            <g transform="translate(160,110)">
                <path d="M40 0C17.9 0 0 17.9 0 40s17.9 40 40 40 40-17.9 40-40S62.1 0 40 0zm0 12c6.6 0 12 5.4 12 12s-5.4 12-12 12-12-5.4-12-12 5.4-12 12-12zm0 56.4c-10 0-18.8-5.1-24-12.8C16.2 47.8 29.4 44 40 44s23.8 3.8 24 11.6c-5.2 7.7-14 12.8-24 12.8z" fill="#D1D5DB"/>
            </g>
            <text x="200" y="200" text-anchor="middle" fill="#9CA3AF" font-family="Inter,system-ui,sans-serif" font-size="14">No Image Available</text>
        </svg>
    `)}`;
}

