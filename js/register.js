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

    const clearButtons = document.querySelectorAll('.clear-input');
    clearButtons.forEach(button => {
        button.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            input.value = '';
            
            if (input.id === 'password') {
                checkSimilarUsers('');
            }
        });
    });

    setupSimilarUsersCheck('password');

    const authForm = document.querySelector('.auth-form');
    authForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        if (!username || !password || !confirmPassword) {
            showMessage(authForm, 'Пожалуйста, заполните все поля', 'error');
            return;
        }

        const usernameValidation = validateUsername(username);
        if (!usernameValidation.isValid) {
            showMessage(authForm, usernameValidation.message, 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            showMessage(authForm, 'Пароли не совпадают', 'error');
            return;
        }

        showMessage(authForm, 'Отправка данных...', 'info');

        fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password,
                confirm_password: confirmPassword
            })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(errorData => {
                    return { success: false, message: errorData.message, status: response.status };
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                const userData = {
                    username: username,
                    isAuthenticated: true,
                    passwordChanges: data.passwordChanges || 0,
                    lastChangeDate: data.lastChangeDate || '-',
                    registrationDate: data.registrationDate || new Date().toLocaleDateString('ru-RU')
                };
                
                saveUserData(userData);
            
                showMessage(authForm, 'Регистрация успешна!', 'success');
                setTimeout(() => {
                    window.location.href = 'profile.html';
                }, 1000);
            } else {
                if (data.status === 409) {
                    showMessage(authForm, 'Пользователь с таким именем уже существует', 'error');
                } else {
                    showMessage(authForm, data.message || 'Ошибка при регистрации', 'error');
                }
            }
        })
        .catch(() => {
            showMessage(authForm, 'Ошибка сети при регистрации', 'error');
        });
    });

    setupPasswordValidation('password');
});
