import test from 'node:test';
import assert from 'node:assert/strict';
import { detectInstallPlatform, isInstalledApp } from '../src/features/onboarding/install.js';

test('installation guidance identifies iPhone, iPad, and Android', () => {
  assert.equal(detectInstallPlatform('Mozilla/5.0 (iPhone)', 'iPhone', 5), 'ios');
  assert.equal(detectInstallPlatform('Mozilla/5.0 (Macintosh)', 'MacIntel', 5), 'ios');
  assert.equal(detectInstallPlatform('Mozilla/5.0 (Linux; Android 15)', 'Linux armv8l', 5), 'android');
  assert.equal(detectInstallPlatform('Mozilla/5.0 (Macintosh)', 'MacIntel', 0), 'desktop');
});

test('only an app display mode or iOS home-screen launch passes the install gate', () => {
  const previousWindow = globalThis.window;
  try {
    globalThis.window = { matchMedia: () => ({ matches: false }), navigator: { standalone: false } };
    assert.equal(isInstalledApp(), false);
    globalThis.window.matchMedia = (query) => ({ matches: query.includes('fullscreen') });
    assert.equal(isInstalledApp(), true);
    globalThis.window.matchMedia = () => ({ matches: false });
    globalThis.window.navigator.standalone = true;
    assert.equal(isInstalledApp(), true);
  } finally {
    globalThis.window = previousWindow;
  }
});
