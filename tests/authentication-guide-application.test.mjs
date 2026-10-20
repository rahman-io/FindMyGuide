import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { createServer } from 'vite';

test('demo traveler accounts sign up, sign in, and share one profile identity with guide applications', async () => {
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
  globalThis.window = { matchMedia: () => ({ matches: false }), navigator: { userAgent: 'Node test', platform: 'test', maxTouchPoints: 0, standalone: false } };
  if (!globalThis.crypto?.subtle) globalThis.crypto = webcrypto;
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'silent' });
  try {
    const auth = await vite.ssrLoadModule('/src/features/authentication/repository.js');
    const social = await vite.ssrLoadModule('/src/features/social/repository.js');
    const guides = await vite.ssrLoadModule('/src/features/guides/repository.js');
    const profile = await vite.ssrLoadModule('/src/features/profile/view.js');
    assert.equal(auth.demoAuthMode(), 'login');
    assert.match((await auth.loginTraveler({ email: 'new@example.com', password: 'password123' })).error, /Create an account first/);
    assert.match((await auth.registerTraveler({ name: 'New Traveler', email: 'not-an-email', password: 'password123' })).error, /valid email/);

    const created = await auth.registerTraveler({ name: 'New Traveler', email: 'new@example.com', password: 'password123' });
    assert.equal(created.user.role, 'traveler');
    assert.equal(created.user.accountEmail, 'new@example.com');
    assert.equal(auth.demoSession().userId, created.user.id);
    assert.equal(social.activeSocialUser().id, created.user.id);
    assert.equal(auth.demoAuthMode(), 'login');
    assert.match(profile.profileView(), /Become a guide/);
    assert.equal(JSON.stringify(values.get('lombok-demo-auth-accounts-v1')).includes('password123'), false);
    assert.match((await auth.loginTraveler({ email: 'new@example.com', password: 'wrongpass' })).error, /incorrect/);
    assert.match((await auth.registerTraveler({ name: 'New Traveler', email: 'new@example.com', password: 'password123' })).error, /already exists/);
    assert.equal((await auth.loginTraveler({ email: 'new@example.com', password: 'password123' })).user.id, created.user.id);

    const guide = guides.applyAsGuide({
      accountUserId: created.user.id,
      name: created.user.displayName,
      area: 'Sembalun',
      languages: 'Indonesian, English',
      bio: 'Local trekking guide',
      capacity: 6,
      associationName: 'HPI',
      associationId: 'DEMO-123',
      experienceIds: ['arena'],
    });
    assert.ok(guide);
    assert.equal(guide.status, 'pending');
    assert.equal(social.linkGuideApplication(created.user.id, guide.id), true);
    assert.equal(social.activeSocialUser().role, 'traveler');
    assert.equal(social.activeSocialUser().guideApplicationId, guide.id);
    assert.match(profile.profileView(), /Pending review/);

    const reviewed = guides.reviewGuideApplication(guide.id, 'approved');
    assert.equal(reviewed.status, 'verified');
    assert.equal(guides.packagePrice(reviewed, { id: 'rinjani-2d1n' }), null);
    assert.equal(social.setSocialUserGuideRole(created.user.id, guide.id, true), true);
    assert.equal(social.activeSocialUser().role, 'guide');
    assert.equal(social.activeSocialUser().guideId, guide.id);

    const google = auth.continueWithDemoProvider('google');
    assert.equal(google.user.role, 'traveler');
    assert.equal(auth.demoSession().provider, 'google');
    assert.match(google.user.accountEmail, /@demo\.example\.com$/);
    auth.signOutDemoAccount();
    assert.equal(auth.demoSession(), null);
  } finally {
    await vite.close();
    delete globalThis.localStorage;
    delete globalThis.window;
  }
});
