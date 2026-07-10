// js/app.js
document.addEventListener('DOMContentLoaded', () => {
  const kioskContainer = document.getElementById('kiosk-container');
  const adminContainer = document.getElementById('admin-container');

  if (kioskContainer) {
    KioskMode.init(kioskContainer);
  }

  if (adminContainer) {
    AdminMode.init(adminContainer);
  }
});
