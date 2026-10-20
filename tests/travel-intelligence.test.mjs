import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSeedTravelIntelligenceState, getContextAwareNotifications, getGamificationSummary, getSmartReviewIntelligence, getTravelMissions, getTravelProfileIntelligence } from '../src/features/travel-intelligence/repository.js';

const store = new Map();
globalThis.localStorage = { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };

const catalog = [
  { id: 'pantheon', city: 'Rome', label: 'Audio guide', duration: '1 day', price: 8 },
  { id: 'kayaking', city: 'Split', label: 'Guided tour', duration: '2.5 hours', price: 52 },
  { id: 'sumo', city: 'Tokyo', label: 'Cultural experience', duration: '75 minutes', price: 35 },
];
const posts = [
  { id: 'post-1', authorId: 'rahman', location: 'Rome, Italy', experienceId: 'pantheon', likedBy: [], savedBy: [], comments: [] },
  { id: 'post-2', authorId: 'maya', location: 'Split, Croatia', experienceId: 'kayaking', likedBy: ['rahman'], savedBy: [], comments: [] },
];

test('travel intelligence creates missions, gamification and a behavioral profile', () => {
  assert.equal(createSeedTravelIntelligenceState().schemaVersion, 1);
  const context = { userState: { wishlist: ['pantheon', 'sumo'] }, posts, userId: 'rahman', catalog };
  const missions = getTravelMissions(context);
  assert.equal(missions.length, 3);
  assert.ok(getGamificationSummary(missions).points > 0);
  const profile = getTravelProfileIntelligence(context);
  assert.equal(profile.topCity, 'Rome');
  assert.ok(profile.confidence > 40);
});

test('smart review and context notifications are deterministic and Firebase-ready in shape', () => {
  const review = getSmartReviewIntelligence({ city: 'Rome', label: 'Audio guide', duration: '1 day', featured: true }, { rating: 5 });
  assert.equal(review.prompts.length, 3);
  const notifications = getContextAwareNotifications({ userState: { wishlist: ['pantheon'] }, posts, catalog, nowValue: new Date('2026-10-14T19:00:00Z') });
  assert.ok(notifications.some((notification) => notification.id === 'saved-plans'));
  assert.ok(notifications.some((notification) => notification.id === 'evening-inspiration'));
});
