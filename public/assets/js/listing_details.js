/**
 * CampusTrade — Listing Details Page Logic (listing_details.js)
 *
 * Handles:
 *   - Loading listing data from URL param (?id=)
 *   - Image gallery with thumbnail navigation
 *   - Displaying offer form for buyers (non-owners)
 *   - Displaying offer management for sellers (owners)
 *   - Submitting offers
 *   - Accepting/rejecting offers
 */

let currentListingData = null;

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('navbar-container').innerHTML = renderNavbar('');

    const isAuthed = await authGuard();
    if (!isAuthed) return;

    const listingId = getQueryParam('id');
    if (!listingId) {
        showToast('No listing ID specified.', 'error');
        setTimeout(() => window.location.href = 'dashboard.html', 1500);
        return;
    }

    loadListingDetails(listingId);
});

async function loadListingDetails(listingId) {
    const skeleton = document.getElementById('detail-skeleton');
    const content = document.getElementById('detail-content');

    const data = await apiFetch(`${API_BASE}/api/api_listing_detail.php?id=${listingId}`);

    if (!data || !data.data) {
        showToast('Listing not found.', 'error');
        setTimeout(() => window.location.href = 'dashboard.html', 1500);
        return;
    }

    currentListingData = data.data;
    const listing = data.data;

    skeleton.classList.add('hidden');
    content.classList.remove('hidden');

    document.getElementById('detail-title').textContent = listing.Title;
    document.getElementById('detail-price').textContent = formatPrice(listing.Price);
    document.getElementById('detail-category').textContent = listing.CategoryName;
    document.getElementById('detail-condition').innerHTML = getConditionBadge(listing.Condition);
    document.getElementById('detail-status').innerHTML = getStatusBadge(listing.Status);
    document.getElementById('detail-description').textContent = listing.Description;

    document.getElementById('seller-initials').textContent = getInitials(listing.SellerName);
    document.getElementById('seller-name').textContent = listing.SellerName;
    const memberYear = listing.SellerMemberSince ? new Date(listing.SellerMemberSince).getFullYear() : 'N/A';
    document.getElementById('seller-since').textContent = `Member since ${memberYear}`;

    if (listing.SellerSocialMedia) {
        document.getElementById('seller-social-container').classList.remove('hidden');
        document.getElementById('seller-social-link').href = listing.SellerSocialMedia;
    } else {
        document.getElementById('seller-social-container').classList.add('hidden');
    }

    document.title = `${listing.Title} — CampusTrade`;

    setupImageGallery(listing.images || []);

    if (listing.Status === 'Active' && !listing.is_owner) {

        document.getElementById('offer-section').classList.remove('hidden');
        document.getElementById('offer-amount').value = listing.Price;
        setupOfferForm(listing.ListingID);
    } else if (listing.is_owner) {

        document.getElementById('manage-offers-section').classList.remove('hidden');
        renderOffersList(listing.offers || []);
    }

    if (listing.Status === 'Sold' && !listing.is_owner) {
        document.getElementById('sold-message').classList.remove('hidden');
    }
}

function setupImageGallery(images) {
    const mainImg = document.getElementById('gallery-main');
    const thumbnailsContainer = document.getElementById('gallery-thumbnails');

    if (images.length === 0) {
        mainImg.src = getPlaceholderImage();
        mainImg.alt = 'No image available';
        return;
    }

    const primaryImage = images.find(img => img.IsPrimary) || images[0];
    mainImg.src = '../' + primaryImage.ImagePath;
    mainImg.alt = 'Listing image';

    if (images.length > 1) {
        thumbnailsContainer.innerHTML = images.map((img, index) => `
            <button class="gallery-thumbnail w-20 h-20 shrink-0 ${img.ImagePath === primaryImage.ImagePath ? 'active' : ''}"
                onclick="switchGalleryImage('${img.ImagePath}', this)" id="thumb-${index}">
                <img src="../${img.ImagePath}" alt="Thumbnail ${index + 1}" class="w-full h-full object-cover rounded-lg">
            </button>
        `).join('');
    }
}

/**
 * Switches the main gallery image with a smooth transition.
 */
function switchGalleryImage(imagePath, thumbnailBtn) {
    const mainImg = document.getElementById('gallery-main');

    mainImg.classList.add('switching');
    setTimeout(() => {
        mainImg.src = '../' + imagePath;
        mainImg.classList.remove('switching');
    }, 300);

    document.querySelectorAll('.gallery-thumbnail').forEach(t => t.classList.remove('active'));
    if (thumbnailBtn) thumbnailBtn.classList.add('active');
}

function setupOfferForm(listingId) {
    const form = document.getElementById('form-offer');
    const submitBtn = document.getElementById('btn-send-offer');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const offerAmount = document.getElementById('offer-amount').value;
        const message = document.getElementById('offer-message').value.trim();

        if (!offerAmount || parseFloat(offerAmount) <= 0) {
            showToast('Offer amount must be greater than zero.', 'error');
            return;
        }

        setLoadingState(submitBtn, true);

        const formData = new FormData();
        formData.append('listing_id', listingId);
        formData.append('offer_amount', offerAmount);
        formData.append('message', message);

        try {
            const response = await fetch(`${API_BASE}/actions/process_offer.php`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                showToast(data.message || 'Offer submitted!', 'success');

                form.innerHTML = `
                    <div class="p-4 bg-emerald-50 rounded-xl text-center">
                        <svg class="w-8 h-8 text-emerald-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        <p class="text-sm font-medium text-emerald-700">Your offer has been sent!</p>
                        <p class="text-xs text-emerald-500 mt-1">The seller will review it and respond soon.</p>
                    </div>
                `;
            } else {
                showToast(data.error || 'Failed to submit offer.', 'error');
                setLoadingState(submitBtn, false);
            }
        } catch (error) {
            console.error('Offer submission error:', error);
            showToast('Network error. Please try again.', 'error');
            setLoadingState(submitBtn, false);
        }
    });
}

function renderOffersList(offers) {
    const container = document.getElementById('offers-list');
    const emptyState = document.getElementById('offers-empty');

    if (offers.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        emptyState.innerHTML = renderEmptyState('No offers yet.', 'Offers from interested buyers will appear here.');
        return;
    }

    container.innerHTML = offers.map(offer => {
        const isPending = offer.Status === 'Pending';
        const actionButtons = isPending ? `
            <div class="flex gap-2 mt-3">
                <button onclick="updateOfferStatus(${offer.OfferID}, 'Accepted')" id="btn-accept-${offer.OfferID}"
                    class="flex-1 py-2 text-xs font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors">
                    Accept
                </button>
                <button onclick="updateOfferStatus(${offer.OfferID}, 'Rejected')" id="btn-reject-${offer.OfferID}"
                    class="flex-1 py-2 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors">
                    Reject
                </button>
            </div>
        ` : '';

        return `
            <div class="p-4 bg-gray-50 rounded-xl dark:bg-gray-800 ${isPending ? 'offer-new' : ''}" id="offer-card-${offer.OfferID}">
                <div class="flex items-start justify-between mb-2">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center">
                            <span class="text-xs text-white font-medium">${getInitials(offer.BuyerName)}</span>
                        </div>
                        <div>
                            <p class="text-sm font-semibold text-gray-800 dark:text-gray-200">${escapeHtml(offer.BuyerName)}</p>
                            <p class="text-xs text-gray-400 dark:text-gray-500">${formatRelativeTime(offer.CreatedAt)}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-lg font-bold text-indigo-600">${formatPrice(offer.OfferAmount)}</p>
                        ${getStatusBadge(offer.Status)}
                    </div>
                </div>
                ${offer.Message ? `<p class="text-sm text-gray-600 mt-2 bg-white p-3 rounded-lg dark:text-gray-400 dark:bg-gray-800">"${escapeHtml(offer.Message)}"</p>` : ''}
                ${actionButtons}
            </div>
        `;
    }).join('');
}

async function updateOfferStatus(offerId, status) {
    const btnId = status === 'Accepted' ? `btn-accept-${offerId}` : `btn-reject-${offerId}`;
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

            setTimeout(() => loadListingDetails(currentListingData.ListingID), 1000);
        } else {
            showToast(data.error || 'Failed to update offer.', 'error');
            setLoadingState(btn, false);
        }
    } catch (error) {
        console.error('Update offer error:', error);
        showToast('Network error. Please try again.', 'error');
        setLoadingState(btn, false);
    }
}

