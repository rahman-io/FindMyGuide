import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSeedInboxState, getInboxUnreadCount, markInboxItemRead, toInboxFirebaseFixture } from '../src/features/inbox/repository.js';
import { getBookingLikelihood, getPriceAvailabilityAlerts, getSmartBundle } from '../src/features/booking-intelligence/repository.js';

const store = new Map();
globalThis.localStorage = { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };

test('unified inbox counts updates, Vibes activity and unread chats', () => {
  assert.ok(getInboxUnreadCount() >= 1);
  const before = getInboxUnreadCount();
  assert.equal(markInboxItemRead('update:epic-views'), true);
  assert.equal(getInboxUnreadCount(), before - 1);
  const fixture = toInboxFirebaseFixture(createSeedInboxState());
  assert.equal(fixture.notificationReads[0], undefined);
});

test('booking intelligence returns bundle, intent and alert data', () => {
  const item = { id: 'colosseum', title: 'Colosseum tour', city: 'Rome', label: 'Guided tour', price: 55, oldPrice: 69, rating: '4.8', featured: true, popularSearch: true, badge: 'Best match' };
  const catalog = [item, { id: 'vatican', title: 'Vatican tour', city: 'Rome', label: 'Skip the line', price: 66, rating: '4.3' }, { id: 'sumo', title: 'Sumo show', city: 'Tokyo', label: 'Cultural experience', price: 35, rating: '4.9' }];
  const bundle = getSmartBundle(item, catalog, { wishlist: ['vatican'] });
  assert.ok(bundle.items.length > 0);
  assert.ok(getBookingLikelihood(item, { wishlist: ['colosseum'] }).score > 50);
  assert.ok(getPriceAvailabilityAlerts(item).length > 0);
});
