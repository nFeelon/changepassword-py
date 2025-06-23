const MESSAGE_CONTAINER_CLASS = 'message-container';
const MESSAGE_TEXT_CLASS = 'message-text';
const SUCCESS_MESSAGE_TIMEOUT = 3000;
const ERROR_MESSAGE_TIMEOUT = null; // Не скрывать сообщения об ошибках автоматически

let messageTimer = null;

function showMessage(formElement, message, type = 'error') {
    if (!formElement || !message) return;

    const existingContainer = formElement.querySelector(`.${MESSAGE_CONTAINER_CLASS}`);
    const isErrorMessageShown = existingContainer && existingContainer.classList.contains('message-error');

    if (isErrorMessageShown && type !== 'error') {
        return existingContainer;
    }

    if (messageTimer) {
        clearTimeout(messageTimer);
        messageTimer = null;
    }

    let messageContainer = formElement.querySelector(`.${MESSAGE_CONTAINER_CLASS}`);

    if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.className = MESSAGE_CONTAINER_CLASS;
        formElement.appendChild(messageContainer);
    }

    const messageText = document.createElement('p');
    messageText.className = MESSAGE_TEXT_CLASS;
    messageText.textContent = message;

    messageContainer.className = MESSAGE_CONTAINER_CLASS;
    messageContainer.classList.add(`message-${type}`);

    messageContainer.innerHTML = '';
    messageContainer.appendChild(messageText);

    messageContainer.style.display = 'block';

    if (type === 'success') {
        messageTimer = setTimeout(() => {
            hideMessage(formElement);
        }, SUCCESS_MESSAGE_TIMEOUT);
    } else if (type === 'error' && ERROR_MESSAGE_TIMEOUT !== null) {
        messageTimer = setTimeout(() => {
            hideMessage(formElement);
        }, ERROR_MESSAGE_TIMEOUT);
    }
    
    return messageContainer;
}

function hideMessage(formElement) {
    if (!formElement) return;
    
    const messageContainer = formElement.querySelector(`.${MESSAGE_CONTAINER_CLASS}`);
    if (messageContainer) {
        messageContainer.style.opacity = '0';

        setTimeout(() => {
            messageContainer.style.display = 'none';
            messageContainer.style.opacity = '1';
        }, 300);
    }
}
