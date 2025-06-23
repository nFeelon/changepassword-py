document.addEventListener('DOMContentLoaded', function() {
    checkAuthAndLoadUserData();

    const changePasswordButton = document.getElementById('change-button');
    if (changePasswordButton) {
        changePasswordButton.addEventListener('click', function() {
            window.location.href = 'change_password.html';
        });
    }

    const ratingButton = document.getElementById('rating-button');
    if (ratingButton) {
        ratingButton.addEventListener('click', function() {
            window.location.href = 'rating.html';
        });
    }

    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            handleLogout();
        });
    }
    
    const messageForm = document.querySelector('.message-form');
    if (messageForm) {
        messageForm.addEventListener('submit', function(e) {
            e.preventDefault();
            addWallPost();
        });
    }

    const clearMessageButton = document.querySelector('.message-form .clear-input');
    if (clearMessageButton) {
        clearMessageButton.addEventListener('click', function() {
            const messageInput = document.getElementById('message');
            if (messageInput) {
                messageInput.value = '';
            }
        });
    }

    const sortSelect = document.getElementById('sort-messages');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            applyFiltersAndSort();
        });
    }

    const searchInput = document.getElementById('message-search');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            applyFiltersAndSort();
        });
    }

    const searchClearButton = document.getElementById('search-clear');
    if (searchClearButton) {
        searchClearButton.addEventListener('click', function() {
            const searchInput = document.getElementById('message-search');
            if (searchInput) {
                searchInput.value = '';
                applyFiltersAndSort();
            }
        });
    }
});

function checkAuthAndLoadUserData() {
    if (redirectIfNotAuthenticated()) {
        return;
    }

    const user = getUserData();
    if (user) {
        displayUserData(user);
        loadUserDataFromServer(user.username);
    }
}

function displayUserData(user) {
    const usernameElement = document.getElementById('username-value');
    if (usernameElement) {
        usernameElement.textContent = user.username || 'Неизвестно';
    }

    const changesCountElement = document.getElementById('changes-count');
    if (changesCountElement) {
        changesCountElement.textContent = user.passwordChanges !== undefined ? user.passwordChanges : '0';
    }

    const lastChangeDateElement = document.getElementById('last-change-date');
    if (lastChangeDateElement) {
        lastChangeDateElement.textContent = user.lastChangeDate || '-';
    }

    const regDateElement = document.getElementById('reg-date');
    if (regDateElement) {
        regDateElement.textContent = user.registrationDate || '-';
    }
}

function loadUserDataFromServer(username) {
    fetch(`/api/user/${username}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const changesCountElement = document.getElementById('changes-count');
            if (changesCountElement && data.user.passwordChanges) {
                changesCountElement.textContent = data.user.passwordChanges;
            }
            
            loadWallPosts();
            
            const lastChangeDateElement = document.getElementById('last-change-date');
            if (lastChangeDateElement && data.user.lastChangeDate) {
                const date = new Date(data.user.lastChangeDate);
                lastChangeDateElement.textContent = `${date.toLocaleString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`;
            }
            
            const regDateElement = document.getElementById('reg-date');
            if (regDateElement && data.user.registrationDate) {
                const date = new Date(data.user.registrationDate);
                regDateElement.textContent = `${date.toLocaleString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`;
            }
            
            const userData = localStorage.getItem('user');
            if (userData) {
                try {
                    const user = JSON.parse(userData);
                    user.passwordChanges = data.user.passwordChanges || user.passwordChanges;
                    user.lastChangeDate = data.user.lastChangeDate || user.lastChangeDate;
                    user.registrationDate = data.user.registrationDate || user.registrationDate;

                    localStorage.setItem('user', JSON.stringify(user));
                } catch (error) {
                    console.error('Ошибка при обновлении данных пользователя:', error);
                }
            }
        }
    })
    .catch(error => {
        console.error('Ошибка при загрузке данных пользователя:', error);
    });
}

function handleLogout() {
    logout('index.html');
}

async function fetchWithAuth(url, options = {}, errorContainer = null) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'same-origin'
    };
    
    const fetchOptions = { ...defaultOptions, ...options };
    if (options.headers) {
        fetchOptions.headers = { ...defaultOptions.headers, ...options.headers };
    }
    
    try {
        const response = await fetch(url, fetchOptions);
        
        if (response.status === 401) {
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            throw new Error('Необходимо авторизоваться');
        } else if (response.status === 403) {
            if (errorContainer) {
                errorContainer.innerHTML = '<div class="error">Несоответствие данных пользователя.</div>';
            }
            throw new Error('Доступ запрещен');
        }
        
        return await response.json();
    } catch (error) {
        throw error;
    }
}

async function loadWallPosts() {
    if (redirectIfNotAuthenticated()) {
        return;
    }
    
    const messageWall = document.querySelector('.message-wall');
    if (messageWall) {
        messageWall.innerHTML = '<div class="loading">Загрузка сообщений...</div>';
    }

    const username = getUsername();
    if (!username) {
        if (messageWall) {
            messageWall.innerHTML = '<div class="error">Не удалось получить имя пользователя</div>';
        }
        return;
    }
    
    try {
        const userData = await fetchWithAuth(`/api/user_id/${username}`, { method: 'GET' }, messageWall);
        
        if (userData.success && userData.user_id) {
            await loadUserWallPosts(userData.user_id);
        } else {
            if (messageWall) {
                messageWall.innerHTML = `<div class="error">${userData.message || 'Не удалось загрузить сообщения. Возможно, вы не авторизованы.'}</div>`;
            }
        }
    } catch (error) {
        console.error('Ошибка при загрузке сообщений:', error);
        if (error.message !== 'Необходимо авторизоваться' && error.message !== 'Доступ запрещен' && messageWall) {
            messageWall.innerHTML = '<div class="error">Произошла ошибка при загрузке сообщений.</div>';
        }
    }
}

async function loadUserWallPosts(userId) {
    const messageWall = document.querySelector('.message-wall');
    
    try {
        const sortType = document.getElementById('sort-messages')?.value || 'new-first';
        const searchQuery = document.getElementById('message-search')?.value.trim() || '';

        let url = `/api/wall_posts/${userId}?sort=${sortType}`;
        if (searchQuery) {
            url += `&search=${encodeURIComponent(searchQuery)}`;
        }

        const data = await fetchWithAuth(url, { method: 'GET' }, messageWall);
        
        if (data.success && data.posts) {
            allWallPosts = data.posts;
            
            if (data.posts.length === 0) {
                messageWall.innerHTML = '<div class="no-messages">У вас пока нет сообщений. Добавьте первое!</div>';
                return;
            }

            displayWallPosts(allWallPosts);
        } else {
            messageWall.innerHTML = `<div class="error">${data.message || 'Не удалось загрузить сообщения'}</div>`;
        }
    } catch (error) {
        console.error('Ошибка при загрузке сообщений:', error);
        if (error.message !== 'Необходимо авторизоваться' && error.message !== 'Доступ запрещен' && messageWall) {
            messageWall.innerHTML = '<div class="error">Произошла ошибка при загрузке сообщений</div>';
        }
    }
}

let allWallPosts = [];

async function applyFiltersAndSort() {
    const username = getUsername();
    if (!username) {
        return;
    }
    
    try {
        const userData = await fetchWithAuth(`/api/user_id/${username}`, { method: 'GET' });
        
        if (userData.success && userData.user_id) {
            await loadUserWallPosts(userData.user_id);
        }
    } catch (error) {
        console.error('Ошибка при применении фильтров:', error);
    }
}

function displayWallPosts(posts) {
    const messageWall = document.querySelector('.message-wall');
    if (!messageWall) return;
    
    if (!posts || posts.length === 0) {
        messageWall.innerHTML = '<div class="no-data">Сообщений не найдено</div>';
        return;
    }

    messageWall.innerHTML = '';

    posts.forEach(post => {
        const postDate = new Date(post.post_date);
        const formattedDate = postDate.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const messageElement = document.createElement('div');
        messageElement.className = 'message';
        messageElement.dataset.postId = post.post_id;
        
        messageElement.innerHTML = `
            <div class="message-header">
                <span class="message-date">${formattedDate}</span>
                <button class="delete-message" title="Удалить сообщение">
                    <img src="img/close_input.png" alt="Удалить">
                </button>
            </div>
            <div class="message-text">${post.content}</div>
        `;

        const deleteButton = messageElement.querySelector('.delete-message');
        if (deleteButton) {
            deleteButton.addEventListener('click', function() {
                deleteWallPost(post.post_id);
            });
        }

        messageWall.appendChild(messageElement);
    });
}

async function addWallPost() {
    const messageInput = document.getElementById('message');
    if (!messageInput) return;
    
    const content = messageInput.value.trim();
    if (!content) {
        alert('Сообщение не может быть пустым');
        return;
    }

    if (content.length > 100) {
        alert('Сообщение не может быть более 100 символов!');
        return;
    }

    const messageWall = document.querySelector('.message-wall');
    if (messageWall) {
        messageWall.innerHTML = '<div class="loading">Отправка сообщения...</div>';
    }
    
    try {
        const data = await fetchWithAuth('/api/wall_posts', {
            method: 'POST',
            body: JSON.stringify({ content })
        }, messageWall);
        
        if (data.success) {
            messageInput.value = '';

            if (data.post) {
                allWallPosts.push(data.post);

                applyFiltersAndSort();
            } else {
                await loadWallPosts();
            }
        } else {
            if (messageWall) {
                messageWall.innerHTML = `<div class="error">${data.message || 'Ошибка при добавлении сообщения'}</div>`;
            } else {
                alert(data.message || 'Ошибка при добавлении сообщения');
            }
        }
    } catch (error) {
        console.error('Ошибка при добавлении сообщения:', error);
        if (error.message !== 'Необходимо авторизоваться' && error.message !== 'Доступ запрещен' && messageWall) {
            messageWall.innerHTML = '<div class="error">Произошла ошибка при добавлении сообщения. Пожалуйста, попробуйте еще раз.</div>';
        }
    }
}

async function deleteWallPost(postId) {
    if (!confirm('Вы уверены, что хотите удалить это сообщение?')) {
        return;
    }

    const messageWall = document.querySelector('.message-wall');
    if (messageWall) {
        messageWall.innerHTML = '<div class="loading">Удаление сообщения...</div>';
    }
    
    try {
        const data = await fetchWithAuth(`/api/wall_posts/${postId}`, { method: 'DELETE' }, messageWall);
        
        if (data.success) {
            allWallPosts = allWallPosts.filter(post => post.post_id !== postId);

            applyFiltersAndSort();
        } else {
            if (messageWall) {
                messageWall.innerHTML = `<div class="error">${data.message || 'Ошибка при удалении сообщения'}</div>`;
            } else {
                alert(data.message || 'Ошибка при удалении сообщения');
            }
        }
    } catch (error) {
        console.error('Ошибка при удалении сообщения:', error);
        if (error.message !== 'Необходимо авторизоваться' && error.message !== 'Доступ запрещен' && messageWall) {
            messageWall.innerHTML = '<div class="error">Произошла ошибка при удалении сообщения. Пожалуйста, попробуйте еще раз.</div>';
        }
    }
}