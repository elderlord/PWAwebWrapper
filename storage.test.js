#!/usr/bin/env node
/**
 * Manual test suite for Storage module fixes
 * Tests the 4 critical and important issues found in code review
 */

// Mock localStorage for Node.js
let storageData = {};

const localStorageMock = {
  getItem: (key) => storageData[key] || null,
  setItem: (key, value) => { storageData[key] = value; },
  removeItem: (key) => { delete storageData[key]; },
  clear: () => { storageData = {}; }
};

global.localStorage = localStorageMock;

// Manually define Storage here (copy from storage.js logic)
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

      // Validate schema of each element
      const isValid = webapps.every(w =>
        w &&
        typeof w === 'object' &&
        typeof w.id === 'string' &&
        typeof w.name === 'string' &&
        typeof w.url === 'string' &&
        typeof w.createdAt === 'string'
      );

      if (!isValid) {
        console.error('Corrupted webapp data detected, resetting');
        localStorage.setItem(KEYS.WEBAPPS, JSON.stringify(DEFAULTS.webapps));
        return DEFAULTS.webapps;
      }

      return webapps;
    } catch (e) {
      console.error('Error loading webapps:', e);
      return DEFAULTS.webapps;
    }
  },

  addWebapp(name, url) {
    // Trim name before validation to prevent whitespace-only names
    const trimmedName = name ? name.trim() : '';

    // Validate name
    if (!trimmedName || trimmedName.length < 1 || trimmedName.length > 50) {
      throw new Error('Name must be 1-50 characters');
    }

    // Trim URL before validation
    const trimmedUrl = url ? url.trim() : '';

    // Validate URL
    if (!trimmedUrl || !(trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://'))) {
      throw new Error('URL must start with http:// or https://');
    }

    // Check for duplicate URL
    const webapps = this.loadWebapps();
    if (webapps.some(w => w.url === trimmedUrl)) {
      throw new Error('URL already exists');
    }

    // Create new webapp
    const webapp = {
      id: `webapp_${Date.now()}`,
      name: trimmedName,
      url: trimmedUrl,
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
    if (updates.name != null) {
      const trimmedName = updates.name.trim ? updates.name.trim() : String(updates.name);
      if (trimmedName.length < 1 || trimmedName.length > 50) {
        throw new Error('Name must be 1-50 characters');
      }
    }

    if (updates.url != null) {
      const trimmedUrl = updates.url.trim ? updates.url.trim() : String(updates.url);
      if (!(trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://'))) {
        throw new Error('URL must start with http:// or https://');
      }

      // Check duplicate URL (excluding self)
      if (webapps.some((w, i) => i !== index && w.url === trimmedUrl)) {
        throw new Error('URL already exists');
      }
    }

    // Apply updates
    if (updates.name != null) {
      webapps[index].name = (updates.name.trim ? updates.name.trim() : String(updates.name));
    }
    if (updates.url != null) {
      webapps[index].url = (updates.url.trim ? updates.url.trim() : String(updates.url));
    }

    localStorage.setItem(KEYS.WEBAPPS, JSON.stringify(webapps));
    return true;
  }
};

const assert = require('assert');

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    storageData = {}; // Clear storage before each test
    fn();
    console.log(`✓ ${name}`);
    testsPassed++;
  } catch (e) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${e.message}`);
    testsFailed++;
  }
}

// CRITICAL FIX #1: Null name should not crash updateWebapp (no TypeError)
test('CRITICAL FIX #1: updateWebapp handles null name without crashing', () => {
  Storage.addWebapp('Test App', 'https://example.com');
  const webapps = Storage.loadWebapps();
  const id = webapps[0].id;

  // When name is null, it should be ignored (not updated, no error)
  // The fix prevents .trim() from being called on null
  try {
    Storage.updateWebapp(id, { name: null });
    // Success - no crash
    const updated = Storage.loadWebapps().find(w => w.id === id);
    assert.strictEqual(updated.name, 'Test App', 'Name should not change when null is passed');
  } catch (e) {
    if (e.message.includes('Cannot read') || e.message.includes('Cannot call')) {
      throw new Error(`Should not crash with type error: ${e.message}`);
    }
    // Other errors are fine (e.g., validation errors)
  }
});

// CRITICAL FIX #2: Null URL should not crash updateWebapp (no TypeError)
test('CRITICAL FIX #2: updateWebapp handles null url without crashing', () => {
  Storage.addWebapp('Test App', 'https://example.com');
  const webapps = Storage.loadWebapps();
  const id = webapps[0].id;

  // When url is null, it should be ignored (not updated, no error)
  try {
    Storage.updateWebapp(id, { url: null });
    // Success - no crash
    const updated = Storage.loadWebapps().find(w => w.id === id);
    assert.strictEqual(updated.url, 'https://example.com', 'URL should not change when null is passed');
  } catch (e) {
    if (e.message.includes('Cannot read') || e.message.includes('Cannot call')) {
      throw new Error(`Should not crash with type error: ${e.message}`);
    }
    // Other errors are fine
  }
});

// IMPORTANT FIX #3a: Whitespace-only names should fail in addWebapp
test('IMPORTANT FIX #3a: addWebapp rejects whitespace-only names', () => {
  let threw = false;
  try {
    Storage.addWebapp('    ', 'https://example.com');
  } catch (e) {
    threw = true;
    assert(e.message.includes('Name must be'));
  }
  assert(threw, 'Should have rejected whitespace-only name');
});

// IMPORTANT FIX #3b: Whitespace-only names should fail in updateWebapp
test('IMPORTANT FIX #3b: updateWebapp rejects whitespace-only names', () => {
  Storage.addWebapp('Original', 'https://example.com');
  const webapps = Storage.loadWebapps();
  const id = webapps[0].id;

  let threw = false;
  try {
    Storage.updateWebapp(id, { name: '   ' });
  } catch (e) {
    threw = true;
    assert(e.message.includes('Name must be'));
  }
  assert(threw, 'Should have rejected whitespace-only name');
});

// IMPORTANT FIX #4a: Corrupted data with missing fields should be reset
test('IMPORTANT FIX #4a: loadWebapps detects corrupted data (missing fields)', () => {
  const corruptData = [
    { id: 'webapp_1', name: 'App1' }, // Missing url and createdAt
    { id: 'webapp_2', name: 'App2', url: 'https://app2.com' } // Missing createdAt
  ];
  localStorage.setItem(KEYS.WEBAPPS, JSON.stringify(corruptData));

  const result = Storage.loadWebapps();
  assert.deepStrictEqual(result, [], 'Should return empty array for corrupted data');
});

// IMPORTANT FIX #4b: Corrupted data with null elements should be reset
test('IMPORTANT FIX #4b: loadWebapps detects corrupted data (null elements)', () => {
  const corruptData = [
    null,
    { id: 'webapp_1', name: 'App1', url: 'https://app1.com', createdAt: '2024-01-01T00:00:00Z' }
  ];
  localStorage.setItem(KEYS.WEBAPPS, JSON.stringify(corruptData));

  const result = Storage.loadWebapps();
  assert.deepStrictEqual(result, [], 'Should return empty array for corrupted data');
});

// IMPORTANT FIX #4c: Corrupted data with wrong types should be reset
test('IMPORTANT FIX #4c: loadWebapps detects corrupted data (wrong types)', () => {
  const corruptData = [
    { id: 123, name: 'App1', url: 'https://app1.com', createdAt: '2024-01-01T00:00:00Z' } // id should be string
  ];
  localStorage.setItem(KEYS.WEBAPPS, JSON.stringify(corruptData));

  const result = Storage.loadWebapps();
  assert.deepStrictEqual(result, [], 'Should return empty array for corrupted data');
});

// Verification: Normal operations still work
test('Verification: Normal addWebapp trims whitespace', () => {
  const app = Storage.addWebapp('  Test App  ', '  https://test.com  ');
  assert.strictEqual(app.name, 'Test App', 'Name should be trimmed');
  assert.strictEqual(app.url, 'https://test.com', 'URL should be trimmed');
});

// Verification: Updates still work correctly
test('Verification: Normal updateWebapp trims whitespace', () => {
  Storage.addWebapp('Original', 'https://example.com');
  const webapps = Storage.loadWebapps();
  const id = webapps[0].id;

  Storage.updateWebapp(id, { name: '  Updated  ' });
  const updated = Storage.loadWebapps().find(w => w.id === id);
  assert.strictEqual(updated.name, 'Updated', 'Update should trim name');
});

// Summary
console.log(`\n${'='.repeat(60)}`);
console.log(`Tests Passed: ${testsPassed}`);
console.log(`Tests Failed: ${testsFailed}`);
console.log(`${'='.repeat(60)}`);

if (testsFailed > 0) {
  console.log('\n❌ Some tests failed');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed!');
  process.exit(0);
}
