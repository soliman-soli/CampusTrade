/**
 * CampusTrade — Edit Listing Page Logic (edit_listing.js)
 */

let selectedImageFile = null;
let currentListingId = null;
let removeExistingImage = false;

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('navbar-container').innerHTML = renderNavbar('my-listings');

    const isAuthed = await authGuard();
    if (!isAuthed) return;

    currentListingId = getQueryParam('id');
    if (!currentListingId) {
        showToast('No listing ID specified.', 'error');
        setTimeout(() => window.location.href = 'my_listings.html', 1500);
        return;
    }

    await loadCategories();
    await loadListingData(currentListingId);

    setupImageUpload();
    setupLivePreview();
    setupCharCounter();
    setupFormSubmission();
});

async function loadCategories() {
    const select = document.getElementById('listing-category');
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

async function loadListingData(listingId) {
    const data = await apiFetch(`${API_BASE}/api/api_listing_detail.php?id=${listingId}`);

    if (!data || !data.data || !data.data.is_owner) {
        showToast('Listing not found or you do not have permission to edit it.', 'error');
        setTimeout(() => window.location.href = 'my_listings.html', 1500);
        return;
    }

    const listing = data.data;

    document.getElementById('listing-title').value = listing.Title;
    document.getElementById('listing-category').value = listing.CategoryID;
    document.getElementById('listing-condition').value = listing.Condition;
    document.getElementById('listing-price').value = parseFloat(listing.Price).toFixed(2);
    document.getElementById('listing-description').value = listing.Description;
    document.getElementById('char-count').textContent = listing.Description.length;

    document.getElementById('preview-title').textContent = listing.Title;
    document.getElementById('preview-category').textContent = listing.CategoryName;
    document.getElementById('preview-category').className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700';
    
    const condColors = { 'New': 'bg-blue-100 text-blue-700', 'Like New': 'bg-indigo-100 text-indigo-700', 'Good': 'bg-teal-100 text-teal-700', 'Fair': 'bg-amber-100 text-amber-700' };
    document.getElementById('preview-condition').textContent = listing.Condition;
    document.getElementById('preview-condition').className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${condColors[listing.Condition] || 'bg-gray-100 text-gray-400'}`;
    
    document.getElementById('preview-price').textContent = formatPrice(listing.Price);
    document.getElementById('preview-description').textContent = listing.Description;

    const primaryImg = listing.images ? listing.images.find(img => img.IsPrimary) : null;
    if (primaryImg) {
        document.getElementById('preview-image-container').innerHTML = `<img src="../${primaryImg.ImagePath}" alt="Current image" class="w-full h-48 object-cover">`;
        document.getElementById('image-previews').innerHTML = `
            <div class="image-preview">
                <img src="../${primaryImg.ImagePath}" alt="Current image">
                <button type="button" class="remove-btn" onclick="removeImage()" title="Remove image">×</button>
            </div>
            <div class="flex flex-col justify-center text-xs text-gray-500 dark:text-gray-400">
                <p class="font-medium">Current Image</p>
            </div>
        `;
    }

    document.getElementById('form-skeleton').classList.add('hidden');
    document.getElementById('form-content').classList.remove('hidden');
}

function setupImageUpload() {
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('listing-image');
    
    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) handleImageFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleImageFile(e.target.files[0]);
    });
}

function handleImageFile(file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        showToast('Only JPEG, PNG, and WebP images are allowed.', 'error');
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        showToast('Image must be under 5MB.', 'error');
        return;
    }

    selectedImageFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
        const imageUrl = e.target.result;
        document.getElementById('image-previews').innerHTML = `
            <div class="image-preview">
                <img src="${imageUrl}" alt="Preview">
                <button type="button" class="remove-btn" onclick="removeImage()" title="Remove image">×</button>
            </div>
            <div class="flex flex-col justify-center text-xs text-gray-500 dark:text-gray-400">
                <p class="font-medium">${escapeHtml(file.name)}</p>
                <p>${(file.size / 1024).toFixed(1)} KB</p>
            </div>
        `;
        document.getElementById('preview-image-container').innerHTML = `<img src="${imageUrl}" alt="Preview" class="w-full h-48 object-cover">`;
    };
    reader.readAsDataURL(file);
}

function removeImage() {
    selectedImageFile = null;
    removeExistingImage = true;
    document.getElementById('listing-image').value = '';
    document.getElementById('image-previews').innerHTML = '';
    document.getElementById('preview-image-container').innerHTML = `
        <svg class="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
    `;
}

function setupLivePreview() {
    const titleInput = document.getElementById('listing-title');
    const categorySelect = document.getElementById('listing-category');
    const conditionSelect = document.getElementById('listing-condition');
    const priceInput = document.getElementById('listing-price');
    const descInput = document.getElementById('listing-description');

    const previewTitle = document.getElementById('preview-title');
    const previewCategory = document.getElementById('preview-category');
    const previewCondition = document.getElementById('preview-condition');
    const previewPrice = document.getElementById('preview-price');
    const previewDescription = document.getElementById('preview-description');

    titleInput.addEventListener('input', () => {
        const val = titleInput.value.trim();
        previewTitle.textContent = val || 'Your listing title';
    });

    categorySelect.addEventListener('change', () => {
        const selected = categorySelect.options[categorySelect.selectedIndex];
        previewCategory.textContent = selected.value ? selected.textContent : 'Category';
    });

    conditionSelect.addEventListener('change', () => {
        const val = conditionSelect.value;
        previewCondition.textContent = val || 'Condition';
        if (val) {
            const condColors = { 'New': 'bg-blue-100 text-blue-700', 'Like New': 'bg-indigo-100 text-indigo-700', 'Good': 'bg-teal-100 text-teal-700', 'Fair': 'bg-amber-100 text-amber-700' };
            previewCondition.className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${condColors[val] || 'bg-gray-100 text-gray-400'}`;
        }
    });

    priceInput.addEventListener('input', () => {
        const val = parseFloat(priceInput.value);
        previewPrice.textContent = isNaN(val) ? 'EGP 0.00' : formatPrice(val);
    });

    descInput.addEventListener('input', () => {
        const val = descInput.value.trim();
        previewDescription.textContent = val || 'Your listing description will appear here...';
    });
}

function setupCharCounter() {
    const descInput = document.getElementById('listing-description');
    const charCount = document.getElementById('char-count');
    descInput.addEventListener('input', () => {
        const count = descInput.value.length;
        charCount.textContent = count;
        if (count > 900) charCount.classList.add('text-red-500', 'font-medium');
        else charCount.classList.remove('text-red-500', 'font-medium');
    });
}

function setupFormSubmission() {
    const form = document.getElementById('form-edit-listing');
    const submitBtn = document.getElementById('btn-edit-listing');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('listing-title').value.trim();
        const categoryId = document.getElementById('listing-category').value;
        const condition = document.getElementById('listing-condition').value;
        const price = document.getElementById('listing-price').value;
        const description = document.getElementById('listing-description').value.trim();

        if (title.length < 3 || title.length > 100) return showToast('Title must be between 3 and 100 characters.', 'error');
        if (!categoryId) return showToast('Please select a category.', 'error');
        if (!condition) return showToast('Please select the item condition.', 'error');
        if (!price || parseFloat(price) < 0) return showToast('Price must be zero or a positive number.', 'error');
        if (description.length < 10 || description.length > 1000) return showToast('Description must be between 10 and 1000 characters.', 'error');

        setLoadingState(submitBtn, true);
        showProgressBar();

        const formData = new FormData();
        formData.append('listing_id', currentListingId);
        formData.append('title', title);
        formData.append('category_id', categoryId);
        formData.append('condition', condition);
        formData.append('price', price);
        formData.append('description', description);
        if (selectedImageFile) formData.append('listing_image', selectedImageFile);
        if (removeExistingImage && !selectedImageFile) formData.append('remove_image', '1');

        try {
            const response = await fetch(`${API_BASE}/actions/update_listing.php`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                completeProgressBar();
                showToast('Listing updated successfully!', 'success');
                setTimeout(() => window.location.href = 'my_listings.html', 1000);
            } else {
                hideProgressBar();
                showToast(data.error || 'Failed to update listing.', 'error');
                setLoadingState(submitBtn, false);
            }
        } catch (error) {
            hideProgressBar();
            console.error('Update listing error:', error);
            showToast('Network error. Please try again.', 'error');
            setLoadingState(submitBtn, false);
        }
    });
}

function showProgressBar() {
    const container = document.getElementById('submit-progress');
    const fill = document.getElementById('progress-fill');
    container.classList.remove('hidden');
    fill.style.width = '0%';
    setTimeout(() => fill.style.width = '30%', 100);
    setTimeout(() => fill.style.width = '60%', 500);
    setTimeout(() => fill.style.width = '75%', 1000);
}

function completeProgressBar() { document.getElementById('progress-fill').style.width = '100%'; }
function hideProgressBar() { document.getElementById('submit-progress').classList.add('hidden'); }

