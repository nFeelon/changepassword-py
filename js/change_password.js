document.addEventListener('DOMContentLoaded', function() {
    const clearButtons = document.querySelectorAll('.clear-input');
    clearButtons.forEach(button => {
        button.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            input.value = '';
            
            if (input.id === 'new-password') {
                checkSimilarUsers('');
            }
        });
    });
    
    setupSimilarUsersCheck('new-password');

    const authForm = document.querySelector('.auth-form');
    authForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const oldPassword = document.getElementById('old-password').value;
        const newPassword = document.getElementById('new-password').value;
        
        if (!username || !oldPassword || !newPassword) {
            showMessage(authForm, 'Пожалуйста, заполните все поля', 'error');
            return;
        }

        showMessage(authForm, 'Отправка данных...', 'info');

        fetch('/api/change_password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                old_password: oldPassword,
                new_password: newPassword
            })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(errorData => {
                    showMessage(authForm, errorData.message || 'Ошибка при смене пароля', 'error');
                    return { success: false };
                });
            }
            return response.json();
        })
        .then(data => {
            if (!data.success) {
                return;
            }
            if (data.success) {
                showMessage(authForm, 'Пароль успешно изменен!', 'success');
                updatePasswordChangeCount(username, data.passwordChanges, data.lastChangeDate);

                setTimeout(() => {
                    window.location.href = 'profile.html';
                }, 1000);
            } else {
                showMessage(authForm, data.message || 'Ошибка при смене пароля', 'error');
            }
        })
        .catch(() => {
            showMessage(authForm, 'Произошла ошибка при смене пароля', 'error');
        });
    });

    setupPasswordValidation('new-password');
});
