document.addEventListener('DOMContentLoaded', function() {
    // Кнопка входа в аккаунт
    const loginButton = document.getElementById('login-button');
    loginButton.addEventListener('click', function() {
        window.location.href = 'login.html';
    });

    // Кнопка регистрации
    const registerButton = document.getElementById('register-button');
    registerButton.addEventListener('click', function() {
        window.location.href = 'register.html';
    });

    // Кнопка смены пароля
    const changePasswordButton = document.getElementById('change-password-button');
    changePasswordButton.addEventListener('click', function() {
        window.location.href = 'change_password.html';
    });

    // Кнопка просмотра рейтинга
    const ratingButton = document.getElementById('rating-button');
    ratingButton.addEventListener('click', function() {
        window.location.href = 'rating.html';
    });
}); 