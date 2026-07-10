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
    this.blockScreen = document.getElementById('block-screen');

    // Setup iframe error handler
    this.iframe.addEventListener('error', () => {
      this._showRetryOverlay();
      this._startAutoRetry();
    });

    // Stop retry on successful load and check for blocking
    this.iframe.addEventListener('load', () => {
      this._hideRetryOverlay();
      this._checkIframeBlocking();
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
    this.hideBlockScreen();
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
    this.hideBlockScreen();
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
  },

  _checkIframeBlocking() {
    // Check if iframe might be blocked (X-Frame-Options, CSP)
    setTimeout(() => {
      try {
        // Try to access iframe content
        const iframeDoc = this.iframe.contentDocument || this.iframe.contentWindow.document;

        // If we can access but body is empty or very minimal, might be blocked
        if (!iframeDoc || !iframeDoc.body || iframeDoc.body.children.length === 0) {
          this._showBlockedMessage();
        }
      } catch (e) {
        // Cross-origin or blocked - show message
        if (e.name === 'SecurityError' || e.message.includes('cross-origin')) {
          // This is normal for cross-origin iframes, don't show error
          return;
        }
        this._showBlockedMessage();
      }
    }, 2000); // Wait 2 seconds for content to load
  },

  _showBlockedMessage() {
    const webapps = Storage.loadWebapps();
    const webapp = webapps.find(w => w.id === this.currentWebappId);

    if (webapp && this.blockScreen) {
      const siteNameEl = this.blockScreen.querySelector('#blocked-site-name');
      if (siteNameEl) {
        siteNameEl.textContent = webapp.name;
      }

      this.iframe.classList.add('hidden');
      this.blockScreen.classList.remove('hidden');
    }
  },

  hideBlockScreen() {
    if (this.blockScreen) {
      this.blockScreen.classList.add('hidden');
    }
  }
};
