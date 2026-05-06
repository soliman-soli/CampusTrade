/**
 * CampusTrade — My Listings Page Logic (my_listings.js)
 *
 * Handles:
 *   - Auth guard on page load
 *   - Fetching and rendering user's listings (card + table views)
 *   - View toggle between cards and table
 *   - Inline edit form for updating listings
 *   - Delete confirmation modal with soft-delete
 *   - Mark as Sold action
 */

let userListings = [];
let currentView = 'card';
let deleteTargetId = null;

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('navbar-container').innerHTML = renderNavbar('my-listings');

    const isAuthed = await authGuard();
    if (!isAuthed) return;

    loadMyListings();
});

async function loadMyListings() {
    const cardView = document.getElementById('card-view');
    const emptyState = document.getElementById('empty-state');

    renderSkeletonCards(cardView, 3);

    const data = await apiFetch(`${API_BASE}/api/api_my_listings.php`);

    if (!data) {
        cardView.innerHTML = '';
        return;
    }

    userListings = data.data || [];

    if (userListings.length === 0) {
        cardView.innerHTML = '';
        emptyState.classList.remove('hidden');
        emptyState.innerHTML = renderEmptyState(
            'You haven\'t listed anything yet.',
            'Start selling by creating your first listing!'
        );
        return;
    }

    emptyState.classList.add('hidden');
    renderCards();
    renderTable();
}

function toggleView(view) {
    currentView = view;
    const cardView = document.getElementById('card-view');
    const tableView = document.getElementById('table-view');
    const btnCard = document.getElementById('btn-view-card');
    const btnTable = document.getElementById('btn-view-table');

    if (view === 'card') {
        cardView.classList.remove('hidden');
        tableView.classList.add('hidden');
        btnCard.classList.add('bg-indigo-600', 'text-white');
        btnCard.classList.remove('text-gray-500');
        btnTable.classList.remove('bg-indigo-600', 'text-white');
        btnTable.classList.add('text-gray-500');
    } else {
        cardView.classList.add('hidden');
        tableView.classList.remove('hidden');
        btnTable.classList.add('bg-indigo-600', 'text-white');
        btnTable.classList.remove('text-gray-500');
        btnCard.classList.remove('bg-indigo-600', 'text-white');
        btnCard.classList.add('text-gray-500');
    }
}

function renderCards() {
    const container = document.getElementById('card-view');
    container.innerHTML = userListings.map(listing => {
        const image = listing.PrimaryImage
            ? `<img src="../${listing.PrimaryImage}" alt="${escapeHtml(listing.Title)}" class="w-full h-44 object-cover">`
            : `<img src="${getPlaceholderImage()}" alt="No image" class="w-full h-44 object-cover">`;

        return `
            <div class="bg-white rounded-xl shadow-md overflow-hidden listing-card dark:bg-gray-800" id="card-${listing.ListingID}">
                <div class="relative">
                    ${image}
                    <div class="absolute top-3 right-3">${getStatusBadge(listing.Status)}</div>
                </div>
                <div class="p-5">
                    <h3 class="text-sm font-semibold text-gray-900 truncate mb-1 dark:text-gray-100">${escapeHtml(listing.Title)}</h3>
                    <div class="flex items-center justify-between mb-3">
                        <span class="text-lg font-bold text-indigo-600">${formatPrice(listing.Price)}</span>
                        <span class="text-xs text-gray-400 dark:text-gray-500">${listing.OfferCount || 0} offer${listing.OfferCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="flex items-center gap-2 mb-3">
                        <span class="text-xs text-gray-400 dark:text-gray-500">${escapeHtml(listing.CategoryName)}</span>
                        <span class="text-xs text-gray-300">•</span>
                        ${getConditionBadge(listing.Condition)}
                    </div>
                    <p class="text-xs text-gray-400 mb-4 dark:text-gray-500">Posted ${formatDate(listing.CreatedAt)}</p>
                    <div class="flex gap-2">
                        ${listing.Status === 'Active' ? `
                            <a href="edit_listing.html?id=${listing.ListingID}" class="flex-1 py-2 text-center text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors block dark:hover:bg-indigo-900/30" id="btn-edit-${listing.ListingID}">
                                Edit
                            </a>
                            <button onclick="openDeleteModal(${listing.ListingID})" class="py-2 px-3 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors" id="btn-delete-${listing.ListingID}">
                                Delete
                            </button>
                        ` : ''}
                        <a href="listing_details.html?id=${listing.ListingID}" class="py-2 px-3 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-700">
                            View
                        </a>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderTable() {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = userListings.map(listing => {
        const thumb = listing.PrimaryImage
            ? `<img src="../${listing.PrimaryImage}" alt="" class="w-10 h-10 rounded-lg object-cover">`
            : `<div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center dark:bg-gray-700"><svg class="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg></div>`;

        return `
            <tr class="hover:bg-gray-50 transition-colors dark:hover:bg-gray-700" id="row-${listing.ListingID}">
                <td class="py-3 px-4">
                    <div class="flex items-center gap-3">
                        ${thumb}
                        <div>
                            <p class="font-medium text-gray-900 truncate max-w-[200px] dark:text-gray-100">${escapeHtml(listing.Title)}</p>
                            <p class="text-xs text-gray-400 dark:text-gray-500">${escapeHtml(listing.CategoryName)}</p>
                        </div>
                    </div>
                </td>
                <td class="py-3 px-4 font-semibold text-indigo-600">${formatPrice(listing.Price)}</td>
                <td class="py-3 px-4">${getStatusBadge(listing.Status)}</td>
                <td class="py-3 px-4 text-gray-600 dark:text-gray-400">${listing.OfferCount || 0}</td>
                <td class="py-3 px-4 text-gray-400 text-xs dark:text-gray-500">${formatDate(listing.CreatedAt)}</td>
                <td class="py-3 px-4 text-right">
                    <div class="flex items-center justify-end gap-2">
                        ${listing.Status === 'Active' ? `
                            <a href="edit_listing.html?id=${listing.ListingID}" class="text-xs text-indigo-600 hover:underline">Edit</a>
                            <button onclick="openDeleteModal(${listing.ListingID})" class="text-xs text-red-500 hover:underline">Delete</button>
                        ` : ''}
                        <a href="listing_details.html?id=${listing.ListingID}" class="text-xs text-gray-500 hover:underline dark:text-gray-400">View</a>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function openDeleteModal(listingId) {
    deleteTargetId = listingId;
    document.getElementById('delete-modal').classList.remove('hidden');
}

function closeDeleteModal() {
    deleteTargetId = null;
    document.getElementById('delete-modal').classList.add('hidden');
}

async function confirmDelete() {
    if (!deleteTargetId) return;

    const btn = document.getElementById('btn-confirm-delete');
    setLoadingState(btn, true);

    const formData = new FormData();
    formData.append('listing_id', deleteTargetId);

    try {
        const response = await fetch(`${API_BASE}/actions/delete_listing.php`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showToast(data.message || 'Listing deleted.', 'success');
            closeDeleteModal();
            setLoadingState(btn, false);
            loadMyListings(); // Refresh
        } else {
            showToast(data.error || 'Failed to delete listing.', 'error');
            setLoadingState(btn, false);
        }
    } catch (error) {
        console.error('Delete error:', error);
        showToast('Network error. Please try again.', 'error');
        setLoadingState(btn, false);
    }
}

