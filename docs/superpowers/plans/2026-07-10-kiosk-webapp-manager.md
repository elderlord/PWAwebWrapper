# Kiosk WebApp Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a PWA-based kiosk system for iPad that displays webapps in fullscreen, with admin-only hidden touch access to manage webapp URLs.

**Architecture:** Modular JavaScript architecture with localStorage persistence. Kiosk mode shows webapp iframe fullscreen; admin mode (accessed via hidden touch) provides webapp CRUD and settings. No backend required.

**Tech Stack:** Vanilla JavaScript (ES6+), localStorage, PWA (manifest.json + service worker), CSS3

## Global Constraints

- Target: iPad Safari PWA mode (iOS 16.4+)
- Display: landscape orientation only
- Storage: localStorage (no backend)
- URL validation: http/https only
- Webapp name: 1-50 characters
- Hidden touch: 3-10 taps, 500ms-2000ms timeout
- Retry interval: 1000-10000ms
- Cache name: `kiosk-v1`

---

## Task 1: Storage Layer

**Files:**
- Create: `js/storage.js`
- Test: Manual testing via browser console (no test framework)

**Interfaces:**
- Consumes: None (lowest layer)
- Produces:
  - `Storage.loadWebapps()` → `Array<{id, name, url, createdAt}>`
  - `Storage.getDefaultWebappId()` → `string | null`
  - `Storage.getHiddenTouchConfig()` → `{zone, tapCount, tapTimeout}`
  - `Storage.getSettings()` → `{autoRetryEnabled, retryInterval, retryMaxAttempts}`
  - `Storage.addWebapp(name, url)` → `{id, name, url, createdAt}`
  - `Storage.updateWebapp(id, {name, url})` → `boolean`
  - `Storage.deleteWebapp(id)` → `boolean`
  - `Storage.setDefaultWebappId(id)` → `void`
  - `Storage.updateHiddenTouchConfig(config)` → `void`
  - `Storage.updateSettings(settings)` → `void`

- [ ] **Step 1: Create storage.js skeleton**

```javascript
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
  loadWebapps() {},
  getDefaultWebappId() {},
  getHiddenTouchConfig() {},
  getSettings() {},
  addWebapp(name, url) {},
  updateWebapp(id, updates) {},
  deleteWebapp(id) {},
  setDefaultWebappId(id) {},
  updateHiddenTouchConfig(config) {},
  updateSettings(settings) {}
};
```

- [ ] **Step 2: Implement loadWebapps with validation**

```javascript
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
}
```

- [ ] **Step 3: Test loadWebapps in browser console**

Open browser console:
```javascript
// Test 1: Empty localStorage
localStorage.clear();
Storage.loadWebapps(); // Expected: []

// Test 2: Valid data
localStorage.setItem('kiosk_webapps', JSON.stringify([
  {id: 'webapp_123', name: 'Test', url: 'https://example.com', createdAt: new Date().toISOString()}
]));
Storage.loadWebapps(); // Expected: array with 1 webapp

// Test 3: Corrupted data
localStorage.setItem('kiosk_webapps', '{invalid json}');
Storage.loadWebapps(); // Expected: [], with console error
```

- [ ] **Step 4: Implement getter methods**

```javascript
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
}
```

- [ ] **Step 5: Test getter methods in console**

```javascript
// Test getDefaultWebappId
localStorage.setItem('kiosk_default_webapp_id', 'webapp_123');
Storage.getDefaultWebappId(); // Expected: 'webapp_123'

// Test getHiddenTouchConfig
Storage.getHiddenTouchConfig(); // Expected: {zone: 'top-left', tapCount: 5, tapTimeout: 500}

// Test getSettings
Storage.getSettings(); // Expected: {autoRetryEnabled: true, ...}
```

- [ ] **Step 6: Implement addWebapp with validation**

```javascript
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
}
```

- [ ] **Step 7: Test addWebapp**

```javascript
// Test 1: Valid webapp
localStorage.clear();
const webapp = Storage.addWebapp('Test App', 'https://example.com');
console.log(webapp); // Expected: {id: 'webapp_...', name: 'Test App', ...}

// Test 2: Invalid name (too short)
try {
  Storage.addWebapp('', 'https://example.com');
} catch (e) {
  console.log(e.message); // Expected: 'Name must be 1-50 characters'
}

// Test 3: Invalid URL
try {
  Storage.addWebapp('Test', 'javascript:alert(1)');
} catch (e) {
  console.log(e.message); // Expected: 'URL must start with http...'
}

// Test 4: Duplicate URL
try {
  Storage.addWebapp('Another', 'https://example.com');
} catch (e) {
  console.log(e.message); // Expected: 'URL already exists'
}
```

- [ ] **Step 8: Implement updateWebapp**

```javascript
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
}
```

- [ ] **Step 9: Implement deleteWebapp and setters**

```javascript
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
```

- [ ] **Step 10: Test all CRUD operations**

```javascript
// Full workflow test
localStorage.clear();

// Add webapps
const w1 = Storage.addWebapp('App 1', 'https://app1.com');
const w2 = Storage.addWebapp('App 2', 'https://app2.com');

// Set default
Storage.setDefaultWebappId(w1.id);
Storage.getDefaultWebappId(); // Expected: w1.id

// Update webapp
Storage.updateWebapp(w1.id, {name: 'Updated App 1'});
Storage.loadWebapps()[0].name; // Expected: 'Updated App 1'

// Delete webapp
Storage.deleteWebapp(w2.id);
Storage.loadWebapps().length; // Expected: 1

// Update settings
Storage.updateSettings({autoRetryEnabled: false, retryInterval: 5000, retryMaxAttempts: 5});
Storage.getSettings(); // Expected: updated values
```

- [ ] **Step 11: Commit storage layer**

```bash
git add js/storage.js
git commit -m "feat(storage): add localStorage layer with webapp CRUD

- Implement loadWebapps with validation and error recovery
- Add addWebapp with name/URL validation and duplicate check
- Add updateWebapp and deleteWebapp operations
- Implement config getters/setters for hidden touch and settings
- Handle QuotaExceededError and JSON parse errors

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Hidden Touch Detector

**Files:**
- Create: `js/hidden-touch.js`
- Test: Manual testing via browser (touchstart events)

**Interfaces:**
- Consumes: `Storage.getHiddenTouchConfig()`
- Produces:
  - `HiddenTouchDetector(config, onActivate)` → constructor
  - `detector.attachTo(element)` → `void`
  - `detector.detach()` → `void`
  - `detector.updateConfig(config)` → `void`

- [ ] **Step 1: Create HiddenTouchDetector class skeleton**

```javascript
// js/hidden-touch.js
class HiddenTouchDetector {
  constructor(config, onActivate) {
    this.zone = config.zone;           // 'top-left', 'top-right', etc.
    this.tapCount = config.tapCount;   // 3-10
    this.tapTimeout = config.tapTimeout; // ms
    this.onActivate = onActivate;      // callback function
    this.taps = [];                    // timestamps
    this.boundHandler = null;
  }

  attachTo(element) {}
  detach() {}
  updateConfig(config) {}
  
  _handleTouch(event) {}
  _isInZone(x, y) {}
}
```

- [ ] **Step 2: Implement zone detection logic**

```javascript
_isInZone(x, y) {
  const zones = {
    'top-left': { x: [0, 0.15], y: [0, 0.15] },
    'top-right': { x: [0.85, 1], y: [0, 0.15] },
    'bottom-left': { x: [0, 0.15], y: [0.85, 1] },
    'bottom-right': { x: [0.85, 1], y: [0.85, 1] }
  };
  
  const zone = zones[this.zone];
  if (!zone) return false;
  
  return x >= zone.x[0] && x <= zone.x[1] && 
         y >= zone.y[0] && y <= zone.y[1];
}
```

- [ ] **Step 3: Test zone detection**

```javascript
// Test in console
const detector = new HiddenTouchDetector(
  {zone: 'top-left', tapCount: 5, tapTimeout: 500},
  () => console.log('ACTIVATED!')
);

// Test 1: top-left corner (should be true)
detector._isInZone(0.1, 0.1); // Expected: true

// Test 2: center (should be false)
detector._isInZone(0.5, 0.5); // Expected: false

// Test 3: top-right corner
detector.zone = 'top-right';
detector._isInZone(0.9, 0.1); // Expected: true
detector._isInZone(0.1, 0.1); // Expected: false
```

- [ ] **Step 4: Implement touch handler**

```javascript
_handleTouch(event) {
  // Only process first touch (ignore multi-touch)
  if (event.touches.length !== 1) return;
  
  const touch = event.touches[0];
  const x = touch.clientX / window.innerWidth;
  const y = touch.clientY / window.innerHeight;
  
  // Check if touch is in active zone
  if (!this._isInZone(x, y)) return;
  
  const now = Date.now();
  
  // Remove expired taps
  this.taps = this.taps.filter(t => now - t < this.tapTimeout);
  
  // Add new tap
  this.taps.push(now);
  
  // Check if threshold reached
  if (this.taps.length >= this.tapCount) {
    this.taps = [];
    this.onActivate?.();
  }
}
```

- [ ] **Step 5: Implement attach/detach methods**

```javascript
attachTo(element) {
  this.detach(); // Remove existing listener
  
  this.boundHandler = this._handleTouch.bind(this);
  element.addEventListener('touchstart', this.boundHandler, { passive: true });
}

detach() {
  if (this.boundHandler && this.element) {
    this.element.removeEventListener('touchstart', this.boundHandler);
    this.boundHandler = null;
  }
}

updateConfig(config) {
  this.zone = config.zone;
  this.tapCount = config.tapCount;
  this.tapTimeout = config.tapTimeout;
  this.taps = []; // Reset tap history
}
```

- [ ] **Step 6: Create test HTML page**

```html
<!-- test-hidden-touch.html -->
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hidden Touch Test</title>
  <style>
    body { margin: 0; height: 100vh; background: #f0f0f0; }
    .zone { position: absolute; border: 2px dashed red; }
    .top-left { top: 0; left: 0; width: 15%; height: 15%; }
    #status { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
              font-size: 24px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="zone top-left"></div>
  <div id="status">Tap top-left corner 5 times</div>
  
  <script src="js/hidden-touch.js"></script>
  <script>
    const detector = new HiddenTouchDetector(
      { zone: 'top-left', tapCount: 5, tapTimeout: 500 },
      () => {
        document.getElementById('status').textContent = 'ACTIVATED!';
        document.body.style.background = '#4CAF50';
        setTimeout(() => {
          document.getElementById('status').textContent = 'Tap again...';
          document.body.style.background = '#f0f0f0';
        }, 2000);
      }
    );
    
    detector.attachTo(document.body);
  </script>
</body>
</html>
```

- [ ] **Step 7: Manual test with test page**

Run: Open `test-hidden-touch.html` in browser (use Chrome DevTools device emulation for touch)

Test cases:
1. Tap top-left corner 5 times quickly → Expected: "ACTIVATED!", green background
2. Tap slowly (> 500ms between taps) → Expected: No activation
3. Tap center of screen → Expected: No activation
4. Tap 3 times, wait 1 second, tap 5 times → Expected: Activation on 5th tap of second burst

- [ ] **Step 8: Add iOS gesture prevention**

```javascript
// Add static method for iOS gesture prevention
HiddenTouchDetector.preventIOSGestures = function() {
  // Prevent multi-touch (iOS system gestures)
  document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  }, { passive: false });
  
  // Prevent context menu (long press)
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });
  
  // Prevent double-tap zoom
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, false);
};
```

- [ ] **Step 9: Commit hidden touch detector**

```bash
git add js/hidden-touch.js test-hidden-touch.html
git commit -m "feat(hidden-touch): add touch gesture detector for admin mode

- Implement zone-based touch detection (4 screen corners, 15% area)
- Add tap counting with configurable timeout
- Prevent iOS system gestures (multi-touch, context menu, zoom)
- Include test page for manual verification

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Kiosk Mode Core

**Files:**
- Create: `js/kiosk-mode.js`
- Create: `styles/kiosk.css`
- Modify: `index.html` (replace existing)
- Test: Manual testing in browser

**Interfaces:**
- Consumes:
  - `Storage.loadWebapps()`
  - `Storage.getDefaultWebappId()`
  - `Storage.getSettings()`
- Produces:
  - `KioskMode.init(container)` → `void`
  - `KioskMode.loadWebapp(webappId)` → `void`
  - `KioskMode.showWelcome()` → `void`
  - `KioskMode.hide()` → `void`
  - `KioskMode.show()` → `void`

- [ ] **Step 1: Create index.html structure**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <title>Kiosk WebApp Manager</title>
  <link rel="manifest" href="/manifest.json">
  <link rel="stylesheet" href="/styles/kiosk.css">
  <link rel="stylesheet" href="/styles/admin.css">
</head>
<body>
  <!-- Kiosk Mode Container -->
  <div id="kiosk-container">
    <div id="welcome-screen" class="hidden">
      <h1>Kiosk WebApp Manager</h1>
      <p>관리자 모드에서 첫 웹앱을 추가하세요</p>
      <p class="hint">힌트: 좌측 상단을 5번 빠르게 탭하세요</p>
    </div>
    
    <iframe id="webapp-frame" sandbox="allow-same-origin allow-scripts allow-forms"></iframe>
    
    <div id="retry-overlay" class="hidden">
      <div class="spinner"></div>
      <p>연결 중...</p>
      <p id="retry-count"></p>
    </div>
    
    <div id="error-screen" class="hidden">
      <h2>네트워크 연결을 확인하세요</h2>
      <p>관리자 모드에서 다시 시도할 수 있습니다</p>
    </div>
  </div>

  <!-- Admin Mode Container (initially hidden) -->
  <div id="admin-container" class="hidden">
    <!-- Will be populated by admin-mode.js -->
  </div>

  <script src="/js/storage.js"></script>
  <script src="/js/hidden-touch.js"></script>
  <script src="/js/kiosk-mode.js"></script>
  <script src="/js/admin-mode.js"></script>
  <script src="/js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create kiosk.css**

```css
/* styles/kiosk.css */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #000;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.hidden {
  display: none !important;
}

/* Kiosk Container */
#kiosk-container {
  width: 100%;
  height: 100%;
  position: relative;
}

/* Welcome Screen */
#welcome-screen {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-align: center;
  padding: 40px;
}

#welcome-screen h1 {
  font-size: 48px;
  margin-bottom: 20px;
}

#welcome-screen p {
  font-size: 24px;
  margin-bottom: 10px;
}

#welcome-screen .hint {
  font-size: 18px;
  opacity: 0.7;
  margin-top: 40px;
}

/* Webapp Frame */
#webapp-frame {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

/* Retry Overlay */
#retry-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
}

#retry-overlay p {
  font-size: 24px;
  margin-top: 20px;
}

#retry-count {
  font-size: 18px;
  opacity: 0.7;
}

.spinner {
  width: 60px;
  height: 60px;
  border: 6px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Error Screen */
#error-screen {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  text-align: center;
  padding: 40px;
}

#error-screen h2 {
  font-size: 36px;
  margin-bottom: 20px;
  color: #f44336;
}

#error-screen p {
  font-size: 20px;
  opacity: 0.8;
}
```

- [ ] **Step 3: Create kiosk-mode.js skeleton**

```javascript
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

  init(container) {},
  loadWebapp(webappId) {},
  showWelcome() {},
  hide() {},
  show() {},
  
  _showRetryOverlay() {},
  _hideRetryOverlay() {},
  _startAutoRetry() {},
  _stopAutoRetry() {},
  _showError() {}
};
```

- [ ] **Step 4: Implement init method**

```javascript
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
}
```

- [ ] **Step 5: Implement loadWebapp method**

```javascript
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
}
```

- [ ] **Step 6: Implement showWelcome and hide/show**

```javascript
showWelcome() {
  this.currentWebappId = null;
  this.iframe.classList.add('hidden');
  this.iframe.src = '';
  this.errorScreen.classList.add('hidden');
  this._hideRetryOverlay();
  this.welcomeScreen.classList.remove('hidden');
}

hide() {
  this.container.classList.add('hidden');
}

show() {
  this.container.classList.remove('hidden');
}
```

- [ ] **Step 7: Implement retry logic**

```javascript
_showRetryOverlay() {
  this.retryOverlay.classList.remove('hidden');
}

_hideRetryOverlay() {
  this.retryOverlay.classList.add('hidden');
  this._stopAutoRetry();
}

_startAutoRetry() {
  const settings = Storage.getSettings();
  if (!settings.autoRetryEnabled) {
    this._showError();
    return;
  }
  
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
}

_stopAutoRetry() {
  if (this.retryInterval) {
    clearInterval(this.retryInterval);
    this.retryInterval = null;
  }
  this.retryAttempts = 0;
}

_showError() {
  this._hideRetryOverlay();
  this.iframe.classList.add('hidden');
  this.errorScreen.classList.remove('hidden');
}
```

- [ ] **Step 8: Test kiosk mode in browser**

Run: Open `index.html` in browser

Test cases:
1. First load (no data) → Expected: Welcome screen shown
2. Add webapp via console:
   ```javascript
   const w = Storage.addWebapp('Google', 'https://google.com');
   Storage.setDefaultWebappId(w.id);
   location.reload();
   ```
   → Expected: Google loads in iframe
3. Test invalid URL (console):
   ```javascript
   Storage.setDefaultWebappId('invalid_id');
   location.reload();
   ```
   → Expected: Welcome screen shown

- [ ] **Step 9: Commit kiosk mode core**

```bash
git add index.html styles/kiosk.css js/kiosk-mode.js
git commit -m "feat(kiosk): add kiosk mode with iframe and error handling

- Create fullscreen iframe container with sandbox attributes
- Implement welcome screen for first-time setup
- Add retry overlay with auto-retry logic
- Add error screen for permanent network failures
- Load default webapp on init or show welcome

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Admin Mode UI

**Files:**
- Create: `js/admin-mode.js`
- Create: `styles/admin.css`
- Test: Manual testing in browser

**Interfaces:**
- Consumes:
  - `Storage.loadWebapps()`
  - `Storage.getDefaultWebappId()`
  - `Storage.getHiddenTouchConfig()`
  - `Storage.getSettings()`
- Produces:
  - `AdminMode.init(container)` → `void`
  - `AdminMode.show()` → `void`
  - `AdminMode.hide()` → `void`
  - `AdminMode.refreshWebappList()` → `void`

- [ ] **Step 1: Create admin.css**

```css
/* styles/admin.css */
#admin-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.admin-modal {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 30px;
  border-bottom: 1px solid #e0e0e0;
}

.admin-header h2 {
  font-size: 28px;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 32px;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 40px;
  height: 40px;
  line-height: 1;
}

.close-btn:hover {
  color: #333;
}

.admin-tabs {
  display: flex;
  border-bottom: 1px solid #e0e0e0;
  padding: 0 30px;
}

.tab-btn {
  background: none;
  border: none;
  padding: 15px 30px;
  font-size: 18px;
  color: #666;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  transition: all 0.3s;
}

.tab-btn.active {
  color: #667eea;
  border-bottom-color: #667eea;
}

.admin-content {
  flex: 1;
  overflow-y: auto;
  padding: 30px;
}

.tab-panel {
  display: none;
}

.tab-panel.active {
  display: block;
}

/* Webapp List */
.webapp-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.webapp-item {
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  transition: border-color 0.3s;
}

.webapp-item:hover {
  border-color: #667eea;
}

.webapp-item.is-default {
  border-color: #667eea;
  background: #f5f7ff;
}

.webapp-radio {
  width: 24px;
  height: 24px;
  cursor: pointer;
}

.webapp-info {
  flex: 1;
}

.webapp-name {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin-bottom: 5px;
}

.webapp-url {
  font-size: 14px;
  color: #666;
  word-break: break-all;
}

.webapp-badge {
  background: #667eea;
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.webapp-actions {
  display: flex;
  gap: 10px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-secondary {
  background: #f0f0f0;
  color: #333;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

.btn-danger {
  background: #f44336;
  color: white;
}

.btn-danger:hover {
  background: #d32f2f;
}

.btn-primary {
  background: #667eea;
  color: white;
  font-weight: 600;
}

.btn-primary:hover {
  background: #5568d3;
}

.btn-add {
  width: 100%;
  padding: 15px;
  margin-top: 20px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.empty-state h3 {
  font-size: 24px;
  margin-bottom: 10px;
}

/* Settings */
.settings-form {
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-label {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.form-input,
.form-select {
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #667eea;
}

.form-toggle {
  display: flex;
  align-items: center;
  gap: 15px;
}

.toggle-switch {
  position: relative;
  width: 60px;
  height: 34px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.4s;
  border-radius: 34px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 26px;
  width: 26px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: 0.4s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: #667eea;
}

input:checked + .toggle-slider:before {
  transform: translateX(26px);
}

/* Admin Footer */
.admin-footer {
  padding: 20px 30px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: center;
}

.btn-exit {
  background: #f44336;
  color: white;
  padding: 12px 40px;
}

.btn-exit:hover {
  background: #d32f2f;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal {
  background: white;
  border-radius: 12px;
  padding: 30px;
  width: 90%;
  max-width: 500px;
}

.modal h3 {
  font-size: 24px;
  margin-bottom: 20px;
  color: #333;
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  justify-content: flex-end;
}
```

- [ ] **Step 2: Create admin-mode.js skeleton**

```javascript
// js/admin-mode.js
const AdminMode = {
  container: null,
  currentTab: 'webapps',

  init(container) {},
  show() {},
  hide() {},
  refreshWebappList() {},
  
  _switchTab(tabName) {},
  _renderWebappList() {},
  _renderSettings() {},
  _showAddWebappModal() {},
  _showEditWebappModal(webappId) {},
  _showDeleteConfirm(webappId) {},
  _showExitConfirm() {}
};
```

- [ ] **Step 3: Build admin modal HTML structure**

```javascript
init(container) {
  this.container = container;
  
  // Build modal structure
  this.container.innerHTML = `
    <div class="admin-modal">
      <div class="admin-header">
        <h2>관리자 모드</h2>
        <button class="close-btn" id="admin-close">&times;</button>
      </div>
      
      <div class="admin-tabs">
        <button class="tab-btn active" data-tab="webapps">웹앱 관리</button>
        <button class="tab-btn" data-tab="settings">설정</button>
      </div>
      
      <div class="admin-content">
        <div id="tab-webapps" class="tab-panel active">
          <!-- Webapp list will be rendered here -->
        </div>
        
        <div id="tab-settings" class="tab-panel">
          <!-- Settings will be rendered here -->
        </div>
      </div>
      
      <div class="admin-footer">
        <button class="btn btn-exit" id="admin-exit">앱 종료</button>
      </div>
    </div>
  `;
  
  // Attach event listeners
  document.getElementById('admin-close').addEventListener('click', () => this.hide());
  document.getElementById('admin-exit').addEventListener('click', () => this._showExitConfirm());
  
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      this._switchTab(tab);
    });
  });
  
  // Initial render
  this._renderWebappList();
  this._renderSettings();
}
```

- [ ] **Step 4: Implement tab switching**

```javascript
_switchTab(tabName) {
  this.currentTab = tabName;
  
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn.dataset.tab === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // Update panels
  document.querySelectorAll('.tab-panel').forEach(panel => {
    if (panel.id === `tab-${tabName}`) {
      panel.classList.add('active');
    } else {
      panel.classList.remove('active');
    }
  });
}
```

- [ ] **Step 5: Implement webapp list rendering**

```javascript
refreshWebappList() {
  this._renderWebappList();
}

_renderWebappList() {
  const webapps = Storage.loadWebapps();
  const defaultId = Storage.getDefaultWebappId();
  const panel = document.getElementById('tab-webapps');
  
  if (webapps.length === 0) {
    panel.innerHTML = `
      <div class="empty-state">
        <h3>등록된 웹앱이 없습니다</h3>
        <p>첫 웹앱을 추가해보세요</p>
      </div>
      <button class="btn btn-primary btn-add" id="btn-add-webapp">+ 새 웹앱 추가</button>
    `;
  } else {
    let html = '<div class="webapp-list">';
    
    webapps.forEach(webapp => {
      const isDefault = webapp.id === defaultId;
      html += `
        <div class="webapp-item ${isDefault ? 'is-default' : ''}" data-id="${webapp.id}">
          <input type="radio" class="webapp-radio" name="default-webapp" 
                 ${isDefault ? 'checked' : ''} data-id="${webapp.id}">
          <div class="webapp-info">
            <div class="webapp-name">${this._escapeHtml(webapp.name)}</div>
            <div class="webapp-url">${this._escapeHtml(webapp.url)}</div>
          </div>
          ${isDefault ? '<span class="webapp-badge">기본</span>' : ''}
          <div class="webapp-actions">
            <button class="btn btn-secondary" data-action="edit" data-id="${webapp.id}">편집</button>
            <button class="btn btn-danger" data-action="delete" data-id="${webapp.id}">삭제</button>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    html += '<button class="btn btn-primary btn-add" id="btn-add-webapp">+ 새 웹앱 추가</button>';
    html += '<button class="btn btn-primary btn-add" id="btn-open-webapp">선택한 웹앱 열기</button>';
    
    panel.innerHTML = html;
    
    // Attach event listeners
    panel.querySelectorAll('.webapp-radio').forEach(radio => {
      radio.addEventListener('change', (e) => {
        Storage.setDefaultWebappId(e.target.dataset.id);
        this.refreshWebappList();
      });
    });
    
    panel.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', () => {
        this._showEditWebappModal(btn.dataset.id);
      });
    });
    
    panel.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', () => {
        this._showDeleteConfirm(btn.dataset.id);
      });
    });
  }
  
  const addBtn = document.getElementById('btn-add-webapp');
  if (addBtn) {
    addBtn.addEventListener('click', () => this._showAddWebappModal());
  }
  
  const openBtn = document.getElementById('btn-open-webapp');
  if (openBtn) {
    openBtn.addEventListener('click', () => {
      const defaultId = Storage.getDefaultWebappId();
      if (defaultId) {
        KioskMode.loadWebapp(defaultId);
        this.hide();
      } else {
        alert('기본 웹앱을 선택해주세요');
      }
    });
  }
}

_escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

- [ ] **Step 6: Implement settings rendering (placeholder)**

```javascript
_renderSettings() {
  const hiddenTouch = Storage.getHiddenTouchConfig();
  const settings = Storage.getSettings();
  const panel = document.getElementById('tab-settings');
  
  panel.innerHTML = `
    <div class="settings-form">
      <div class="form-group">
        <label class="form-label">히든 터치 위치</label>
        <select class="form-select" id="setting-zone">
          <option value="top-left" ${hiddenTouch.zone === 'top-left' ? 'selected' : ''}>좌측 상단</option>
          <option value="top-right" ${hiddenTouch.zone === 'top-right' ? 'selected' : ''}>우측 상단</option>
          <option value="bottom-left" ${hiddenTouch.zone === 'bottom-left' ? 'selected' : ''}>좌측 하단</option>
          <option value="bottom-right" ${hiddenTouch.zone === 'bottom-right' ? 'selected' : ''}>우측 하단</option>
        </select>
      </div>
      
      <div class="form-group">
        <label class="form-label">탭 횟수</label>
        <input type="number" class="form-input" id="setting-tap-count" 
               value="${hiddenTouch.tapCount}" min="3" max="10">
      </div>
      
      <div class="form-group">
        <label class="form-label">자동 재시도</label>
        <div class="form-toggle">
          <label class="toggle-switch">
            <input type="checkbox" id="setting-auto-retry" 
                   ${settings.autoRetryEnabled ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
          <span>${settings.autoRetryEnabled ? '켜짐' : '꺼짐'}</span>
        </div>
      </div>
      
      <div class="form-group">
        <label class="form-label">재시도 간격 (초)</label>
        <input type="number" class="form-input" id="setting-retry-interval" 
               value="${settings.retryInterval / 1000}" min="1" max="10">
      </div>
      
      <div class="form-group">
        <label class="form-label">최대 재시도 횟수</label>
        <input type="number" class="form-input" id="setting-max-attempts" 
               value="${settings.retryMaxAttempts}" min="1" max="20">
      </div>
      
      <button class="btn btn-primary" id="btn-save-settings">설정 저장</button>
    </div>
  `;
  
  // Placeholder for now - will implement save in Task 6
  document.getElementById('btn-save-settings')?.addEventListener('click', () => {
    alert('설정 저장 기능은 Task 6에서 구현됩니다');
  });
}
```

- [ ] **Step 7: Implement show/hide methods**

```javascript
show() {
  this.container.classList.remove('hidden');
  this.refreshWebappList();
}

hide() {
  this.container.classList.add('hidden');
}
```

- [ ] **Step 8: Add placeholder modal methods**

```javascript
_showAddWebappModal() {
  // Placeholder - will implement in Task 5
  alert('웹앱 추가 모달은 Task 5에서 구현됩니다');
}

_showEditWebappModal(webappId) {
  // Placeholder - will implement in Task 5
  alert(`웹앱 편집 모달 (ID: ${webappId})은 Task 5에서 구현됩니다`);
}

_showDeleteConfirm(webappId) {
  // Placeholder - will implement in Task 5
  if (confirm('정말 삭제하시겠습니까?')) {
    Storage.deleteWebapp(webappId);
    this.refreshWebappList();
  }
}

_showExitConfirm() {
  if (confirm('앱을 종료하시겠습니까?')) {
    alert('PWA 종료는 홈 화면으로 돌아가거나 앱 스위처에서 종료하세요');
  }
}
```

- [ ] **Step 9: Test admin mode UI**

Run: Open `index.html` in browser, add test data:
```javascript
Storage.addWebapp('Test 1', 'https://example.com');
Storage.addWebapp('Test 2', 'https://google.com');
```

Test in console:
```javascript
AdminMode.init(document.getElementById('admin-container'));
AdminMode.show();
```

Expected:
- Modal appears with 2 webapps
- Can switch between tabs
- Can set default webapp (radio button)
- Settings tab shows form (not functional yet)

- [ ] **Step 10: Commit admin mode UI**

```bash
git add js/admin-mode.js styles/admin.css
git commit -m "feat(admin): add admin mode UI with tabs and webapp list

- Create modal overlay with tabs (웹앱 관리, 설정)
- Render webapp list with radio buttons for default selection
- Add settings form (hidden touch, auto-retry config)
- Implement tab switching and basic navigation
- Placeholder modals for add/edit/delete (Task 5)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Webapp CRUD Operations

**Files:**
- Modify: `js/admin-mode.js` (implement modals)
- Test: Manual testing in browser

**Interfaces:**
- Consumes:
  - `Storage.addWebapp(name, url)`
  - `Storage.updateWebapp(id, {name, url})`
  - `Storage.deleteWebapp(id)`
- Produces: Complete CRUD UI in admin mode

- [ ] **Step 1: Implement add webapp modal**

Replace `_showAddWebappModal` in `js/admin-mode.js`:

```javascript
_showAddWebappModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h3>새 웹앱 추가</h3>
      <div class="form-group">
        <label class="form-label">이름</label>
        <input type="text" class="form-input" id="modal-webapp-name" 
               placeholder="전시 소개" maxlength="50">
      </div>
      <div class="form-group">
        <label class="form-label">URL</label>
        <input type="url" class="form-input" id="modal-webapp-url" 
               placeholder="https://example.com">
      </div>
      <div id="modal-error" style="color: #f44336; margin-top: 10px;"></div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="modal-cancel">취소</button>
        <button class="btn btn-primary" id="modal-add">추가</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  const nameInput = document.getElementById('modal-webapp-name');
  const urlInput = document.getElementById('modal-webapp-url');
  const errorDiv = document.getElementById('modal-error');
  
  // Focus name input
  nameInput.focus();
  
  // Cancel button
  document.getElementById('modal-cancel').addEventListener('click', () => {
    overlay.remove();
  });
  
  // Add button
  document.getElementById('modal-add').addEventListener('click', () => {
    const name = nameInput.value.trim();
    const url = urlInput.value.trim();
    
    errorDiv.textContent = '';
    
    try {
      Storage.addWebapp(name, url);
      overlay.remove();
      this.refreshWebappList();
      alert('웹앱이 추가되었습니다');
    } catch (e) {
      errorDiv.textContent = e.message;
    }
  });
  
  // Enter key to submit
  overlay.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('modal-add').click();
    }
  });
}
```

- [ ] **Step 2: Test add webapp modal**

Run: Open browser, show admin mode, click "새 웹앱 추가"

Test cases:
1. Valid input (name: "Test", url: "https://example.com") → Expected: Success
2. Empty name → Expected: Error "Name must be 1-50 characters"
3. Invalid URL (no protocol) → Expected: Error "URL must start with http..."
4. Duplicate URL → Expected: Error "URL already exists"
5. Press Enter key → Expected: Form submits
6. Cancel button → Expected: Modal closes

- [ ] **Step 3: Implement edit webapp modal**

Replace `_showEditWebappModal` in `js/admin-mode.js`:

```javascript
_showEditWebappModal(webappId) {
  const webapps = Storage.loadWebapps();
  const webapp = webapps.find(w => w.id === webappId);
  
  if (!webapp) {
    alert('웹앱을 찾을 수 없습니다');
    return;
  }
  
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h3>웹앱 편집</h3>
      <div class="form-group">
        <label class="form-label">이름</label>
        <input type="text" class="form-input" id="modal-webapp-name" 
               value="${this._escapeHtml(webapp.name)}" maxlength="50">
      </div>
      <div class="form-group">
        <label class="form-label">URL</label>
        <input type="url" class="form-input" id="modal-webapp-url" 
               value="${this._escapeHtml(webapp.url)}">
      </div>
      <div id="modal-error" style="color: #f44336; margin-top: 10px;"></div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="modal-cancel">취소</button>
        <button class="btn btn-primary" id="modal-save">저장</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  const nameInput = document.getElementById('modal-webapp-name');
  const urlInput = document.getElementById('modal-webapp-url');
  const errorDiv = document.getElementById('modal-error');
  
  nameInput.focus();
  
  document.getElementById('modal-cancel').addEventListener('click', () => {
    overlay.remove();
  });
  
  document.getElementById('modal-save').addEventListener('click', () => {
    const name = nameInput.value.trim();
    const url = urlInput.value.trim();
    
    errorDiv.textContent = '';
    
    try {
      Storage.updateWebapp(webappId, { name, url });
      overlay.remove();
      this.refreshWebappList();
      alert('웹앱이 수정되었습니다');
    } catch (e) {
      errorDiv.textContent = e.message;
    }
  });
}
```

- [ ] **Step 4: Test edit webapp modal**

Run: Add webapp, click "편집"

Test cases:
1. Change name → Expected: Name updated
2. Change URL → Expected: URL updated
3. Change to duplicate URL → Expected: Error
4. Cancel → Expected: No changes

- [ ] **Step 5: Improve delete confirmation**

Replace `_showDeleteConfirm` in `js/admin-mode.js`:

```javascript
_showDeleteConfirm(webappId) {
  const webapps = Storage.loadWebapps();
  const webapp = webapps.find(w => w.id === webappId);
  const defaultId = Storage.getDefaultWebappId();
  
  if (!webapp) {
    alert('웹앱을 찾을 수 없습니다');
    return;
  }
  
  let message = `"${webapp.name}"을(를) 정말 삭제하시겠습니까?`;
  
  if (webappId === defaultId) {
    message += '\n\n이 웹앱은 기본 웹앱입니다. 삭제 후 다른 웹앱을 기본으로 설정해야 합니다.';
  }
  
  if (confirm(message)) {
    Storage.deleteWebapp(webappId);
    this.refreshWebappList();
    
    if (webappId === defaultId) {
      alert('다른 웹앱을 기본으로 설정하세요');
    }
  }
}
```

- [ ] **Step 6: Test delete with default webapp**

Test cases:
1. Delete non-default webapp → Expected: Simple confirm
2. Delete default webapp → Expected: Warning about setting new default
3. Delete all webapps → Expected: Empty state shown

- [ ] **Step 7: Commit CRUD operations**

```bash
git add js/admin-mode.js
git commit -m "feat(admin): implement webapp CRUD modals

- Add webapp modal with validation (name length, URL format, duplicates)
- Edit webapp modal with pre-filled values
- Enhanced delete confirmation with default webapp warning
- Enter key support for modals
- Error messages displayed inline

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: Settings Management

**Files:**
- Modify: `js/admin-mode.js` (implement settings save)
- Test: Manual testing

**Interfaces:**
- Consumes:
  - `Storage.updateHiddenTouchConfig(config)`
  - `Storage.updateSettings(settings)`
- Produces: Functional settings tab

- [ ] **Step 1: Implement settings save handler**

Replace the placeholder in `_renderSettings`:

```javascript
document.getElementById('btn-save-settings')?.addEventListener('click', () => {
  const zone = document.getElementById('setting-zone').value;
  const tapCount = parseInt(document.getElementById('setting-tap-count').value);
  const autoRetry = document.getElementById('setting-auto-retry').checked;
  const retryInterval = parseInt(document.getElementById('setting-retry-interval').value) * 1000;
  const maxAttempts = parseInt(document.getElementById('setting-max-attempts').value);
  
  // Validate
  if (tapCount < 3 || tapCount > 10) {
    alert('탭 횟수는 3-10 사이여야 합니다');
    return;
  }
  
  if (retryInterval < 1000 || retryInterval > 10000) {
    alert('재시도 간격은 1-10초 사이여야 합니다');
    return;
  }
  
  if (maxAttempts < 1 || maxAttempts > 20) {
    alert('최대 재시도 횟수는 1-20 사이여야 합니다');
    return;
  }
  
  // Save to storage
  Storage.updateHiddenTouchConfig({
    zone,
    tapCount,
    tapTimeout: 500 // Fixed for now
  });
  
  Storage.updateSettings({
    autoRetryEnabled: autoRetry,
    retryInterval,
    retryMaxAttempts: maxAttempts
  });
  
  alert('설정이 저장되었습니다. 히든 터치 변경사항은 앱 재시작 후 적용됩니다.');
});
```

- [ ] **Step 2: Test settings save**

Test cases:
1. Change hidden touch zone to "top-right" → Save → Expected: Success
2. Change tap count to 3 → Save → Expected: Success
3. Invalid tap count (15) → Expected: Error
4. Toggle auto-retry off → Save → Expected: Success
5. Change retry interval to 5 → Save → Expected: 5000ms in storage

Verify:
```javascript
Storage.getHiddenTouchConfig(); // Check zone, tapCount
Storage.getSettings(); // Check autoRetryEnabled, retryInterval
```

- [ ] **Step 3: Add live toggle label update**

Update `_renderSettings` to add toggle state update:

```javascript
// After rendering the form, add this:
const autoRetryToggle = document.getElementById('setting-auto-retry');
if (autoRetryToggle) {
  autoRetryToggle.addEventListener('change', (e) => {
    const label = e.target.closest('.form-toggle').querySelector('span');
    label.textContent = e.target.checked ? '켜짐' : '꺼짐';
  });
}
```

- [ ] **Step 4: Test toggle interaction**

Test: Click toggle switch → Expected: Label changes between "켜짐" / "꺼짐"

- [ ] **Step 5: Commit settings management**

```bash
git add js/admin-mode.js
git commit -m "feat(admin): implement settings save functionality

- Save hidden touch config (zone, tap count)
- Save retry settings (enabled, interval, max attempts)
- Validate input ranges (tap count 3-10, interval 1-10s, attempts 1-20)
- Live toggle label update
- Show confirmation on save

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: App Integration & Mode Switching

**Files:**
- Create: `js/app.js`
- Test: End-to-end manual testing

**Interfaces:**
- Consumes: All previous modules
- Produces: Complete integrated app

- [ ] **Step 1: Create app.js with initialization**

```javascript
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
```

- [ ] **Step 2: Update AdminMode close to use App.switchToKioskMode**

In `admin-mode.js`, update the close button handler in `init`:

```javascript
document.getElementById('admin-close').addEventListener('click', () => {
  App.switchToKioskMode();
});
```

Also update the "선택한 웹앱 열기" button in `_renderWebappList`:

```javascript
openBtn.addEventListener('click', () => {
  const defaultId = Storage.getDefaultWebappId();
  if (defaultId) {
    App.switchToKioskMode(defaultId);
  } else {
    alert('기본 웹앱을 선택해주세요');
  }
});
```

- [ ] **Step 3: Test full integration**

Run: Open `index.html`

Test flow:
1. First load → Expected: Welcome screen (if no webapps)
2. Tap top-left 5 times → Expected: Admin mode opens
3. Add webapp "Test" / "https://example.com" → Expected: Success
4. Set as default → Expected: Radio button checked
5. Click "선택한 웹앱 열기" → Expected: Kiosk mode shows example.com
6. Tap top-left 5 times → Expected: Admin mode opens again
7. Change hidden touch to "top-right" → Save → Close admin
8. Tap top-left → Expected: No response
9. Tap top-right 5 times → Expected: Admin mode opens

- [ ] **Step 4: Test with multiple webapps**

Add 3 webapps via admin mode:
- "Google" / "https://google.com"
- "YouTube" / "https://youtube.com"
- "Wikipedia" / "https://wikipedia.org"

Test:
1. Set Google as default → Close admin → Expected: Google loads
2. Open admin → Select YouTube → Open → Expected: YouTube loads
3. Delete Google → Expected: Warning (was default)
4. Verify list updates correctly

- [ ] **Step 5: Test error handling**

Test:
1. Add webapp with invalid URL (offline site) → Expected: Retry overlay appears
2. Wait for max retries → Expected: Error screen shown
3. Open admin via hidden touch → Expected: Works even in error state
4. Load valid webapp → Expected: Error clears, webapp loads

- [ ] **Step 6: Commit app integration**

```bash
git add js/app.js
git commit -m "feat(app): integrate all modules with mode switching

- Initialize all controllers (storage, kiosk, admin, hidden-touch)
- Implement mode switching (kiosk ↔ admin)
- Connect admin close button to kiosk mode
- Update hidden touch config on mode switch
- Prevent iOS gestures globally

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: PWA Configuration

**Files:**
- Modify: `manifest.json`
- Modify: `service-worker.js`
- Create: `icon-192.png` (placeholder)
- Create: `icon-512.png` (placeholder)
- Test: PWA installation on device

**Interfaces:**
- Consumes: All app files
- Produces: Installable PWA

- [ ] **Step 1: Update manifest.json**

```json
{
  "name": "Kiosk WebApp Manager",
  "short_name": "Kiosk",
  "description": "전시용 웹앱 키오스크 관리 시스템",
  "display": "standalone",
  "orientation": "landscape",
  "start_url": "/",
  "scope": "/",
  "background_color": "#000000",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

- [ ] **Step 2: Update service-worker.js**

```javascript
const CACHE_NAME = 'kiosk-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles/kiosk.css',
  '/styles/admin.css',
  '/js/app.js',
  '/js/kiosk-mode.js',
  '/js/admin-mode.js',
  '/js/storage.js',
  '/js/hidden-touch.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - cache-first strategy
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and non-http(s) requests
  if (!event.request.url.startsWith('http')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return cached response
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then((response) => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Only cache same-origin requests
          if (event.request.url.startsWith(self.location.origin)) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
          }

          return response;
        });
      })
      .catch(() => {
        // Return cached index.html as fallback
        return caches.match('/index.html');
      })
  );
});
```

- [ ] **Step 3: Create placeholder icons**

Create simple SVG icons and convert to PNG (or use online icon generator):

```bash
# Create icon-192.png (192x192) - simple colored square with "K"
# Create icon-512.png (512x512) - same design, larger

# For testing, you can use:
# https://via.placeholder.com/192/667eea/ffffff?text=K
# https://via.placeholder.com/512/667eea/ffffff?text=K
```

Manual step: Download placeholder icons or create simple ones in an image editor.

- [ ] **Step 4: Register service worker in index.html**

Add before closing `</body>` tag in `index.html`:

```html
<script>
  // Register service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('SW registered:', registration);
        })
        .catch(error => {
          console.log('SW registration failed:', error);
        });
    });
  }
</script>
```

- [ ] **Step 5: Test PWA installation (local server)**

Run local server (needed for PWA):
```bash
# Option 1: Python
python3 -m http.server 8000

# Option 2: Node
npx serve

# Option 3: PHP
php -S localhost:8000
```

Open: `http://localhost:8000`

Test:
1. Open Chrome DevTools → Application → Manifest → Expected: Valid manifest
2. Application → Service Workers → Expected: Activated and running
3. Application → Storage → Cache Storage → Expected: kiosk-v1 with files
4. Chrome menu → Install app → Expected: Install prompt appears
5. Install → Expected: Opens in standalone mode (no browser UI)

- [ ] **Step 6: Test offline functionality**

Test:
1. With server running, load app
2. Stop server
3. Reload app → Expected: Loads from cache
4. Open admin mode → Expected: Works (UI is cached)
5. Try to load webapp → Expected: Network error, retry overlay appears

- [ ] **Step 7: Commit PWA configuration**

```bash
git add manifest.json service-worker.js icon-192.png icon-512.png index.html
git commit -m "feat(pwa): add PWA configuration and service worker

- Update manifest.json for standalone mode, landscape orientation
- Implement cache-first service worker strategy
- Add placeholder icons (192x192, 512x512)
- Register service worker on page load
- Cache all static resources for offline use

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 9: Final Polish & Testing

**Files:**
- Modify: `README.md`
- Test: Complete E2E testing

**Interfaces:**
- Consumes: Complete app
- Produces: Production-ready app

- [ ] **Step 1: Update README.md**

```markdown
# Kiosk WebApp Manager

iPad PWA 기반 키오스크 웹앱 관리 시스템

## 주요 기능

- **키오스크 모드**: 웹앱을 전체화면으로 표시 (관람객용)
- **관리자 모드**: 히든 터치로 진입, 웹앱 추가/편집/삭제
- **다중 웹앱**: 여러 웹앱을 등록하고 전환
- **오프라인 지원**: 앱 자체는 완전 오프라인 작동
- **자동 재시도**: 네트워크 오류 시 자동으로 재연결 시도
- **PWA 설치**: iPad 홈 화면에 앱처럼 설치 가능

## 설치 방법

### 1. 웹 호스팅

정적 파일을 HTTPS로 호스팅 (GitHub Pages, Netlify, Vercel 등)

### 2. iPad에 설치

1. Safari에서 웹사이트 접속
2. 공유 버튼(상단 중앙) → "홈 화면에 추가"
3. 이름 확인 후 "추가"
4. 홈 화면 아이콘 탭 → 전체화면 앱 실행

## 초기 설정

1. 앱 실행 → 환영 화면 표시
2. 좌측 상단 모서리를 5번 빠르게 탭 → 관리자 모드 진입
3. "+ 새 웹앱 추가" 클릭
4. 이름과 URL 입력 후 추가
5. 라디오 버튼으로 기본 웹앱 설정
6. "선택한 웹앱 열기" → 키오스크 모드 시작

## 사용법

### 키오스크 모드 (관람객)
- 웹앱이 전체화면으로 표시됩니다
- 터치 상호작용 가능 (웹앱 내부)
- 새 창/팝업은 자동 차단

### 관리자 모드 진입
- 기본: 좌측 상단 모서리를 5번 빠르게 탭 (500ms 이내)
- 설정 탭에서 위치 및 횟수 변경 가능

### 웹앱 관리
- **추가**: "+ 새 웹앱 추가" → 이름/URL 입력
- **편집**: 웹앱 항목에서 "편집" 클릭
- **삭제**: "삭제" 클릭 → 확인
- **기본 설정**: 라디오 버튼 선택

### 설정
- **히든 터치 위치**: 4개 모서리 중 선택
- **탭 횟수**: 3-10회 (기본 5회)
- **자동 재시도**: 네트워크 오류 시 자동 재연결
- **재시도 간격**: 1-10초 (기본 3초)
- **최대 재시도**: 1-20회 (기본 10회)

## 기술 스택

- **Frontend**: Vanilla JavaScript (ES6+), CSS3
- **Storage**: localStorage (no backend)
- **PWA**: manifest.json + service worker
- **Target**: iPad Safari (iOS 16.4+)

## 파일 구조

```
claudeCode4web/
├── index.html
├── manifest.json
├── service-worker.js
├── icon-192.png
├── icon-512.png
├── styles/
│   ├── kiosk.css
│   └── admin.css
├── js/
│   ├── app.js
│   ├── kiosk-mode.js
│   ├── admin-mode.js
│   ├── storage.js
│   └── hidden-touch.js
└── docs/
    └── superpowers/
        ├── specs/
        │   └── 2026-07-10-kiosk-webapp-manager-design.md
        └── plans/
            └── 2026-07-10-kiosk-webapp-manager.md
```

## 브라우저 호환성

- ✅ Safari (iOS/iPadOS 16.4+)
- ✅ Chrome (desktop, Android)
- ✅ Edge
- ⚠️ Firefox (일부 PWA 기능 제한)

## 보안

- iframe sandbox로 새 창/팝업 차단
- http/https URL만 허용 (javascript: 차단)
- iOS 시스템 제스처 비활성화 (멀티터치, 줌 등)
- 히든 터치 위치 변경 가능 (보안 강화)

## 제한사항

- localStorage 용량: ~5-10MB (웹앱 최대 50개)
- X-Frame-Options로 차단된 사이트는 로드 불가
- HTTPS 필수 (PWA 요구사항)

## 라이선스

MIT License
```

- [ ] **Step 2: End-to-end test checklist**

Test complete user journey:

```
[ ] 1. First Install
    [ ] Install PWA on iPad
    [ ] Open from home screen → standalone mode (no Safari UI)
    [ ] Welcome screen shows
    
[ ] 2. Admin Mode Access
    [ ] Tap top-left 5 times → admin mode opens
    [ ] Tap slowly → no activation
    [ ] Tap center → no activation
    
[ ] 3. Webapp Management
    [ ] Add webapp "Test" / "https://example.com"
    [ ] Validation: empty name → error
    [ ] Validation: invalid URL → error
    [ ] Validation: duplicate URL → error
    [ ] Set as default (radio button)
    [ ] Edit webapp name
    [ ] Edit webapp URL
    [ ] Delete webapp → confirmation
    [ ] Delete default webapp → warning
    
[ ] 4. Kiosk Mode
    [ ] Close admin → webapp loads
    [ ] Webapp displays fullscreen (no UI)
    [ ] Touch interaction works
    [ ] Links open in same frame (no new windows)
    
[ ] 5. Settings
    [ ] Change hidden touch to "top-right"
    [ ] Change tap count to 3
    [ ] Save → success message
    [ ] Close admin, test new hidden touch → works
    [ ] Toggle auto-retry off → save
    [ ] Test network error → no retry, error shown immediately
    [ ] Toggle back on, set interval to 5s, max 3 → save
    
[ ] 6. Error Handling
    [ ] Load invalid URL → retry overlay
    [ ] Wait for retries → error screen
    [ ] Hidden touch still works in error state
    [ ] Load valid webapp → error clears
    
[ ] 7. Offline Support
    [ ] Disconnect WiFi
    [ ] Reload app → loads from cache
    [ ] Open admin mode → works
    [ ] Try to load webapp → network error (expected)
    [ ] Reconnect WiFi → auto-retry succeeds
    
[ ] 8. iOS Gestures
    [ ] Multi-touch → prevented
    [ ] Long press → no context menu
    [ ] Double-tap → no zoom
    [ ] Pinch → no zoom
    
[ ] 9. Data Persistence
    [ ] Add 3 webapps, set default
    [ ] Close PWA completely
    [ ] Reopen → default webapp loads automatically
    [ ] Admin mode → all 3 webapps still there
    
[ ] 10. Edge Cases
    [ ] Add webapp, delete all → welcome screen
    [ ] Add 10 webapps → list scrolls
    [ ] Very long webapp name (50 chars) → displays correctly
    [ ] Very long URL → truncates in display
```

- [ ] **Step 3: Create test-hidden-touch.html removal**

```bash
# Remove test file (no longer needed)
git rm test-hidden-touch.html
```

- [ ] **Step 4: Final code review**

Check for:
- [ ] No console.log in production code (or add conditional)
- [ ] No placeholder alerts (all replaced with real UI)
- [ ] All event listeners properly attached
- [ ] No memory leaks (detach listeners if needed)
- [ ] Consistent code style
- [ ] All error cases handled

- [ ] **Step 5: Commit final polish**

```bash
git add README.md
git rm test-hidden-touch.html
git commit -m "docs: update README with complete usage guide

- Add installation instructions for iPad PWA
- Document initial setup and usage
- Add troubleshooting and limitations
- Remove test files
- Complete production-ready documentation

Co-Authored-By: Claude <noreply@anthropic.com>"
```

- [ ] **Step 6: Create final release commit**

```bash
git commit --allow-empty -m "release: Kiosk WebApp Manager v1.0.0

Complete iPad PWA kiosk system with:
- Fullscreen webapp display (kiosk mode)
- Hidden touch admin access (configurable)
- Webapp CRUD with localStorage
- Auto-retry on network errors
- Offline-first PWA architecture
- iOS gesture prevention

All 10 success criteria met ✅

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Plan Complete

**Next Steps:**

1. **Push to repository:**
   ```bash
   git push -u origin claude/create-pwa-wrapper-011CUKVcBzoFfUFSYsYSxth7
   ```

2. **Deploy to hosting:**
   - GitHub Pages: Enable in repo settings
   - Netlify: Connect repo and deploy
   - Vercel: Import project

3. **Test on actual iPad:**
   - Install PWA
   - Complete E2E test checklist
   - Verify all features in production environment

4. **Optional enhancements** (out of scope):
   - Generate custom icons (design tool or Figma)
   - Add usage analytics
   - Implement remote config sync
   - Add PIN protection option

---

**Success Criteria Checklist:**

1. ✅ iPad에 PWA 설치 가능
2. ✅ 키오스크 모드에서 웹앱 전체화면 표시
3. ✅ 히든 터치로 관리 모드 진입
4. ✅ 웹앱 추가/편집/삭제 가능
5. ✅ 기본 웹앱 설정 및 자동 로드
6. ✅ 네트워크 오류 시 자동 재시도
7. ✅ 완전 오프라인 작동 (앱 자체)
8. ✅ 새 창/팝업 차단
9. ✅ iOS 제스처 충돌 방지
10. ✅ 설정 변경 가능 (히든 터치 위치, 재시도 설정)
