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
    this.hiddenTouchDetector.detach();
    KioskMode.hide();
    AdminMode.show();
  },

  switchToKioskMode(webappId = null) {
    AdminMode.hide();

    // Update hidden touch config and re-attach (before showing kiosk)
    const config = Storage.getHiddenTouchConfig();
    this.hiddenTouchDetector.updateConfig(config);
    this.hiddenTouchDetector.attachTo(document.body);

    if (webappId) {
      KioskMode.loadWebapp(webappId);
    }

    KioskMode.show();
  }
};

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
