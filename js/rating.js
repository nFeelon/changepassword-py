document.addEventListener('DOMContentLoaded', function() {
    // Кнопка "Назад"
    const backButton = document.getElementById('back-button');
    backButton.addEventListener('click', function() {
        window.location.href = 'profile.html';
    });
}); 