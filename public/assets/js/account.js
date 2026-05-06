/**
 * CampusTrade — Account Page Logic (account.js)
 */

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('navbar-container').innerHTML = renderNavbar('account');

    const isAuthed = await authGuard();
    if (!isAuthed) return;

    setupDarkModeToggle();
    loadUserProfile();
    setupProfileImageUpload();
    setupEditName();
    setupEditSocial();
});

let selectedImageFile = null;

async function loadUserProfile() {
    try {
        const response = await fetch(`${API_BASE}/api/api_user_profile.php`, { credentials: 'include' });
        const data = await response.json();

        if (data.success && data.user) {
            document.getElementById('profile-name').textContent = data.user.fullName;
            document.getElementById('input-edit-name').value = data.user.fullName;
            document.getElementById('profile-email').textContent = data.user.email;

            document.getElementById('btn-edit-name').classList.remove('hidden');
            
            const initialsEl = document.getElementById('profile-initials');
            const imgEl = document.getElementById('profile-image-display');
            
            if (data.user.profileImage) {
                imgEl.src = data.user.profileImage + '?t=' + new Date().getTime(); // cache bust
                imgEl.classList.remove('hidden');
                initialsEl.classList.add('hidden');
            } else {
                initialsEl.textContent = getInitials(data.user.fullName);
                initialsEl.classList.remove('hidden');
                imgEl.classList.add('hidden');
            }

            const socialDisplay = document.getElementById('display-social');
            const socialInput = document.getElementById('input-edit-social');
            if (data.user.socialMedia) {
                socialDisplay.innerHTML = `<a href="${data.user.socialMedia}" target="_blank" class="text-indigo-600 hover:text-indigo-500">${data.user.socialMedia}</a>`;
                socialInput.value = data.user.socialMedia;
            } else {
                socialDisplay.textContent = 'Not provided';
                socialInput.value = '';
            }
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

function setupEditName() {
    const btnEdit = document.getElementById('btn-edit-name');
    const btnSave = document.getElementById('btn-save-name');
    const btnCancel = document.getElementById('btn-cancel-name');
    const nameDisplay = document.getElementById('profile-name');
    const editContainer = document.getElementById('edit-name-container');
    const inputName = document.getElementById('input-edit-name');

    btnEdit.addEventListener('click', () => {
        nameDisplay.classList.add('hidden');
        btnEdit.classList.add('hidden');
        editContainer.classList.remove('hidden');
        editContainer.classList.add('flex');
        inputName.focus();
    });

    const closeEdit = () => {
        editContainer.classList.add('hidden');
        editContainer.classList.remove('flex');
        nameDisplay.classList.remove('hidden');
        btnEdit.classList.remove('hidden');
    };

    btnCancel.addEventListener('click', () => {
        inputName.value = nameDisplay.textContent; // reset to current
        closeEdit();
    });

    btnSave.addEventListener('click', async () => {
        const newName = inputName.value.trim();
        if (!newName || newName.length < 2) {
            showToast('Name must be at least 2 characters long', 'error');
            return;
        }

        setLoadingState(btnSave, true, 'Saving');

        const formData = new FormData();
        formData.append('full_name', newName);

        try {
            const response = await fetch(`${API_BASE}/actions/update_name.php`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });
            const data = await response.json();

            if (data.success) {
                showToast('Name updated successfully', 'success');
                nameDisplay.textContent = newName;
                document.getElementById('profile-initials').textContent = getInitials(newName);
                closeEdit();
            } else {
                showToast(data.error || 'Failed to update name', 'error');
            }
        } catch (err) {
            showToast('Network error. Please try again.', 'error');
        } finally {
            setLoadingState(btnSave, false, 'Save');
        }
    });
}

function setupEditSocial() {
    const btnEdit = document.getElementById('btn-edit-social');
    const btnSave = document.getElementById('btn-save-social');
    const btnCancel = document.getElementById('btn-cancel-social');
    const socialDisplay = document.getElementById('display-social');
    const editContainer = document.getElementById('edit-social-container');
    const inputSocial = document.getElementById('input-edit-social');

    btnEdit.addEventListener('click', () => {
        socialDisplay.classList.add('hidden');
        btnEdit.classList.add('hidden');
        editContainer.classList.remove('hidden');
        editContainer.classList.add('flex');
        inputSocial.focus();
    });

    const closeEdit = () => {
        editContainer.classList.add('hidden');
        editContainer.classList.remove('flex');
        socialDisplay.classList.remove('hidden');
        btnEdit.classList.remove('hidden');
    };

    btnCancel.addEventListener('click', () => {
        closeEdit();
    });

    btnSave.addEventListener('click', async () => {
        const newSocial = inputSocial.value.trim();

        setLoadingState(btnSave, true, 'Saving');

        const formData = new FormData();
        formData.append('social_media', newSocial);

        try {
            const response = await fetch(`${API_BASE}/actions/update_social.php`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });
            const data = await response.json();

            if (data.success) {
                showToast('Social media updated successfully', 'success');
                if (newSocial) {
                    socialDisplay.innerHTML = `<a href="${newSocial}" target="_blank" class="text-indigo-600 hover:text-indigo-500">${newSocial}</a>`;
                } else {
                    socialDisplay.textContent = 'Not provided';
                }
                closeEdit();
            } else {
                showToast(data.error || 'Failed to update social media', 'error');
            }
        } catch (err) {
            showToast('Network error. Please try again.', 'error');
        } finally {
            setLoadingState(btnSave, false, 'Save');
        }
    });
}

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

function setupProfileImageUpload() {
    const uploadInput = document.getElementById('profile-image-upload');
    const saveBtn = document.getElementById('btn-save-profile-img');
    const imgDisplay = document.getElementById('profile-image-display');
    const initialsDisplay = document.getElementById('profile-initials');

    uploadInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            selectedImageFile = e.target.files[0];

            const reader = new FileReader();
            reader.onload = function(e) {
                imgDisplay.src = e.target.result;
                imgDisplay.classList.remove('hidden');
                initialsDisplay.classList.add('hidden');
                saveBtn.classList.remove('hidden');
            };
            reader.readAsDataURL(selectedImageFile);
        }
    });

    saveBtn.addEventListener('click', async () => {
        if (!selectedImageFile) return;
        
        setLoadingState(saveBtn, true, 'Saving...');
        
        const formData = new FormData();
        formData.append('profile_image', selectedImageFile);
        
        try {
            const response = await fetch(`${API_BASE}/actions/upload_profile_image.php`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });
            const data = await response.json();
            
            if (data.success) {
                showToast('Profile image updated successfully', 'success');
                saveBtn.classList.add('hidden');
                selectedImageFile = null;
            } else {
                showToast(data.error || 'Upload failed', 'error');
            }
        } catch (err) {
            showToast('Network error during upload', 'error');
        } finally {
            setLoadingState(saveBtn, false, 'Save Image');
        }
    });
}

function setupDarkModeToggle() {
    const toggle = document.getElementById('dark-mode-toggle');

    if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        toggle.checked = true;
    }

    toggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    });
}

function openDeleteAccountModal() {
    document.getElementById('delete-account-modal').classList.remove('hidden');
}

function closeDeleteAccountModal() {
    document.getElementById('delete-account-modal').classList.add('hidden');
}

async function confirmDeleteAccount() {
    const btn = document.getElementById('btn-confirm-delete');
    setLoadingState(btn, true);

    try {
        const response = await fetch(`${API_BASE}/actions/delete_account.php`, {
            method: 'POST',
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            showToast('Account deleted. We are sorry to see you go.', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } else {
            showToast(data.error || 'Failed to delete account.', 'error');
            setLoadingState(btn, false);
            closeDeleteAccountModal();
        }
    } catch (error) {
        console.error('Delete account error:', error);
        showToast('Network error. Please try again.', 'error');
        setLoadingState(btn, false);
        closeDeleteAccountModal();
    }
}

