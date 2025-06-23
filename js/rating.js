document.addEventListener('DOMContentLoaded', function() {
    const backButton = document.getElementById('back-button');
    backButton.addEventListener('click', function() {
        const userData = localStorage.getItem('user');
        if (userData) {
            window.location.href = 'profile.html';
        } else {
            window.location.href = 'index.html';
        }
    });

    loadRating();
});

function loadRating() {
    const ratingList = document.getElementById('rating-list');
    const userPosition = document.getElementById('user-position');

    ratingList.innerHTML = '<div class="loading">Загрузка рейтинга...</div>';
    
    fetch('/api/rating', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.rating) {
            ratingList.innerHTML = '';
            
            if (data.rating.top_users && data.rating.top_users.length > 0) {
                const table = document.createElement('table');
                table.className = 'rating-table';
                
                const thead = document.createElement('thead');
                const headerRow = document.createElement('tr');
                
                const positionHeader = document.createElement('th');
                positionHeader.textContent = 'Место';
                headerRow.appendChild(positionHeader);
                
                const usernameHeader = document.createElement('th');
                usernameHeader.textContent = 'Пользователь';
                headerRow.appendChild(usernameHeader);
                
                const changesHeader = document.createElement('th');
                changesHeader.textContent = 'Кол-во смен пароля';
                headerRow.appendChild(changesHeader);
                
                thead.appendChild(headerRow);
                table.appendChild(thead);

                const tbody = document.createElement('tbody');
                
                data.rating.top_users.forEach(user => {
                    const row = document.createElement('tr');

                    const isCurrentUser = isUserLoggedIn() && JSON.parse(localStorage.getItem('user')).username === user.username;
                    if (isCurrentUser) {
                        row.className = 'current-user';
                    }
                    
                    const positionCell = document.createElement('td');
                    positionCell.textContent = user.position;
                    row.appendChild(positionCell);
                    
                    const usernameCell = document.createElement('td');
                    usernameCell.textContent = user.username;
                    row.appendChild(usernameCell);
                    
                    const changesCell = document.createElement('td');
                    changesCell.textContent = formatPasswordChanges(user.password_changes);
                    row.appendChild(changesCell);
                    
                    tbody.appendChild(row);
                });
                
                table.appendChild(tbody);
                ratingList.appendChild(table);
            } else {
                ratingList.innerHTML = '<div class="no-data">Нет данных о пользователях</div>';
            }

            if (data.rating.current_user) {
                userPosition.innerHTML = `
                    <div class="user-rating">
                        <p>Ваша позиция в рейтинге: <strong>${data.rating.current_user.position}</strong></p>
                        <p>Количество смен пароля: <strong>${formatPasswordChanges(data.rating.current_user.password_changes)}</strong></p>
                    </div>
                `;
            } else {
                userPosition.innerHTML = '';
            }
        } else {
            ratingList.innerHTML = '<div class="error">Ошибка при загрузке рейтинга</div>';
        }
    })
    .catch(error => {
        console.error('Ошибка при загрузке рейтинга:', error);
        ratingList.innerHTML = '<div class="error">Ошибка при загрузке рейтинга</div>';
    });
}

function isUserLoggedIn() {
    return isAuthenticated();
}

function formatPasswordChanges(count) {
    count = parseInt(count) || 0;
    
    if (count === 0) {
        return '0 раз';
    } else if (count === 1) {
        return '1 раз';
    } else if (count >= 2 && count <= 4) {
        return `${count} раза`;
    } else {
        return `${count} раз`;
    }
}