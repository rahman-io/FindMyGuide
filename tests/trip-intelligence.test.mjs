import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildTripItinerary, coveredExperienceIds, getTripIntent, packageOptionForDays, toTripItineraryFirebaseFixture } from '../src/features/trip-intelligence/repository.js';

test('smart trip intent and itinerary use saved and social travel signals', () => {
  const experiences = [
    { id: 'pantheon', title: 'Pantheon ticket', city: 'Rome', label: 'Audio guide', price: 8, duration: '1 day', rating: '4.1' },
    { id: 'vatican', title: 'Vatican tour', city: 'Rome', label: 'Skip the line', price: 66, duration: '2 hours', rating: '4.3' },
    { id: 'colosseum', title: 'Colosseum tour', city: 'Rome', label: 'Skip the line', price: 55, duration: '2.5 hours', rating: '4.8' },
    { id: 'sumo', title: 'Sumo show', city: 'Tokyo', label: 'Cultural experience', price: 35, duration: '75 minutes', rating: '4.9' },
  ];
  const userState = { wishlist: ['pantheon', 'vatican'] };
  const socialContext = { userId: 'demo-user', posts: [{ experienceId: 'pantheon', likedBy: ['demo-user'], savedBy: [], comments: [] }] };
  const intent = getTripIntent(userState, experiences, socialContext);
  assert.equal(intent.destination, 'Rome');
  assert.equal(intent.id, 'culture');
  const itinerary = buildTripItinerary({ destination: 'Rome', days: 3, budget: 'mid', catalog: experiences, userState, socialContext });
  assert.equal(itinerary.schemaVersion, 2);
  assert.equal(itinerary.itinerary.length, 3);
  assert.equal(toTripItineraryFirebaseFixture(itinerary).status, 'draft');
});

test('smart itinerary recommends the package variant closest to the trip length', () => {
  const item = { id: 'rinjani', city: 'Lombok', title: 'Mount Rinjani trek', price: 120, duration: '2 days', rating: '4.8', packageOptions: [{ id: 'two-day', name: 'Two-day trek', days: 2, duration: '2 days · 1 night', price: 2500000, currency: 'IDR', pricingUnit: 'per person' }, { id: 'three-day', name: 'Three-day trek', days: 3, duration: '3 days · 2 nights', price: 4500000, currency: 'IDR', pricingUnit: 'per person' }] };
  assert.equal(packageOptionForDays(item, 3).id, 'three-day');
  const plan = buildTripItinerary({ destination: 'Lombok', days: 3, budget: 'mid', catalog: [item] });
  assert.equal(plan.packageCount, 1);
  assert.equal(plan.itinerary[0].packageOption.id, 'three-day');
});

test('smart itinerary keeps a multi-day guide package together and fills remaining days', () => {
  const catalog = [
    { id: 'sumbawa-open-trip-3d2n', title: 'Sumbawa Open Trip', city: 'Sumbawa', duration: '3 days · 2 nights', price: null, rating: 5, packageOptions: [{ id: 'sumbawa-open-trip-3d2n', name: 'Shared open trip', duration: '3 days · 2 nights', days: 3, price: 3500000, currency: 'IDR', pricingUnit: 'per person' }] },
    { id: 'pulau-kenawa', title: 'Pulau Kenawa Island Escape', city: 'Sumbawa', duration: 'Destination', price: null, rating: 4.8, packageOptions: [] },
    { id: 'moyo', title: 'Pulau Moyo Nature', city: 'Sumbawa', duration: 'Destination', price: null, rating: 4.7, packageOptions: [] },
  ];
  const plan = buildTripItinerary({ destination: 'Sumbawa', days: 5, budget: 'high', catalog });
  assert.deepEqual(plan.itinerary.map((item) => [item.experienceId, item.day, item.dayEnd]), [['sumbawa-open-trip-3d2n', 1, 3], ['pulau-kenawa', 4, 4], ['moyo', 5, 5]]);
});

test('smart itinerary removes destinations already covered by an open-trip route', () => {
  const route = { id: 'sumbawa-open-trip-3d2n', title: 'Sumbawa Open Trip: Kenawa, Moyo & Whale Sharks', city: 'Sumbawa', duration: '3 days · 2 nights', price: null, rating: 5, highlights: ['Pulau Kenawa', 'Pulau Moyo', 'Mata Jitu Waterfall', 'Whale shark boat activity'], itinerary: [{ title: 'Pulau Kenawa' }, { title: 'Pulau Moyo · Mata Jitu Waterfall' }, { title: 'Whale shark activity' }], packageOptions: [{ id: 'sumbawa-open-trip-3d2n', name: 'Shared open trip', duration: '3 days · 2 nights', days: 3, price: 3500000, currency: 'IDR', pricingUnit: 'per person' }] };
  const catalog = [route, { id: 'pulau-moyo', title: 'Pulau Moyo Nature & Snorkeling', city: 'Sumbawa', duration: 'Destination', price: null, rating: 4.8 }, { id: 'mata-jitu-waterfall', title: 'Mata Jitu Waterfall on Pulau Moyo', city: 'Sumbawa', duration: 'Destination', price: null, rating: 4.7 }, { id: 'sumbawa-coast', title: 'Sumbawa Coast Escape', city: 'Sumbawa', duration: 'Destination', price: null, rating: 4.6 }, { id: 'poto-tano', title: 'Poto Tano Harbour', city: 'Sumbawa', duration: 'Destination', price: null, rating: 4.5 }];
  assert.deepEqual(coveredExperienceIds(route, catalog), ['pulau-moyo', 'mata-jitu-waterfall']);
  const plan = buildTripItinerary({ destination: 'Sumbawa', days: 5, budget: 'high', catalog });
  assert.deepEqual(plan.itinerary.map((item) => [item.experienceId, item.day, item.dayEnd]), [['sumbawa-open-trip-3d2n', 1, 3], ['sumbawa-coast', 4, 4], ['poto-tano', 5, 5]]);
});

test('smart itinerary distinguishes approved guide departures from information-only places', () => {
  const catalog = [
    { id: 'sumbawa-open-trip-3d2n', title: 'Sumbawa Open Trip', city: 'Sumbawa', duration: '3 days · 2 nights', price: null, rating: 5, packageOptions: [{ id: 'sumbawa-open-trip-3d2n', name: 'Shared open trip', duration: '3 days · 2 nights', days: 3, price: 3500000, currency: 'IDR', pricingUnit: 'per person' }] },
    { id: 'pulau-kenawa', title: 'Pulau Kenawa Island Escape', city: 'Sumbawa', duration: 'Destination', price: null, rating: 4.8, packageOptions: [] },
  ];
  const plan = buildTripItinerary({ destination: 'Sumbawa', days: 3, budget: 'high', catalog });
  const bookable = plan.itinerary.find((item) => item.experienceId === 'sumbawa-open-trip-3d2n');
  const informationOnly = plan.itinerary.find((item) => item.experienceId === 'pulau-kenawa');
  assert.equal(bookable.bookingAvailable, true);
  assert.equal(bookable.nextAvailable.mode, 'shared');
  assert.equal(bookable.nextAvailable.priceUnit, 'person');
  assert.equal(informationOnly.bookingAvailable, false);
  assert.equal(informationOnly.nextAvailable, null);
});
