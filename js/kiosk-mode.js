// js/kiosk-mode.js
const KioskMode = {
  container: null,
  iframe: null,
  welcomeScreen: null,
  retryOverlay: null,
  errorScreen: null,
  currentWebappId: null,
  retryInterval: null,
  retryAttempts: 0,

  init(container) {
    this.container = container;
    this.iframe = document.getElementById('webapp-frame');
    this.welcomeScreen = document.getElementById('welcome-screen');
    this.retryOverlay = document.getElementById('retry-overlay');
    this.errorScreen = document.getElementById('error-screen');

    // Setup iframe error handler
    this.iframe.addEventListener('error', () => {
      this._showRetryOverlay();
      this._startAutoRetry();
    });

    // Stop retry on successful load
    this.iframe.addEventListener('load', () => {
      this._hideRetryOverlay();
    });

    // Initial load
    const defaultId = Storage.getDefaultWebappId();
    if (defaultId) {
      const webapps = Storage.loadWebapps();
      const webapp = webapps.find(w => w.id === defaultId);
      if (webapp) {
        this.loadWebapp(defaultId);
      } else {
        this.showWelcome();
      }
    } else {
      this.showWelcome();
    }
  },

  loadWebapp(webappId) {
    const webapps = Storage.loadWebapps();
    const webapp = webapps.find(w => w.id === webappId);

    if (!webapp) {
      console.error('Webapp not found:', webappId);
      this.showWelcome();
      return;
    }

    this.currentWebappId = webappId;

    // Hide everything
    this.welcomeScreen.classList.add('hidden');
    this.errorScreen.classList.add('hidden');
    this._hideRetryOverlay();

    // Load webapp
    this.iframe.src = webapp.url;
    this.iframe.classList.remove('hidden');
  },

  showWelcome() {
    this.currentWebappId = null;
    this.iframe.classList.add('hidden');
    this.iframe.src = '';
    this.errorScreen.classList.add('hidden');
    this._hideRetryOverlay();
    this.welcomeScreen.classList.remove('hidden');
  },

  hide() {
    this.container.classList.add('hidden');
  },

  show() {
    this.container.classList.remove('hidden');
  },

  _showRetryOverlay() {
    this.retryOverlay.classList.remove('hidden');
  },

  _hideRetryOverlay() {
    this.retryOverlay.classList.add('hidden');
    this._stopAutoRetry();
  },

  _startAutoRetry() {
    const settings = Storage.getSettings();
    if (!settings.autoRetryEnabled) {
      this._showError();
      return;
    }

    // Stop existing retry before starting new one
    this._stopAutoRetry();

    this.retryAttempts = 0;

    this.retryInterval = setInterval(() => {
      this.retryAttempts++;

      const retryCount = document.getElementById('retry-count');
      retryCount.textContent = `재시도 중... (${this.retryAttempts}/${settings.retryMaxAttempts})`;

      // Reload current webapp
      if (this.currentWebappId) {
        const webapps = Storage.loadWebapps();
        const webapp = webapps.find(w => w.id === this.currentWebappId);
        if (webapp) {
          this.iframe.src = webapp.url;
        }
      } else {
        // Reload default
        const defaultId = Storage.getDefaultWebappId();
        if (defaultId) {
          this.loadWebapp(defaultId);
        }
      }

      // Check max attempts
      if (this.retryAttempts >= settings.retryMaxAttempts) {
        this._stopAutoRetry();
        this._showError();
      }
    }, settings.retryInterval);
  },

  _stopAutoRetry() {
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
    }
    this.retryAttempts = 0;
  },

  _showError() {
    this._hideRetryOverlay();
    this.iframe.classList.add('hidden');
    this.errorScreen.classList.remove('hidden');
  }
};
