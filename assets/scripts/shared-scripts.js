// assets/scripts/common.js






function showNotification(message, type = 'success') {
    const existingNotification = document.getElementById('notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.id = 'notification';
    notification.className = type;
    notification.innerHTML = `
        <p>${message}</p>
        <button class="close-btn">&times;</button>
    `;

    notification.querySelector('.close-btn').onclick = () => notification.remove();

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 5000);
}

function showConfirmDialog(message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.id = 'overlay';
    
    const dialog = document.createElement('div');
    dialog.id = 'confirm-dialog';
    dialog.innerHTML = `
        <h2>Bestätigung</h2>
        <p>${message}</p>
        <div class="button-container">
            <button class="cancel">Abbrechen</button>
            <button class="confirm">Löschen</button>
        </div>
    `;
    
    dialog.querySelector('.confirm').onclick = () => {
        onConfirm();
        removeConfirmDialog();
    };
    
    dialog.querySelector('.cancel').onclick = removeConfirmDialog;
    
    document.body.appendChild(overlay);
    document.body.appendChild(dialog);
}

function removeConfirmDialog() {
    const overlay = document.getElementById('overlay');
    const dialog = document.getElementById('confirm-dialog');
    if (overlay) overlay.remove();
    if (dialog) dialog.remove();
}