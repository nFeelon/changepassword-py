const API_LOGIN = '/api/login';
const REDIRECT_DELAY = 1000;

const PAGES = {
    profile: 'profile.html',
    register: 'register.html',
    changePassword: 'change_password.html'
};

document.addEventListener('DOMContentLoaded', function() {
    if (isUserLoggedIn()) {
        window.location.href = PAGES.profile;
        return;
    }
    document.body.addEventListener('click', handleNavigation);
    document.body.addEventListener('click', function(event) {
        const clearButton = event.target.closest('.clear-input');
        if (clearButton) {
            const input = clearButton.parentElement.querySelector('input');
            if (input) {
                input.value = '';
                input.focus();
            }
        }
    });

    initLoginForm();
});

function handleNavigation(event) {
    const button = event.target.closest('button');
    if (!button) return;

    switch (button.id) {
        case 'register-button':
            window.location.href = PAGES.register;
            break;
        case 'change-password-button':
        case 'change-password-buttonS':
            window.location.href = PAGES.changePassword;
            break;
    }
}

function initLoginForm() {
    const authForm = document.querySelector('.auth-form');
    if (!authForm) return;
    
    authForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const username = document.getElementById('username')?.value.trim();
        const password = document.getElementById('password')?.value;
        const remember = document.getElementById('remember')?.checked || false;

        if (!username || !password) {
            showMessage(authForm, 'Пожалуйста, заполните все поля', 'error');
            return;
        }

        const usernameValidation = validateUsername(username);
        if (!usernameValidation.isValid) {
            showMessage(authForm, usernameValidation.message, 'error');
            return;
        }

        showMessage(authForm, 'Авторизация...', 'info');
        
        try {
            const response = await fetch(API_LOGIN, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password, remember })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                showMessage(authForm, errorData.message || 'Неправильный логин или пароль', 'error');
                return;
            }
            
            const data = await response.json();
            
            if (data.success) {
                handleSuccessfulLogin(authForm, username, data);
            } else {
                showMessage(authForm, data.message || 'Ошибка авторизации', 'error');
            }
        } catch {
            showMessage(authForm, 'Неправильный логин или пароль', 'error');
        }
    });
}

function handleSuccessfulLogin(form, username, data) {
    const userData = {
        username: username,
        isAuthenticated: true,

        passwordChanges: data.passwordChanges || 0,
        lastChangeDate: data.lastChangeDate || '-',
        registrationDate: data.registrationDate || new Date().toLocaleDateString('ru-RU')
    };

    saveUserData(userData);

    showMessage(form, 'Авторизация успешна!', 'success');

    setTimeout(() => {
        window.location.href = PAGES.profile;
    }, REDIRECT_DELAY);
}