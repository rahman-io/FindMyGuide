import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

test('public group starts empty, opens for its first member, and counts only people who join', async () => {
  const values = new Map();
  globalThis.localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'silent' });
  try {
    const { experienceView } = await vite.ssrLoadModule('/src/features/experience-detail/view.js');
    const { chatView } = await vite.ssrLoadModule('/src/features/messaging/view.js');
    const { getOrCreateTravelGroupThread, publicTravelGroup, leaveTravelGroupThread, chatMessages, chatThread } = await vite.ssrLoadModule('/src/features/messaging/repository.js');
    const { switchSocialUser } = await vite.ssrLoadModule('/src/features/social/repository.js');
    const id = 'sumbawa-open-trip-3d2n';

    assert.match(experienceView(id), /Be the first to join/);
    assert.match(experienceView(id), /Join public group/);
    assert.match(experienceView('pulau-kenawa'), /Join public group/);
    assert.doesNotMatch(experienceView(id), /traveler[s]? joined/);
    const threadId = getOrCreateTravelGroupThread(id, 'Sumbawa · Open trip');
    assert.equal(threadId, `group-${id}`);
    assert.deepEqual(publicTravelGroup(id).participantIds, ['rahman']);
    assert.equal(chatMessages(threadId).length, 0);
    assert.match(chatView(threadId), /Be the first to ask a question/);
    assert.match(experienceView(id), /1 traveler joined/);
    assert.match(experienceView(id), /Open public group/);

    assert.equal(switchSocialUser('maya'), true);
    assert.match(experienceView(id), /Join public group/);
    assert.equal(chatThread(threadId), undefined);
    assert.equal(getOrCreateTravelGroupThread(id, 'Sumbawa · Open trip'), threadId);
    assert.deepEqual(publicTravelGroup(id).participantIds, ['rahman', 'maya']);
    assert.match(experienceView(id), /2 travelers joined/);
    assert.equal(leaveTravelGroupThread(threadId), true);
    assert.deepEqual(publicTravelGroup(id).participantIds, ['rahman']);
    assert.match(experienceView(id), /Join public group/);
  } finally {
    await vite.close();
    delete globalThis.localStorage;
  }
});

test('old seeded public group members are removed without touching a private trip group', async () => {
  const values = new Map();
  const publicId = 'group-sumbawa-open-trip-3d2n';
  const privateId = 'trip-demo-sumbawa-open-trip-3d2n';
  values.set('lombok-chat-demo-v1', JSON.stringify({ schemaVersion: 1, threads: [
    { id: publicId, participantIds: ['rahman', 'maya', 'dario'], group: true, title: 'Sumbawa', context: { experienceId: 'sumbawa-open-trip-3d2n', label: 'Sumbawa' }, unreadBy: { rahman: 1, maya: 0, dario: 0 }, status: 'active', lastMessageId: 'welcome' },
    { id: privateId, participantIds: ['guide-sumbawa-demo', 'rahman'], group: true, title: 'Private trip', context: { experienceId: 'sumbawa-open-trip-3d2n', offerId: 'demo-sumbawa-open-trip-3d2n' }, unreadBy: {}, status: 'active' },
  ], messages: [{ id: 'welcome', threadId: publicId, senderId: 'maya', text: 'Welcome to the Sumbawa traveler group. Compare dates and plan together here.', createdAt: '2026-10-15T00:00:00Z', readBy: ['maya'] }] }));
  globalThis.localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'silent' });
  try {
    const { publicTravelGroup, chatMessages } = await vite.ssrLoadModule('/src/features/messaging/repository.js');
    assert.deepEqual(publicTravelGroup('sumbawa-open-trip-3d2n').participantIds, ['rahman']);
    assert.equal(chatMessages(publicId).length, 0);
    const migrated = JSON.parse(values.get('lombok-chat-demo-v1'));
    assert.equal(migrated.schemaVersion, 2);
    assert.deepEqual(migrated.threads.find((thread) => thread.id === privateId).participantIds, ['guide-sumbawa-demo', 'rahman']);
  } finally {
    await vite.close();
    delete globalThis.localStorage;
  }
});
