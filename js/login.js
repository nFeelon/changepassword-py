document.addEventListener('DOMContentLoaded', function() {
    // Кнопка регистрации
    const registerButton = document.getElementById('register-button');
    registerButton.addEventListener('click', function() {
        window.location.href = 'register.html';
    });

    // Кнопка смены пароля
    const changePasswordButton = document.getElementById('change-password-buttonS');
    changePasswordButton.addEventListener('click', function() {
        window.location.href = 'change_password.html';
    });

    // Форма авторизации
    const authForm = document.getElementById('login-button');
    authForm.addEventListener('submit', function(e) {
        e.preventDefault();
        window.location.href = 'profile.html';
    });
}); 