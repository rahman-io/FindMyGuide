import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSeedRecommendationState, getRecommendedExperiences, toRecommendationFirebaseFixture, trackExperienceView, trackSearch, trackSocialBookingOpen, trackSocialSignal } from '../src/features/recommendations/repository.js';

const store = new Map();
globalThis.localStorage = { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };

test('recommendation engine ranks experiences from local behavior and exports Firebase-ready events', () => {
  assert.equal(createSeedRecommendationState().schemaVersion, 1);
  const catalog = [
    { id: 'colosseum', city: 'Rome', label: 'Guided tour', price: 55, duration: '2 hours', rating: '4.8', reviews: '92,692', featured: true },
    { id: 'vatican', city: 'Rome', label: 'Skip the line', price: 66, duration: '2 - 3 hours', rating: '4.3', reviews: '85,818' },
    { id: 'sumo', city: 'Tokyo', label: 'Cultural experience', price: 35, duration: '75 minutes', rating: '4.9', reviews: '9,101' },
  ];
  trackSearch('Rome');
  trackExperienceView('colosseum', catalog[0]);
  trackSocialSignal({ id: 'post-1', experienceId: 'colosseum' }, 'like');
  trackSocialBookingOpen('colosseum', catalog[0]);
  const results = getRecommendedExperiences({ wishlist: ['vatican'] }, catalog);
  assert.ok(results.length > 0);
  assert.equal(results.some(({ experience }) => experience.id === 'vatican'), false);
  assert.ok(results.some(({ reason }) => reason.includes('Rome')));
  const fixture = toRecommendationFirebaseFixture();
  assert.equal(fixture.recommendationEvents[0].userId, 'demo-user');
  assert.equal(fixture.recommendationEvents[0].schemaVersion, 1);
  assert.ok(fixture.recommendationEvents.some((event) => event.type === 'social_like' && event.experienceId === 'colosseum'));
  assert.ok(fixture.recommendationEvents.some((event) => event.type === 'social_booking_open' && event.experienceId === 'colosseum'));
});
