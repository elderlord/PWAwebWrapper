// js/hidden-touch.js
/**
 * HiddenTouchDetector
 * Detects rapid taps in specific screen zones to trigger admin mode
 * Prevents iOS system gestures from interfering
 */
class HiddenTouchDetector {
  constructor(config, onActivate) {
    this.zone = config.zone;           // 'top-left', 'top-right', etc.
    this.tapCount = config.tapCount;   // 3-10
    this.tapTimeout = config.tapTimeout; // ms
    this.onActivate = onActivate;      // callback function
    this.taps = [];                    // timestamps
    this.boundHandler = null;
    this.element = null;               // reference to attached element
  }

  /**
   * Attach touch detector to an element
   * @param {Element} element - DOM element to listen for touches
   */
  attachTo(element) {
    this.detach(); // Remove existing listener

    this.element = element;
    this.boundHandler = this._handleTouch.bind(this);
    element.addEventListener('touchstart', this.boundHandler, { passive: true });
  }

  /**
   * Detach touch detector from element
   */
  detach() {
    if (this.boundHandler && this.element) {
      this.element.removeEventListener('touchstart', this.boundHandler);
      this.boundHandler = null;
      this.element = null;
    }
  }

  /**
   * Update configuration and reset tap history
   * @param {Object} config - New configuration
   */
  updateConfig(config) {
    this.zone = config.zone;
    this.tapCount = config.tapCount;
    this.tapTimeout = config.tapTimeout;
    this.taps = []; // Reset tap history
  }

  /**
   * Handle touch start events
   * @private
   * @param {TouchEvent} event - Touch event
   */
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

  /**
   * Check if coordinates are in the active zone
   * @private
   * @param {number} x - Normalized x coordinate (0-1)
   * @param {number} y - Normalized y coordinate (0-1)
   * @returns {boolean} True if in zone
   */
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
}

/**
 * Prevent iOS system gestures that could interfere with the kiosk
 * - Multi-touch (iOS system gestures)
 * - Context menu (long press)
 * - Double-tap zoom
 * @static
 */
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
