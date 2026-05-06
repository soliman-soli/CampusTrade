/**
 * CampusTrade — Create Listing Page Logic (create_listing.js)
 *
 * Handles:
 *   - Auth guard on page load
 *   - Loading categories into the dropdown
 *   - Drag-and-drop image upload with live preview
 *   - Real-time live preview panel updates
 *   - Character counter for the description field
 *   - Client-side validation before submission
 *   - Form submission with progress bar animation
 */

let selectedImageFile = null;

document.addEventListener('DOMContentLoaded', async () => {

    document.getElementById('navbar-container').innerHTML = renderNavbar('create');

    const isAuthed = await authGuard();
    if (!isAuthed) return;

    loadCategories();

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

function setupImageUpload() {
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('listing-image');
    const previewsContainer = document.getElementById('image-previews');

    uploadZone.addEventListener('click', () => fileInput.click());

    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleImageFile(files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleImageFile(e.target.files[0]);
        }
    });
}

/**
 * Validates and processes a selected image file.
 * Shows preview thumbnail and updates live preview panel.
 */
function handleImageFile(file) {
    const previewsContainer = document.getElementById('image-previews');
    const previewImageContainer = document.getElementById('preview-image-container');

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

        previewsContainer.innerHTML = `
            <div class="image-preview">
                <img src="${imageUrl}" alt="Preview">
                <button type="button" class="remove-btn" onclick="removeImage()" title="Remove image">×</button>
            </div>
            <div class="flex flex-col justify-center text-xs text-gray-500 dark:text-gray-400">
                <p class="font-medium">${escapeHtml(file.name)}</p>
                <p>${(file.size / 1024).toFixed(1)} KB</p>
            </div>
        `;

        previewImageContainer.innerHTML = `<img src="${imageUrl}" alt="Preview" class="w-full h-48 object-cover">`;
    };
    reader.readAsDataURL(file);
}

/**
 * Removes the selected image and resets the preview.
 */
function removeImage() {
    selectedImageFile = null;
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
        previewTitle.classList.toggle('text-gray-300', !val);
        previewTitle.classList.toggle('text-gray-900', !!val);
    });

    categorySelect.addEventListener('change', () => {
        const selected = categorySelect.options[categorySelect.selectedIndex];
        const val = selected.value ? selected.textContent : 'Category';
        previewCategory.textContent = val;
        previewCategory.classList.toggle('text-gray-400', !selected.value);
        previewCategory.classList.toggle('bg-gray-100', !selected.value);
        if (selected.value) {
            previewCategory.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700';
        }
    });

    conditionSelect.addEventListener('change', () => {
        const val = conditionSelect.value;
        previewCondition.textContent = val || 'Condition';
        if (val) {
            const condColors = {
                'New': 'bg-blue-100 text-blue-700',
                'Like New': 'bg-indigo-100 text-indigo-700',
                'Good': 'bg-teal-100 text-teal-700',
                'Fair': 'bg-amber-100 text-amber-700',
            };
            previewCondition.className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${condColors[val] || 'bg-gray-100 text-gray-400'}`;
        } else {
            previewCondition.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400';
        }
    });

    priceInput.addEventListener('input', () => {
        const val = parseFloat(priceInput.value);
        previewPrice.textContent = isNaN(val) ? 'EGP 0.00' : formatPrice(val);
        previewPrice.classList.toggle('text-gray-300', isNaN(val));
        previewPrice.classList.toggle('text-indigo-600', !isNaN(val));
    });

    descInput.addEventListener('input', () => {
        const val = descInput.value.trim();
        previewDescription.textContent = val || 'Your listing description will appear here...';
        previewDescription.classList.toggle('text-gray-300', !val);
        previewDescription.classList.toggle('text-gray-600', !!val);
    });
}

function setupCharCounter() {
    const descInput = document.getElementById('listing-description');
    const charCount = document.getElementById('char-count');

    descInput.addEventListener('input', () => {
        const count = descInput.value.length;
        charCount.textContent = count;

        if (count > 900) {
            charCount.classList.add('text-red-500', 'font-medium');
        } else {
            charCount.classList.remove('text-red-500', 'font-medium');
        }
    });
}

function setupFormSubmission() {
    const form = document.getElementById('form-create-listing');
    const submitBtn = document.getElementById('btn-create-listing');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('listing-title').value.trim();
        const categoryId = document.getElementById('listing-category').value;
        const condition = document.getElementById('listing-condition').value;
        const price = document.getElementById('listing-price').value;
        const description = document.getElementById('listing-description').value.trim();

        if (title.length < 3 || title.length > 100) {
            showToast('Title must be between 3 and 100 characters.', 'error');
            return;
        }
        if (!categoryId) {
            showToast('Please select a category.', 'error');
            return;
        }
        if (!condition) {
            showToast('Please select the item condition.', 'error');
            return;
        }
        if (!price || parseFloat(price) < 0) {
            showToast('Price must be zero or a positive number.', 'error');
            return;
        }
        if (description.length < 10 || description.length > 1000) {
            showToast('Description must be between 10 and 1000 characters.', 'error');
            return;
        }

        setLoadingState(submitBtn, true);
        showProgressBar();

        const formData = new FormData();
        formData.append('title', title);
        formData.append('category_id', categoryId);
        formData.append('condition', condition);
        formData.append('price', price);
        formData.append('description', description);
        formData.append('listing_image', selectedImageFile);

        try {
            const response = await fetch(`${API_BASE}/actions/process_listing.php`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                completeProgressBar();
                showToast(data.message || 'Listing created successfully!', 'success');
                setTimeout(() => {
                    window.location.href = 'my_listings.html';
                }, 1000);
            } else {
                hideProgressBar();
                showToast(data.error || 'Failed to create listing.', 'error');
                setLoadingState(submitBtn, false);
            }
        } catch (error) {
            hideProgressBar();
            console.error('Create listing error:', error);
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

function completeProgressBar() {
    const fill = document.getElementById('progress-fill');
    fill.style.width = '100%';
}

function hideProgressBar() {
    const container = document.getElementById('submit-progress');
    container.classList.add('hidden');
}

