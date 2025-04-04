document.addEventListener('DOMContentLoaded', function() {
    // Кнопка смены пароля
    const changePasswordButton = document.getElementById('change-button');
    changePasswordButton.addEventListener('click', function() {
        window.location.href = 'change_password.html';
    });

    // Кнопка просмотра рейтинга
    const ratingButton = document.getElementById('rating-button');
    ratingButton.addEventListener('click', function() {
        window.location.href = 'rating.html';
    });

    // Кнопка выхода
    const logoutButton = document.getElementById('logout-button');
    logoutButton.addEventListener('click', function() {
        window.location.href = 'index.html';
    });
}); 