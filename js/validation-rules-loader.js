const API_VALIDATION_RULES = '/api/validation_rules';
const REQUIREMENT_CLASS = 'requirement';

let validationRules = [];

async function loadValidationRules() {
    try {
        const response = await fetch(API_VALIDATION_RULES);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && Array.isArray(data.rules)) {
            validationRules = data.rules;
            updateValidationRulesDisplay();
            
            return validationRules;
        } else {
            console.error('Ошибка при загрузке правил валидации:', data.message || 'Неизвестная ошибка');
        }
    } catch (error) {
        console.error('Ошибка при загрузке правил валидации:', error);
    }
    
    return [];
}

function updateValidationRulesDisplay() {
    const requirementsList = document.querySelector('.requirements-list');
    if (requirementsList) {
        const fragment = document.createDocumentFragment();
        
        validationRules.forEach(rule => {
            const li = document.createElement('li');
            li.className = REQUIREMENT_CLASS;
            li.textContent = rule.name;
            fragment.appendChild(li);
        });
        
        requirementsList.innerHTML = '';
        requirementsList.appendChild(fragment);
    }
    
    const validationRulesText = document.getElementById('validation-rules-text');
    if (validationRulesText) {
        const rulesHtml = [
            'Требования к паролю:',
            ...validationRules.map(rule => `<br>• ${rule.name}`)
        ].join('');
        
        validationRulesText.innerHTML = rulesHtml;
    }
}

const validationFunctions = {
    // Проверка на количество цифр
    0: (password, value) => {
        const digitCount = (password.match(/\d/g) || []).length;
        return digitCount >= value;
    },
    
    // Проверка на сумму цифр
    1: (password, value) => {
        let digitSum = 0;
        for (let i = 0; i < password.length; i++) {
            const digit = parseInt(password[i]);
            if (!isNaN(digit)) digitSum += digit;
        }
        return digitSum === value;
    },
    
    // Проверка на включение текущего года
    2: (password, value) => password.includes(value),
    
    // Проверка на включение элемента из списка
    3: (password, value) => {
        if (!Array.isArray(value)) return false;
        const passwordLower = password.toLowerCase();
        return value.some(item => passwordLower.includes(item.toLowerCase()));
    },
    
    // Проверка длины пароля
    4: (password, value) => {
        if (typeof value !== 'object') return false;
        
        const passwordLength = password.length;
        let isValid = true;
        
        // Проверка минимальной длины
        if (value.min !== undefined) {
            isValid = isValid && passwordLength >= value.min;
        }
        
        // Проверка максимальной длины
        if (value.max !== undefined) {
            isValid = isValid && passwordLength <= value.max;
        }
        
        return isValid;
    }
};

function validatePassword(password) {
    if (!password || typeof password !== 'string') {
        return [];
    }
    
    return validationRules.map(rule => {
        const validationFunction = validationFunctions[rule.type];
        const isValid = validationFunction ? validationFunction(password, rule.value) : false;
        
        return {
            id: rule.id,
            name: rule.name,
            valid: isValid
        };
    });
}

function updateValidationUI(password) {
    const requirements = document.querySelectorAll(`.${REQUIREMENT_CLASS}`);
    if (!requirements.length) return false;
    
    const validationResults = validatePassword(password);

    const maxIndex = Math.min(requirements.length, validationResults.length);
    
    for (let i = 0; i < maxIndex; i++) {
        updateRequirement(requirements[i], validationResults[i].valid);
    }
    
    return validationResults.every(result => result.valid);
}

function updateRequirement(requirementElement, isValid) {
    requirementElement.classList.toggle('valid', isValid);
    requirementElement.classList.toggle('invalid', !isValid);
}

document.addEventListener('DOMContentLoaded', () => {
    loadValidationRules().catch(error => {
        console.error('Ошибка при загрузке правил валидации:', error);
    });
});
