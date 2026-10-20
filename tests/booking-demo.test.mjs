import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDemoQuote, demoBookingData, formatDemoPrice } from '../src/features/experiences/booking-demo.js';

const sumo = { id: 'sumo', price: 35 };

test('demo quote updates with adult and child counts', () => {
  assert.equal(calculateDemoQuote(sumo, { adults: 1, children: 0 }).total, 35);
  assert.equal(calculateDemoQuote(sumo, { adults: 4, children: 1 }).total, 165);
});

test('demo quote updates with selected weekday and keeps cents precise', () => {
  assert.deepEqual(calculateDemoQuote(sumo, { adults: 4, children: 1, date: '2026-10-17' }), {
    adultPrice: 40.25,
    childPrice: 28.75,
    total: 189.75,
  });
  assert.equal(formatDemoPrice(189.75), '$189.75');
});

test('popular days are optional per experience', () => {
  assert.deepEqual(demoBookingData.skydiving.popularDays, [4, 6]);
  assert.equal(demoBookingData.pantheon.popularDays, undefined);
});
