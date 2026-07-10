// js/storage.js
const KEYS = {
  WEBAPPS: 'kiosk_webapps',
  DEFAULT_ID: 'kiosk_default_webapp_id',
  HIDDEN_TOUCH: 'kiosk_hidden_touch',
  SETTINGS: 'kiosk_settings'
};

const DEFAULTS = {
  webapps: [],
  defaultId: null,
  hiddenTouch: { zone: 'top-left', tapCount: 5, tapTimeout: 500 },
  settings: { autoRetryEnabled: true, retryInterval: 3000, retryMaxAttempts: 10 }
};

const Storage = {
  loadWebapps() {
    try {
      const data = localStorage.getItem(KEYS.WEBAPPS);
      if (!data) return DEFAULTS.webapps;

      const webapps = JSON.parse(data);
      if (!Array.isArray(webapps)) {
        console.error('Invalid webapps data, resetting');
        localStorage.setItem(KEYS.WEBAPPS, JSON.stringify(DEFAULTS.webapps));
        return DEFAULTS.webapps;
      }

      return webapps;
    } catch (e) {
      console.error('Error loading webapps:', e);
      return DEFAULTS.webapps;
    }
  },

  getDefaultWebappId() {
    return localStorage.getItem(KEYS.DEFAULT_ID);
  },

  getHiddenTouchConfig() {
    try {
      const data = localStorage.getItem(KEYS.HIDDEN_TOUCH);
      return data ? JSON.parse(data) : DEFAULTS.hiddenTouch;
    } catch (e) {
      return DEFAULTS.hiddenTouch;
    }
  },

  getSettings() {
    try {
      const data = localStorage.getItem(KEYS.SETTINGS);
      return data ? JSON.parse(data) : DEFAULTS.settings;
    } catch (e) {
      return DEFAULTS.settings;
    }
  },

  addWebapp(name, url) {
    // Validate name
    if (!name || name.length < 1 || name.length > 50) {
      throw new Error('Name must be 1-50 characters');
    }

    // Validate URL
    if (!url || !(url.startsWith('http://') || url.startsWith('https://'))) {
      throw new Error('URL must start with http:// or https://');
    }

    // Check for duplicate URL
    const webapps = this.loadWebapps();
    if (webapps.some(w => w.url === url)) {
      throw new Error('URL already exists');
    }

    // Create new webapp
    const webapp = {
      id: `webapp_${Date.now()}`,
      name: name.trim(),
      url: url.trim(),
      createdAt: new Date().toISOString()
    };

    webapps.push(webapp);

    try {
      localStorage.setItem(KEYS.WEBAPPS, JSON.stringify(webapps));
      return webapp;
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        throw new Error('Storage quota exceeded. Delete some webapps.');
      }
      throw e;
    }
  },

  updateWebapp(id, updates) {
    const webapps = this.loadWebapps();
    const index = webapps.findIndex(w => w.id === id);

    if (index === -1) {
      throw new Error('Webapp not found');
    }

    // Validate updates
    if (updates.name !== undefined) {
      if (updates.name.length < 1 || updates.name.length > 50) {
        throw new Error('Name must be 1-50 characters');
      }
    }

    if (updates.url !== undefined) {
      if (!(updates.url.startsWith('http://') || updates.url.startsWith('https://'))) {
        throw new Error('URL must start with http:// or https://');
      }

      // Check duplicate URL (excluding self)
      if (webapps.some((w, i) => i !== index && w.url === updates.url)) {
        throw new Error('URL already exists');
      }
    }

    // Apply updates
    if (updates.name !== undefined) {
      webapps[index].name = updates.name.trim();
    }
    if (updates.url !== undefined) {
      webapps[index].url = updates.url.trim();
    }

    localStorage.setItem(KEYS.WEBAPPS, JSON.stringify(webapps));
    return true;
  },

  deleteWebapp(id) {
    const webapps = this.loadWebapps();
    const filtered = webapps.filter(w => w.id !== id);

    if (filtered.length === webapps.length) {
      return false; // Not found
    }

    localStorage.setItem(KEYS.WEBAPPS, JSON.stringify(filtered));

    // Clear default if deleted
    if (this.getDefaultWebappId() === id) {
      localStorage.removeItem(KEYS.DEFAULT_ID);
    }

    return true;
  },

  setDefaultWebappId(id) {
    if (id === null) {
      localStorage.removeItem(KEYS.DEFAULT_ID);
      return;
    }

    // Validate ID exists
    const webapps = this.loadWebapps();
    if (!webapps.some(w => w.id === id)) {
      throw new Error('Webapp not found');
    }

    localStorage.setItem(KEYS.DEFAULT_ID, id);
  },

  updateHiddenTouchConfig(config) {
    localStorage.setItem(KEYS.HIDDEN_TOUCH, JSON.stringify(config));
  },

  updateSettings(settings) {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  }
};
