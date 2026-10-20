import test from 'node:test';
import assert from 'node:assert/strict';
import { mainLayout } from '../src/layouts/MainLayout.js';

test('only the inbox layout uses the fixed chat shell when navigation is hidden', () => {
  const chat = mainLayout('<section>Chat</section>', 'Discover', { hideNavigation: true, className: 'inbox-shell' });
  const safety = mainLayout('<section>Safety</section>', 'Bookings', { hideNavigation: true });
  const guide = mainLayout('<section>Guide</section>', 'Profile', { hideNavigation: true, className: 'guide-shell' });

  assert.match(chat, /class="app-shell chat-app-shell"/);
  assert.match(safety, /class="app-shell no-navigation-shell"/);
  assert.doesNotMatch(safety, /chat-app-shell/);
  assert.match(guide, /class="app-shell no-navigation-shell"/);
  assert.doesNotMatch(guide, /chat-app-shell/);
});
