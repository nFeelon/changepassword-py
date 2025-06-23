document.addEventListener('DOMContentLoaded', function() {
    document.body.addEventListener('click', function(event) {
        const closeButton = event.target.closest('.close-button');
        if (closeButton) {
            window.location.href = 'index.html';
        }
    });
});
