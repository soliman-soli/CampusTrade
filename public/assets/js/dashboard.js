/**
 * CampusTrade — Dashboard Page Logic (dashboard.js)
 *
 * Handles:
 *   - Auth guard on page load
 *   - Fetching and rendering the category dropdown
 *   - Fetching and rendering the listings grid
 *   - Filter application with search, category, condition, price range
 *   - Skeleton loading states
 *   - Empty state display
 */

document.addEventListener('DOMContentLoaded', async () => {

    document.getElementById('navbar-container').innerHTML = renderNavbar('dashboard');

    const isAuthed = await authGuard();
    if (!isAuthed) return;

    loadCategories();

    loadListings();
});

async function loadCategories() {
    const select = document.getElementById('filter-category');
    const data = await apiFetch(`${API_BASE}/api/api_categories.php`);

    if (data && data.data) {
        data.data.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.CategoryID;
            option.textContent = cat.CategoryName;
            select.appendChild(option);
        });
    }
}

async function loadListings() {
    const grid = document.getElementById('listings-grid');
    const emptyState = document.getElementById('empty-state');
    const resultsCount = document.getElementById('results-count');

    renderSkeletonCards(grid, 6);
    emptyState.classList.add('hidden');

    const params = new URLSearchParams();

    const search = document.getElementById('filter-search').value.trim();
    const category = document.getElementById('filter-category').value;
    const condition = document.getElementById('filter-condition').value;
    const minPrice = document.getElementById('filter-min-price').value;
    const maxPrice = document.getElementById('filter-max-price').value;

    if (search) params.append('search', search);
    if (category) params.append('category', category);
    if (condition) params.append('condition', condition);
    if (minPrice) params.append('min_price', minPrice);
    if (maxPrice) params.append('max_price', maxPrice);

    const queryString = params.toString();
    const url = `${API_BASE}/api/api_listings.php${queryString ? '?' + queryString : ''}`;

    const data = await apiFetch(url);

    if (!data) {
        grid.innerHTML = '';
        resultsCount.textContent = '';
        return;
    }

    const listings = data.data || [];
    resultsCount.textContent = `${listings.length} listing${listings.length !== 1 ? 's' : ''} found`;

    if (listings.length === 0) {
        grid.innerHTML = '';
        emptyState.classList.remove('hidden');
        emptyState.innerHTML = renderEmptyState(
            'No listings found.',
            'Be the first to post! Try adjusting your filters or creating a new listing.'
        );
        return;
    }

    emptyState.classList.add('hidden');
    grid.innerHTML = listings.map(listing => renderListingCard(listing)).join('');
}

function renderListingCard(listing) {
    const image = listing.PrimaryImage
        ? `<img src="../${listing.PrimaryImage}" alt="${escapeHtml(listing.Title)}" class="w-full h-48 object-cover">`
        : `<img src="${getPlaceholderImage()}" alt="No image" class="w-full h-48 object-cover">`;

    const categoryColors = {
        'Textbooks':    'bg-blue-100 text-blue-700',
        'Electronics':  'bg-purple-100 text-purple-700',
        'Lab Supplies': 'bg-teal-100 text-teal-700',
        'Stationery':   'bg-amber-100 text-amber-700',
    };
    const catColor = categoryColors[listing.CategoryName] || 'bg-gray-100 text-gray-600';

    return `
        <article class="bg-white rounded-xl shadow-md overflow-hidden listing-card dark:bg-gray-800">
            <!-- Image -->
            <div class="relative">
                ${image}
                <div class="absolute top-3 left-3">
                    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${catColor}">
                        ${escapeHtml(listing.CategoryName)}
                    </span>
                </div>
            </div>

            <!-- Content -->
            <div class="p-5">
                <!-- Title -->
                <h3 class="text-sm font-semibold text-gray-900 truncate mb-2 dark:text-gray-100" title="${escapeHtml(listing.Title)}">
                    ${escapeHtml(listing.Title)}
                </h3>

                <!-- Condition + Price Row -->
                <div class="flex items-center justify-between mb-3">
                    ${getConditionBadge(listing.Condition)}
                    <span class="text-lg font-bold text-indigo-600">${formatPrice(listing.Price)}</span>
                </div>

                <!-- Seller Info -->
                <div class="flex items-center gap-2 mb-4">
                    <div class="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center">
                        <span class="text-xs text-white font-medium">${getInitials(listing.SellerName)}</span>
                    </div>
                    <span class="text-xs text-gray-500 dark:text-gray-400">${escapeHtml(listing.SellerName)}</span>
                    <span class="text-xs text-gray-300 ml-auto">${formatRelativeTime(listing.CreatedAt)}</span>
                </div>

                <!-- View Details Button -->
                <a href="listing_details.html?id=${listing.ListingID}" id="listing-${listing.ListingID}"
                    class="block w-full text-center py-2.5 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-200 dark:hover:bg-indigo-900/30">
                    View Details →
                </a>
            </div>
        </article>
    `;
}

/**
 * Applies all current filter values and reloads the listings grid.
 */
function applyFilters() {
    loadListings();
}

/**
 * Resets all filter inputs to their default values and reloads.
 */
function resetFilters() {
    document.getElementById('filter-search').value = '';
    document.getElementById('filter-category').value = '';
    document.getElementById('filter-condition').value = '';
    document.getElementById('filter-min-price').value = '';
    document.getElementById('filter-max-price').value = '';
    loadListings();
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && document.activeElement?.closest('#filter-bar')) {
        applyFilters();
    }
});

