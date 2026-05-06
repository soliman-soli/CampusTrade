/**
 * CampusTrade — Auth Page Logic (auth.js)
 *
 * Handles:
 *   - Tab switching between Login and Register forms (animated)
 *   - Real-time password match validation on the register form
 *   - Form submission with fetch() to the PHP auth endpoint
 *   - Button spinner states during API calls
 *   - Redirect on successful login/registration
 */

/**
 * Switches between the Login and Register tabs with animated transitions.
 * @param {'login'|'register'} tab - The tab to activate
 */
function switchTab(tab) {
    const loginForm = document.getElementById('form-login');
    const registerForm = document.getElementById('form-register');
    const loginTab = document.getElementById('tab-login');
    const registerTab = document.getElementById('tab-register');
    const indicator = document.getElementById('tab-indicator');

    if (tab === 'login') {

        loginForm.classList.remove('hidden');
        loginForm.classList.add('active');
        registerForm.classList.add('hidden');
        registerForm.classList.remove('active');

        loginTab.classList.add('text-indigo-600');
        loginTab.classList.remove('text-gray-400');
        registerTab.classList.add('text-gray-400');
        registerTab.classList.remove('text-indigo-600');

        indicator.style.left = '0%';
    } else {

        registerForm.classList.remove('hidden');
        registerForm.classList.add('active');
        loginForm.classList.add('hidden');
        loginForm.classList.remove('active');

        registerTab.classList.add('text-indigo-600');
        registerTab.classList.remove('text-gray-400');
        loginTab.classList.add('text-gray-400');
        loginTab.classList.remove('text-indigo-600');

        indicator.style.left = '50%';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const regPassword = document.getElementById('reg-password');
    const regConfirm = document.getElementById('reg-confirm');
    const matchMsg = document.getElementById('password-match-msg');

    /**
     * Checks if the password and confirm password fields match
     * and updates the visual indicator accordingly.
     */
    function checkPasswordMatch() {
        const password = regPassword.value;
        const confirm = regConfirm.value;

        if (confirm.length === 0) {
            matchMsg.classList.add('hidden');
            regConfirm.classList.remove('border-red-400', 'border-emerald-400');
            return;
        }

        matchMsg.classList.remove('hidden');

        if (password === confirm) {
            matchMsg.textContent = '✓ Passwords match';
            matchMsg.classList.remove('text-red-500');
            matchMsg.classList.add('text-emerald-500');
            regConfirm.classList.remove('border-red-400');
            regConfirm.classList.add('border-emerald-400');
        } else {
            matchMsg.textContent = '✗ Passwords do not match';
            matchMsg.classList.remove('text-emerald-500');
            matchMsg.classList.add('text-red-500');
            regConfirm.classList.remove('border-emerald-400');
            regConfirm.classList.add('border-red-400');
        }
    }

    regPassword.addEventListener('input', checkPasswordMatch);
    regConfirm.addEventListener('input', checkPasswordMatch);

    const loginForm = document.getElementById('form-login');
    const btnLogin = document.getElementById('btn-login');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
            showToast('Please fill in all fields.', 'error');
            return;
        }

        setLoadingState(btnLogin, true);

        try {

            const formData = new FormData();
            formData.append('action', 'login');
            formData.append('email', email);
            formData.append('password', password);

            const response = await fetch(`${API_BASE}/auth/auth.php`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            const data = await response.json();

            if (data.success) {

                window.location.href = data.redirect || 'dashboard.html';
            } else {
                showToast(data.error || 'Login failed. Please try again.', 'error');
                setLoadingState(btnLogin, false);
            }
        } catch (error) {
            console.error('Login error:', error);
            showToast('Network error. Please check your connection.', 'error');
            setLoadingState(btnLogin, false);
        }
    });

    const registerForm = document.getElementById('form-register');
    const btnRegister = document.getElementById('btn-register');

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fullName = document.getElementById('reg-name').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const phone = document.getElementById('reg-phone').value.trim();
        const password = document.getElementById('reg-password').value;
        const confirmPassword = document.getElementById('reg-confirm').value;

        if (!fullName || !email || !phone || !password || !confirmPassword) {
            showToast('Please fill in all fields.', 'error');
            return;
        }

        if (fullName.length < 2 || fullName.length > 100) {
            showToast('Full name must be between 2 and 100 characters.', 'error');
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showToast('Please enter a valid email address.', 'error');
            return;
        }

        if (!/^\d{10,15}$/.test(phone)) {
            showToast('Phone number must be 10 to 15 digits.', 'error');
            return;
        }

        if (password.length < 8) {
            showToast('Password must be at least 8 characters.', 'error');
            return;
        }

        if (password !== confirmPassword) {
            showToast('Passwords do not match.', 'error');
            return;
        }

        setLoadingState(btnRegister, true);

        try {
            const formData = new FormData();
            formData.append('action', 'register');
            formData.append('full_name', fullName);
            formData.append('email', email);
            formData.append('phone', phone);
            formData.append('password', password);
            formData.append('confirm_password', confirmPassword);

            const response = await fetch(`${API_BASE}/auth/auth.php`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                showToast(data.message || 'Registration successful!', 'success');
                setTimeout(() => {
                    window.location.href = data.redirect || 'dashboard.html';
                }, 500);
            } else {
                showToast(data.error || 'Registration failed. Please try again.', 'error');
                setLoadingState(btnRegister, false);
            }
        } catch (error) {
            console.error('Registration error:', error);
            showToast('Network error. Please check your connection.', 'error');
            setLoadingState(btnRegister, false);
        }
    });
});

