// js/app.js
const App = {
  hiddenTouchDetector: null,

  init() {
    // Initialize storage (no-op, just verify)
    console.log('Storage initialized');

    // Initialize kiosk mode
    KioskMode.init(document.getElementById('kiosk-container'));

    // Initialize admin mode
    AdminMode.init(document.getElementById('admin-container'));

    // Setup hidden touch detector
    const hiddenTouchConfig = Storage.getHiddenTouchConfig();
    this.hiddenTouchDetector = new HiddenTouchDetector(
      hiddenTouchConfig,
      () => this.switchToAdminMode()
    );
    this.hiddenTouchDetector.attachTo(document.body);

    // Prevent iOS gestures
    HiddenTouchDetector.preventIOSGestures();

    console.log('App initialized');
  },

  switchToAdminMode() {
    KioskMode.hide();
    AdminMode.show();
  },

  switchToKioskMode(webappId = null) {
    AdminMode.hide();

    if (webappId) {
      KioskMode.loadWebapp(webappId);
    }

    KioskMode.show();

    // Update hidden touch config (in case it changed)
    const config = Storage.getHiddenTouchConfig();
    this.hiddenTouchDetector.updateConfig(config);
  }
};

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
