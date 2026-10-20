import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const styles = Object.fromEntries(readdirSync(new URL('../src/styles/', import.meta.url))
  .filter(name => name.endsWith('.css'))
  .map(name => [name, readFileSync(new URL(`../src/styles/${name}`, import.meta.url), 'utf8')]));
const tokens = styles['tokens.css'];

test('brand gradients share one palette across navigation, actions, loading and panels', () => {
  assert.match(tokens, /--ai-gradient:linear-gradient\(110deg,var\(--brand-gradient-start\),var\(--brand-gradient-middle\) 62%,var\(--brand-gradient-end\)\)/);
  for (const name of ['global.css', 'bottom-navigation.css', 'utilities.css', 'social.css', 'guides.css', 'travel-intelligence.css']) {
    assert.ok(styles[name].includes('var(--ai-gradient)'), name);
  }
  for (const name of ['booking-intelligence.css', 'trip-intelligence.css', 'travel-intelligence.css', 'guides.css']) {
    assert.ok(styles[name].includes('var(--ai-gradient-soft)'), name);
  }
  const navigation = readFileSync(new URL('../src/components/BottomNavigation.js', import.meta.url), 'utf8');
  for (const stop of ['start', 'middle', 'end']) {
    assert.ok(navigation.includes(`stop-color="var(--brand-gradient-${stop})"`));
  }
  assert.doesNotMatch(Object.values(styles).join('\n'), /--coral|#ffb02e|#ff6a3d|#feda75|#fa7e1e|#1680de/i);
});

test('shared color references resolve and status colors remain distinct', () => {
  const css = Object.values(styles).join('\n');
  const definitions = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(match => match[1]));
  // These are supplied dynamically by the existing avatar and chat components.
  const dynamic = new Set(['--avatar-color', '--chat-viewport-height', '--chat-viewport-top', '--chat-keyboard-offset']);
  for (const [, name] of css.matchAll(/var\((--[\w-]+)/g)) {
    assert.ok(definitions.has(name) || dynamic.has(name), `Undefined token ${name}`);
  }
  const semantic = ['blue', 'red', 'success', 'warning'].map(name => tokens.match(new RegExp(`--${name}:(#[a-f0-9]+)`))[1]);
  assert.equal(new Set(semantic).size, semantic.length);
  assert.match(styles['global.css'], /\.round-white\.saved svg,\.heart-button\.saved svg\{fill:var\(--red\);stroke:var\(--red\)\}/);
  assert.match(styles['travel-intelligence.css'], /\.travel-mission\.completed \.travel-mission-icon\{background:var\(--success-soft\);color:var\(--success\)\}/);
  assert.match(styles['messaging.css'], /\.chat-booking-status\.pending>span\{color:var\(--warning\)\}/);
});

test('primary and gradient colors retain readable contrast with white labels', () => {
  const luminance = hex => {
    const channels = hex.match(/[a-f\d]{2}/gi).map(value => parseInt(value, 16) / 255)
      .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  for (const name of ['blue', 'brand-gradient-start', 'brand-gradient-middle', 'brand-gradient-end']) {
    const color = tokens.match(new RegExp(`--${name}:(#[a-f0-9]+)`))[1];
    assert.ok(1.05 / (luminance(color) + 0.05) >= 4.5, name);
  }
});
