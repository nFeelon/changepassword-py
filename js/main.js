const PAGES = {
    login: 'login.html',
    register: 'register.html',
    changePassword: 'change_password.html',
    rating: 'rating.html',
    profile: 'profile.html',
    index: 'index.html'
};

document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();

    document.body.addEventListener('click', handleNavigation);
});

function handleNavigation(event) {
    const button = event.target.closest('button');
    if (!button) return;
    
    switch (button.id) {
        case 'login-button':
            navigateTo(PAGES.login);
            break;
        case 'register-button':
            navigateTo(PAGES.register);
            break;
        case 'change-password-button':
        case 'change-password-button-auth':
            navigateTo(PAGES.changePassword);
            break;
        case 'rating-button':
        case 'rating-button-auth':
            navigateTo(PAGES.rating);
            break;
        case 'profile-button':
            navigateTo(PAGES.profile);
            break;
        case 'logout-button':
            handleLogout();
            break;
        case 'back-button':
            navigateTo(PAGES.index);
            break;
    }
}

function checkAuthStatus() {
    const guestActions = document.getElementById('guest-actions');
    const userActions = document.getElementById('user-actions');
    
    if (!guestActions || !userActions) return;
    
    const isLoggedIn = isUserLoggedIn();

    guestActions.style.display = isLoggedIn ? 'none' : 'flex';
    userActions.style.display = isLoggedIn ? 'flex' : 'none';

    if (isLoggedIn) {
        updateUserInfo();
    }
}

function updateUserInfo() {
    const userData = getUserData();
    if (!userData) return;

    const usernameElement = document.getElementById('username-display');
    if (usernameElement && userData.username) {
        usernameElement.textContent = userData.username;
    }
}

function navigateTo(url) {
    if (url) window.location.href = url;
}

function handleLogout() {
    logout(PAGES.index);
}