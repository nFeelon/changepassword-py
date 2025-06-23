function debounce(func, wait = 300) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function checkPasswordRequirements(password) {
    if (typeof validatePassword === 'function') {
        const validationResults = validatePassword(password);
        updatePasswordRequirements(validationResults);
        return validationResults.every(result => result.valid);
    }
    return false;
}

function updatePasswordRequirements(validationResults) {
    const requirements = document.querySelectorAll('.requirement');
    if (!requirements.length) return;
    
    validationResults.forEach((result, index) => {
        if (index < requirements.length) {
            const requirement = requirements[index];
            requirement.classList.toggle('valid', result.valid);
            requirement.classList.toggle('invalid', !result.valid);
        }
    });
}

function resetRequirements() {
    const requirements = document.querySelectorAll('.requirement');
    requirements.forEach(req => {
        req.classList.remove('valid');
        req.classList.add('invalid');
    });
}

function updateSimilarUsers(users) {
    const similarUsersContainer = document.querySelector('.similar-users');
    if (similarUsersContainer) {
        if (users.length > 0) {
            similarUsersContainer.textContent = users.join(', ');
        } else {
            similarUsersContainer.textContent = 'Пользователей с таким паролем не найдено';
        }
    }
}

const fetchSimilarUsers = debounce(function(password) {
    if (password.length < 3) {
        updateSimilarUsers([]);
        return;
    }
    
    fetch('/api/similar_password_users', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            password: password
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            updateSimilarUsers(data.users);
        }
    })
    .catch(error => {
        console.error('Ошибка при получении похожих пользователей:', error);
    });
}, 500);

function setupPasswordValidation(passwordInputId) {
    const passwordInput = document.getElementById(passwordInputId);
    if (!passwordInput) return;

    const debouncedCheck = debounce(function(password) {
        if (password.length > 0) {
            checkPasswordRequirements(password);
        } else {
            resetRequirements();
        }
    }, 150);

    passwordInput.addEventListener('input', function() {
        const password = this.value;

        debouncedCheck(password);
        fetchSimilarUsers(password);

        if (password.length === 0) {
            updateSimilarUsers([]);
        }
    });

    resetRequirements();
}
