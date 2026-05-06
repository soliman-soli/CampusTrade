/**
 * CampusTrade — My Offers Page Logic (my_offers.js)
 *
 * Handles:
 *   - Auth guard on page load
 *   - Fetching offers (made and received) from API
 *   - Tab switching between "Offers I Made" and "Offers on My Listings"
 *   - Rendering offer cards with status badges
 *   - Accept/Reject actions for sellers
 */

let offersData = { offers_made: [], offers_received: [] };
let currentOffersTab = 'made';

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('navbar-container').innerHTML = renderNavbar('my-offers');

    const isAuthed = await authGuard();
    if (!isAuthed) return;

    loadAllOffers();
});

async function loadAllOffers() {
    const madeContainer = document.getElementById('content-made');
    const receivedContainer = document.getElementById('content-received');

    madeContainer.innerHTML = renderOffersSkeleton(3);

    const data = await apiFetch(`${API_BASE}/api/api_my_offers.php`);

    if (!data || !data.data) {
        madeContainer.innerHTML = '';
        return;
    }

    offersData = data.data;

    document.getElementById('made-count').textContent = offersData.offers_made.length;
    document.getElementById('received-count').textContent = offersData.offers_received.length;

    renderOffersMade();
    renderOffersReceived();
}

function switchOffersTab(tab) {
    currentOffersTab = tab;

    const madeContent = document.getElementById('content-made');
    const receivedContent = document.getElementById('content-received');
    const tabMade = document.getElementById('tab-made');
    const tabReceived = document.getElementById('tab-received');
    const indicator = document.getElementById('offers-tab-indicator');

    if (tab === 'made') {
        madeContent.classList.remove('hidden');
        receivedContent.classList.add('hidden');
        tabMade.classList.add('text-indigo-600');
        tabMade.classList.remove('text-gray-400');
        tabReceived.classList.add('text-gray-400');
        tabReceived.classList.remove('text-indigo-600');
        indicator.style.left = '0%';
    } else {
        receivedContent.classList.remove('hidden');
        madeContent.classList.add('hidden');
        tabReceived.classList.add('text-indigo-600');
        tabReceived.classList.remove('text-gray-400');
        tabMade.classList.add('text-gray-400');
        tabMade.classList.remove('text-indigo-600');
        indicator.style.left = '50%';
    }
}

function renderOffersMade() {
    const container = document.getElementById('content-made');
    const offers = offersData.offers_made;

    if (offers.length === 0) {
        container.innerHTML = renderEmptyState(
            'No offers sent yet.',
            'Browse listings and make your first offer!'
        );
        return;
    }

    container.innerHTML = offers.map(offer => {
        const image = offer.ListingImage
            ? `<img src="../${offer.ListingImage}" alt="" class="w-16 h-16 rounded-lg object-cover shrink-0">`
            : `<div class="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 dark:bg-gray-700">
                <svg class="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
            </div>`;

        return `
            <div class="bg-white rounded-xl shadow-md p-5 fade-in dark:bg-gray-800" id="offer-made-${offer.OfferID}">
                <div class="flex items-start gap-4">
                    <!-- Listing thumbnail -->
                    <a href="listing_details.html?id=${offer.ListingID}">
                        ${image}
                    </a>

                    <!-- Offer details -->
                    <div class="flex-1 min-w-0">
                        <div class="flex items-start justify-between mb-1">
                            <a href="listing_details.html?id=${offer.ListingID}" class="text-sm font-semibold text-gray-900 hover:text-indigo-600 truncate transition-colors dark:text-gray-100">
                                ${escapeHtml(offer.ListingTitle)}
                            </a>
                            ${getStatusBadge(offer.OfferStatus)}
                        </div>

                        <p class="text-xs text-gray-400 mb-2 dark:text-gray-500">Seller: ${escapeHtml(offer.SellerName)} • Listed at ${formatPrice(offer.ListingPrice)}</p>

                        <div class="flex items-center gap-4">
                            <div>
                                <p class="text-xs text-gray-400 dark:text-gray-500">Your Offer</p>
                                <p class="text-lg font-bold text-indigo-600">${formatPrice(offer.OfferAmount)}</p>
                            </div>
                            <div>
                                <p class="text-xs text-gray-400 dark:text-gray-500">Sent</p>
                                <p class="text-xs text-gray-600 dark:text-gray-400">${formatDate(offer.OfferDate)}</p>
                            </div>
                        </div>

                        ${offer.Message ? `
                            <div class="mt-3 p-3 bg-gray-50 rounded-lg dark:bg-gray-900">
                                <p class="text-xs text-gray-400 mb-1 dark:text-gray-500">Your message:</p>
                                <p class="text-sm text-gray-600 dark:text-gray-400">"${escapeHtml(offer.Message)}"</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderOffersReceived() {
    const container = document.getElementById('content-received');
    const offers = offersData.offers_received;

    if (offers.length === 0) {
        container.innerHTML = renderEmptyState(
            'No offers received yet.',
            'When buyers make offers on your listings, they\'ll appear here.'
        );
        return;
    }

    container.innerHTML = offers.map(offer => {
        const image = offer.ListingImage
            ? `<img src="../${offer.ListingImage}" alt="" class="w-16 h-16 rounded-lg object-cover shrink-0">`
            : `<div class="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 dark:bg-gray-700">
                <svg class="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
            </div>`;

        const isPending = offer.OfferStatus === 'Pending';
        const actionButtons = isPending ? `
            <div class="flex gap-2 mt-3">
                <button onclick="handleOfferAction(${offer.OfferID}, 'Accepted')" id="btn-accept-recv-${offer.OfferID}"
                    class="px-4 py-2 text-xs font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors">
                    Accept Offer
                </button>
                <button onclick="handleOfferAction(${offer.OfferID}, 'Rejected')" id="btn-reject-recv-${offer.OfferID}"
                    class="px-4 py-2 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors">
                    Reject
                </button>
            </div>
        ` : '';

        return `
            <div class="bg-white rounded-xl shadow-md p-5 fade-in dark:bg-gray-800 ${isPending ? 'offer-new' : ''}" id="offer-recv-${offer.OfferID}">
                <div class="flex items-start gap-4">
                    <a href="listing_details.html?id=${offer.ListingID}">
                        ${image}
                    </a>

                    <div class="flex-1 min-w-0">
                        <div class="flex items-start justify-between mb-1">
                            <a href="listing_details.html?id=${offer.ListingID}" class="text-sm font-semibold text-gray-900 hover:text-indigo-600 truncate transition-colors dark:text-gray-100">
                                ${escapeHtml(offer.ListingTitle)}
                            </a>
                            ${getStatusBadge(offer.OfferStatus)}
                        </div>

                        <div class="flex items-center gap-2 mb-2">
                            <div class="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center">
                                <span class="text-[10px] text-white font-medium">${getInitials(offer.BuyerName)}</span>
                            </div>
                            <span class="text-xs text-gray-600 font-medium dark:text-gray-400">${escapeHtml(offer.BuyerName)}</span>
                            <span class="text-xs text-gray-300">•</span>
                            <span class="text-xs text-gray-400 dark:text-gray-500">${formatRelativeTime(offer.OfferDate)}</span>
                        </div>

                        <div class="flex items-center gap-4">
                            <div>
                                <p class="text-xs text-gray-400 dark:text-gray-500">Offered</p>
                                <p class="text-lg font-bold text-indigo-600">${formatPrice(offer.OfferAmount)}</p>
                            </div>
                            <div>
                                <p class="text-xs text-gray-400 dark:text-gray-500">Listed At</p>
                                <p class="text-sm text-gray-600 dark:text-gray-400">${formatPrice(offer.ListingPrice)}</p>
                            </div>
                        </div>

                        ${offer.Message ? `
                            <div class="mt-3 p-3 bg-gray-50 rounded-lg dark:bg-gray-900">
                                <p class="text-xs text-gray-400 mb-1 dark:text-gray-500">Buyer's message:</p>
                                <p class="text-sm text-gray-600 dark:text-gray-400">"${escapeHtml(offer.Message)}"</p>
                            </div>
                        ` : ''}

                        ${actionButtons}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function handleOfferAction(offerId, status) {
    const btnId = status === 'Accepted' ? `btn-accept-recv-${offerId}` : `btn-reject-recv-${offerId}`;
    const btn = document.getElementById(btnId);

    setLoadingState(btn, true);

    const formData = new FormData();
    formData.append('offer_id', offerId);
    formData.append('status', status);

    try {
        const response = await fetch(`${API_BASE}/actions/update_offer_status.php`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showToast(data.message || `Offer ${status.toLowerCase()}.`, 'success');

            setTimeout(() => loadAllOffers(), 800);
        } else {
            showToast(data.error || 'Failed to update offer.', 'error');
            setLoadingState(btn, false);
        }
    } catch (error) {
        console.error('Offer action error:', error);
        showToast('Network error. Please try again.', 'error');
        setLoadingState(btn, false);
    }
}

function renderOffersSkeleton(count = 3) {
    let html = '';
    for (let i = 0; i < count; i++) {
        html += `
            <div class="bg-white rounded-xl shadow-md p-5 animate-pulse dark:bg-gray-800">
                <div class="flex items-start gap-4">
                    <div class="w-16 h-16 rounded-lg bg-gray-200 dark:bg-gray-700"></div>
                    <div class="flex-1 space-y-3">
                        <div class="h-4 bg-gray-200 rounded w-2/3 dark:bg-gray-700"></div>
                        <div class="h-3 bg-gray-200 rounded w-1/3 dark:bg-gray-700"></div>
                        <div class="h-6 bg-gray-200 rounded w-1/4 dark:bg-gray-700"></div>
                    </div>
                </div>
            </div>
        `;
    }
    return html;
}

