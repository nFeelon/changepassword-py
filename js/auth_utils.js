const USER_STORAGE_KEY = 'user';

function isUserLoggedIn() {
    return localStorage.getItem(USER_STORAGE_KEY) !== null;
}

function isAuthenticated() {
    try {
        const user = getUserData();
        return user && user.isAuthenticated === true;
    } catch {
        return false;
    }
}

function getUserData() {
    const userData = localStorage.getItem(USER_STORAGE_KEY);
    if (!userData) {
        return null;
    }
    
    try {
        return JSON.parse(userData);
    } catch {
        localStorage.removeItem(USER_STORAGE_KEY);
        return null;
    }
}

function getUsername() {
    const user = getUserData();
    return user ? user.username : null;
}

function saveUserData(userData) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
}

function validateUsername(username) {
    if (!username || username.trim() === '') {
        return {
            isValid: false,
            message: 'Имя пользователя не может быть пустым'
        };
    }
    
    if (username.includes(' ')) {
        return {
            isValid: false,
            message: 'Имя пользователя не должно содержать пробелы'
        };
    }
    
    if (username.length > 20) {
        return {
            isValid: false,
            message: 'Имя пользователя не должно превышать 20 символов'
        };
    }
    
    // Проверка на допустимые символы (только буквы и цифры)
    const validCharsRegex = /^[a-zA-Z0-9а-яА-ЯёЁ]+$/;
    if (!validCharsRegex.test(username)) {
        return {
            isValid: false,
            message: 'Имя пользователя должно содержать только буквы и цифры'
        };
    }
    
    return {
        isValid: true,
        message: ''
    };
}

function updateUserData(newData) {
    const userData = getUserData();
    if (!userData) {
        return false;
    }
    
    const updatedData = { ...userData, ...newData };
    saveUserData(updatedData);
    return true;
}

function logout(redirectUrl = 'index.html') {
    fetch('/api/logout', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .finally(() => {
        localStorage.removeItem(USER_STORAGE_KEY);
        window.location.href = redirectUrl;
    })
}

function redirectIfNotAuthenticated(loginPage = 'login.html') {
    if (!isUserLoggedIn()) {
        window.location.href = loginPage;
        return true;
    }
    return false;
}

function updatePasswordChangeCount(username, passwordChanges, lastChangeDate) {
    const userData = getUserData();
    if (!userData || userData.username !== username) {
        return false;
    }
    
    const newPasswordChanges = passwordChanges !== undefined 
        ? Number(passwordChanges) 
        : (Number(userData.passwordChanges) || 0) + 1;
    
    const newLastChangeDate = lastChangeDate || new Date().toLocaleDateString('ru-RU');
    
    return updateUserData({
        passwordChanges: newPasswordChanges,
        lastChangeDate: newLastChangeDate
    });
}
