import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

test('traveler bookings show compact active and history cards that open their details', async () => {
  const values = new Map();
  globalThis.localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'silent' });
  try {
    const { travelerBookingsView, travelerBookingDetailView } = await vite.ssrLoadModule('/src/features/guides/view.js');
    const { state } = await vite.ssrLoadModule('/src/app/store.js');

    state.email = 'maya.demo@example.com';
    const active = travelerBookingsView();
    assert.match(active, /traveler-bookings-header/);
    assert.match(active, /traveler-booking-card/);
    assert.match(active, /Request sent/);
    assert.match(active, /href="#\/bookings\/demo-rinjani-pending"/);
    assert.doesNotMatch(active, /guide-request-split|Payment fee/);
    assert.match(travelerBookingDetailView('demo-rinjani-pending'), /Booking progress/);
    assert.match(travelerBookingsView('history'), /No past bookings yet/);

    state.email = 'sophie.demo@example.com';
    assert.match(travelerBookingsView(), /No active bookings yet/);
    const history = travelerBookingsView('history');
    assert.match(history, /Trip completed/);
    assert.match(history, /href="#\/bookings\/demo-gili-completed"/);
    assert.match(history, /aria-valuenow="100"/);
  } finally {
    await vite.close();
    delete globalThis.localStorage;
  }
});
