const SIMILAR_USERS_CONTAINER_ID = 'similar-users';
const API_SIMILAR_USERS = '/api/similar_password_users';
const DEBOUNCE_DELAY = 500;
const MIN_PASSWORD_LENGTH = 3;

const MESSAGES = {
    empty: 'Введите пароль для проверки...',
    loading: '<div class="loading">Проверка...</div>',
    notFound: 'Пользователей с таким паролем не найдено',
    error: 'Ошибка при проверке пароля',
    tooShort: 'Введите больше символов для проверки...'
};

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

async function checkSimilarUsers(password) {
    const similarUsersContainer = document.getElementById(SIMILAR_USERS_CONTAINER_ID);
    if (!similarUsersContainer) return;

    similarUsersContainer.classList.remove('has-similar');

    if (!password || password.length === 0) {
        similarUsersContainer.innerHTML = MESSAGES.empty;
        return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
        similarUsersContainer.innerHTML = MESSAGES.tooShort;
        return;
    }

    similarUsersContainer.innerHTML = MESSAGES.loading;
    
    try {
        const response = await fetch(API_SIMILAR_USERS, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            if (data.users && data.users.length > 0) {
                similarUsersContainer.textContent = data.users.join(', ');
                similarUsersContainer.classList.add('has-similar');
            } else {
                similarUsersContainer.textContent = MESSAGES.notFound;
            }
        } else {
            similarUsersContainer.textContent = data.message || MESSAGES.error;
        }
    } catch {
        similarUsersContainer.textContent = MESSAGES.error;
    }
}

function setupSimilarUsersCheck(passwordInputId) {
    const passwordInput = document.getElementById(passwordInputId);
    if (!passwordInput) return;

    const similarUsersContainer = document.getElementById(SIMILAR_USERS_CONTAINER_ID);
    if (similarUsersContainer) {
        similarUsersContainer.textContent = MESSAGES.empty;
    }

    const debouncedCheck = debounce(checkSimilarUsers, DEBOUNCE_DELAY);

    passwordInput.addEventListener('input', function() {
        debouncedCheck(this.value);
    });
}
