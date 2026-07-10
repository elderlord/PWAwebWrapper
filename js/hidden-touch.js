// js/hidden-touch.js
/**
 * HiddenTouchDetector
 * Detects multiple gesture types to trigger admin mode:
 * 1. Rapid taps in specific screen zones
 * 2. Long press (3 seconds) anywhere
 * 3. 3-finger simultaneous tap
 */
class HiddenTouchDetector {
  constructor(config, onActivate) {
    this.zone = config.zone;           // 'top-left', 'top-right', etc.
    this.tapCount = config.tapCount;   // 3-10
    this.tapTimeout = config.tapTimeout; // ms
    this.onActivate = onActivate;      // callback function
    this.taps = [];                    // timestamps for tap detection
    this.element = null;               // reference to attached element

    // Gesture handlers
    this.boundTouchStart = null;
    this.boundTouchEnd = null;
    this.boundTouchMove = null;

    // Long press state
    this.longPressTimer = null;
    this.longPressDuration = 3000; // 3 seconds
    this.longPressStartPos = null;
    this.longPressMoveThreshold = 20; // pixels
  }

  /**
   * Attach touch detector to an element
   * @param {Element} element - DOM element to listen for touches
   */
  attachTo(element) {
    this.detach(); // Remove existing listener

    this.element = element;
    this.boundTouchStart = this._handleTouchStart.bind(this);
    this.boundTouchEnd = this._handleTouchEnd.bind(this);
    this.boundTouchMove = this._handleTouchMove.bind(this);

    element.addEventListener('touchstart', this.boundTouchStart, { passive: false });
    element.addEventListener('touchend', this.boundTouchEnd, { passive: true });
    element.addEventListener('touchmove', this.boundTouchMove, { passive: true });
  }

  /**
   * Detach touch detector from element
   */
  detach() {
    if (this.element) {
      if (this.boundTouchStart) {
        this.element.removeEventListener('touchstart', this.boundTouchStart);
      }
      if (this.boundTouchEnd) {
        this.element.removeEventListener('touchend', this.boundTouchEnd);
      }
      if (this.boundTouchMove) {
        this.element.removeEventListener('touchmove', this.boundTouchMove);
      }
      this.boundTouchStart = null;
      this.boundTouchEnd = null;
      this.boundTouchMove = null;
      this.element = null;
    }
    this._clearLongPress();
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
   * Detects: 3-finger tap, starts long press timer, zone-based tap counting
   * @private
   * @param {TouchEvent} event - Touch event
   */
  _handleTouchStart(event) {
    const touchCount = event.touches.length;

    // Method 3: 3-finger simultaneous tap
    if (touchCount === 3) {
      this._clearLongPress();
      this.taps = [];
      this.onActivate?.();
      return;
    }

    // Only process single touch for other methods
    if (touchCount !== 1) return;

    const touch = event.touches[0];
    const x = touch.clientX / window.innerWidth;
    const y = touch.clientY / window.innerHeight;

    // Method 2: Long press (3 seconds)
    this.longPressStartPos = { x: touch.clientX, y: touch.clientY };
    this._clearLongPress();
    this.longPressTimer = setTimeout(() => {
      this.taps = [];
      this.onActivate?.();
    }, this.longPressDuration);

    // Method 1: Zone-based rapid taps
    // Check if touch is in active zone
    if (!this._isInZone(x, y)) return;

    const now = Date.now();

    // Remove expired taps
    this.taps = this.taps.filter(t => now - t < this.tapTimeout);

    // Add new tap
    this.taps.push(now);

    // Check if threshold reached
    if (this.taps.length >= this.tapCount) {
      this._clearLongPress();
      this.taps = [];
      this.onActivate?.();
    }
  }

  /**
   * Handle touch end events
   * Clears long press timer when finger lifts
   * @private
   * @param {TouchEvent} event - Touch event
   */
  _handleTouchEnd(event) {
    this._clearLongPress();
  }

  /**
   * Handle touch move events
   * Cancels long press if finger moves too much
   * @private
   * @param {TouchEvent} event - Touch event
   */
  _handleTouchMove(event) {
    if (!this.longPressStartPos || !this.longPressTimer) return;
    if (event.touches.length !== 1) return;

    const touch = event.touches[0];
    const dx = touch.clientX - this.longPressStartPos.x;
    const dy = touch.clientY - this.longPressStartPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Cancel long press if moved beyond threshold
    if (distance > this.longPressMoveThreshold) {
      this._clearLongPress();
    }
  }

  /**
   * Clear long press timer and state
   * @private
   */
  _clearLongPress() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    this.longPressStartPos = null;
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
 * - Multi-touch (iOS system gestures) - EXCEPT 3-finger tap for admin mode
 * - Context menu (long press) - EXCEPT our 3-second long press for admin mode
 * - Double-tap zoom
 * @static
 */
HiddenTouchDetector.preventIOSGestures = function() {
  // Prevent multi-touch EXCEPT 3-finger tap (our admin gesture)
  document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1 && e.touches.length !== 3) {
      e.preventDefault();
    }
  }, { passive: false });

  // Prevent context menu, but allow our long press to work
  // Context menu fires after ~500ms, our long press is 3000ms
  // We'll prevent it to avoid conflicts
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
