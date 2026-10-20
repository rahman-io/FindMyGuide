import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { serverTimestamp } from 'firebase/firestore';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';

const env = await initializeTestEnvironment({
  projectId: 'demo-lombok-transfer',
  firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') },
  storage: { rules: readFileSync(new URL('../storage.rules', import.meta.url), 'utf8') },
});

const guest = env.unauthenticatedContext();
const user = env.authenticatedContext('user-1');
const anotherUser = env.authenticatedContext('user-2');
const guide = env.authenticatedContext('guide-1');
const owner = env.authenticatedContext('owner-1');
const admin = env.authenticatedContext('admin-1', { admin: true });
const doc = (context, path) => context.firestore().doc(path);

await env.withSecurityRulesDisabled(async (context) => {
  const db = context.firestore();
  const batch = db.batch();
  for (const [path, value] of Object.entries({
    'users/user-1': { displayName: 'User one' },
    'users/user-2': { displayName: 'User two' },
    'organizations/org-1': { status: 'draft' },
    'organizations/org-1/members/owner-1': { active: true, roles: ['owner'] },
    'experiences/public-tour': { status: 'published', organizationId: 'org-1', guideIds: [] },
    'experiences/draft-tour': { status: 'draft', organizationId: 'org-1', guideIds: ['guide-1'] },
    'bookings/booking-1': { userId: 'user-1', organizationId: 'org-1' },
    'guideAssignments/assignment-1': { guideId: 'guide-1', organizationId: 'org-1' },
    'reviews/approved-review': { status: 'approved', userId: 'user-1' },
    'reviews/draft-review': { status: 'draft', userId: 'user-1' },
    'media/draft-image': { status: 'draft', organizationId: 'org-1' },
    'socialProfiles/user-1': { username: 'traveler.one', displayName: 'Traveler One', role: 'traveler' },
    'socialProfiles/user-2': { username: 'traveler.two', displayName: 'Traveler Two', role: 'traveler' },
    'socialPosts/social-post-1': { authorId: 'user-1', status: 'published', caption: 'A day outside', media: { storagePath: 'public/social/user-1/photo.webp' } },
    'socialPosts/social-post-hidden': { authorId: 'user-1', status: 'hidden', caption: 'Hidden', media: { storagePath: 'public/social/user-1/hidden.webp' } },
    'conversations/thread-1': { id: 'thread-1', schemaVersion: 1, participantIds: ['user-1', 'user-2'], context: null, status: 'active', createdAt: new Date(), updatedAt: new Date(), lastMessageAt: new Date(), lastMessagePreview: 'Hello from the trip.' },
    'conversations/thread-1/messages/message-1': { id: 'message-1', conversationId: 'thread-1', senderId: 'user-1', text: 'Hello from the trip.', createdAt: new Date(), readBy: ['user-1'] },
  })) batch.set(db.doc(path), value);
  await batch.commit();
});

test('published catalog is public; drafts are scoped to guide, owner, or admin', async () => {
  await assertSucceeds(doc(guest, 'experiences/public-tour').get());
  await assertFails(doc(guest, 'experiences/draft-tour').get());
  await assertFails(doc(user, 'experiences/draft-tour').get());
  await assertSucceeds(doc(guide, 'experiences/draft-tour').get());
  await assertSucceeds(doc(owner, 'experiences/draft-tour').get());
  await assertSucceeds(doc(admin, 'experiences/draft-tour').get());
  await assertFails(doc(guest, 'media/draft-image').get());
  await assertSucceeds(doc(owner, 'media/draft-image').get());
});

test('personal data and bookings cannot be read across users', async () => {
  await assertSucceeds(doc(user, 'users/user-1').get());
  await assertFails(doc(anotherUser, 'users/user-1').get());
  await assertSucceeds(doc(user, 'bookings/booking-1').get());
  await assertFails(doc(anotherUser, 'bookings/booking-1').get());
  await assertFails(doc(guide, 'bookings/booking-1').get());
  await assertSucceeds(doc(owner, 'bookings/booking-1').get());
  await assertSucceeds(doc(guide, 'guideAssignments/assignment-1').get());
  await assertFails(doc(user, 'guideAssignments/assignment-1').get());
  await assertSucceeds(doc(guest, 'reviews/approved-review').get());
  await assertFails(doc(guest, 'reviews/draft-review').get());
});

test('clients cannot grant roles or alter trusted catalog data', async () => {
  await assertFails(doc(user, 'organizations/org-1/members/user-1').set({ active: true, roles: ['owner'] }));
  await assertFails(doc(owner, 'organizations/org-1/members/user-1').set({ active: true, roles: ['manager'] }));
  await assertFails(doc(owner, 'experiences/draft-tour').update({ status: 'published' }));
  await assertFails(doc(user, 'bookings/booking-1').update({ status: 'paid' }));
  await assertSucceeds(doc(admin, 'experiences/draft-tour').update({ title: 'Reviewed draft' }));
});

test('wishlist writes are self-scoped', async () => {
  const wishlist = doc(user, 'users/user-1/wishlists/public-tour');
  await assertSucceeds(wishlist.set({ experienceId: 'public-tour', createdAt: serverTimestamp() }));
  await assertFails(doc(anotherUser, 'users/user-1/wishlists/other-tour').set({ experienceId: 'other-tour', createdAt: serverTimestamp() }));
  await assertFails(wishlist.update({ experienceId: 'draft-tour' }));
  await assertSucceeds(wishlist.delete());
});

test('recommendation events are private and append-only per user', async () => {
  const event = {
    id: 'event-1', userId: 'user-1', type: 'view', experienceId: 'public-tour',
    city: 'Rome', label: 'Guided tour', price: 55, duration: '2 hours',
    createdAt: serverTimestamp(), schemaVersion: 1,
  };
  await assertSucceeds(doc(user, 'users/user-1/recommendationEvents/event-1').set(event));
  await assertFails(doc(anotherUser, 'users/user-1/recommendationEvents/event-2').set({ ...event, id: 'event-2' }));
  await assertFails(doc(user, 'users/user-1/recommendationEvents/event-1').update({ type: 'search' }));
  await assertSucceeds(doc(admin, 'users/user-1/recommendationEvents/event-1').get());
});

test('only admins can upload approved image types to public storage', async () => {
  const imagePath = 'public/experiences/public-tour/test.webp';
  await assertFails(guest.storage().ref(imagePath).putString('image', 'raw', { contentType: 'image/webp' }));
  await assertFails(user.storage().ref(imagePath).putString('image', 'raw', { contentType: 'image/webp' }));
  await assertFails(admin.storage().ref('public/experiences/public-tour/test.txt').putString('text', 'raw', { contentType: 'text/plain' }));
  await assertSucceeds(admin.storage().ref(imagePath).putString('image', 'raw', { contentType: 'image/webp' }));
  await assertSucceeds(guest.storage().ref(imagePath).getDownloadURL());
});

test('social posts are public but ownership and moderation stay separate', async () => {
  await assertSucceeds(doc(guest, 'socialPosts/social-post-1').get());
  await assertFails(doc(guest, 'socialPosts/social-post-hidden').get());
  await assertSucceeds(doc(user, 'socialPosts/social-post-hidden').get());
  await assertFails(doc(anotherUser, 'socialPosts/social-post-1').update({ caption: 'Changed' }));
  await assertFails(doc(user, 'socialPosts/social-post-1').update({ status: 'hidden' }));
  await assertSucceeds(doc(user, 'socialPosts/social-post-1').update({ caption: 'Updated caption' }));
  await assertSucceeds(doc(admin, 'socialPosts/social-post-1').update({ status: 'hidden' }));
  await assertFails(doc(guest, 'socialPosts/social-post-1').get());
  await assertSucceeds(doc(admin, 'socialPosts/social-post-1').update({ status: 'published' }));
});

test('a user can publish only their own post with their own media path', async () => {
  const draft = {
    id: 'social-post-2', authorId: 'user-2', schemaVersion: 1,
    status: 'published', caption: 'New travel moment', location: 'Lombok',
    media: { storagePath: 'public/social/user-2/trip.webp', needsUpload: false },
    experienceId: null, createdAt: serverTimestamp(),
  };
  await assertFails(doc(anotherUser, 'socialPosts/social-post-2').set({ ...draft, media: { storagePath: 'public/social/user-1/trip.webp', needsUpload: false } }));
  await assertFails(doc(user, 'socialPosts/social-post-2').set(draft));
  await assertSucceeds(doc(anotherUser, 'socialPosts/social-post-2').set(draft));
});

test('likes, comments, saves and follows are actor-scoped', async () => {
  await assertSucceeds(doc(anotherUser, 'socialPosts/social-post-1/likes/user-2').set({ userId: 'user-2', createdAt: serverTimestamp() }));
  await assertFails(doc(user, 'socialPosts/social-post-1/likes/user-2').delete());
  await assertSucceeds(doc(anotherUser, 'socialPosts/social-post-1/comments/comment-test').set({ authorId: 'user-2', text: 'Looks beautiful', createdAt: serverTimestamp() }));
  await assertFails(doc(user, 'socialPosts/social-post-1/comments/comment-test').update({ text: 'Changed' }));
  await assertSucceeds(doc(anotherUser, 'socialPosts/social-post-1/comments/comment-test').update({ text: 'Wonderful' }));
  await assertSucceeds(doc(anotherUser, 'users/user-2/socialSaves/social-post-1').set({ postId: 'social-post-1', createdAt: serverTimestamp() }));
  await assertFails(doc(user, 'users/user-2/socialSaves/social-post-1').delete());
  await assertSucceeds(doc(anotherUser, 'socialProfiles/user-1/followers/user-2').set({ followerId: 'user-2', followingId: 'user-1', createdAt: serverTimestamp() }));
  await assertFails(doc(user, 'socialProfiles/user-1/followers/user-2').delete());
});

test('users can report, but only admin can review reports and change roles', async () => {
  await assertSucceeds(doc(anotherUser, 'socialReports/report-1').set({ postId: 'social-post-1', reporterId: 'user-2', reason: 'spam', status: 'open', createdAt: serverTimestamp() }));
  await assertFails(doc(user, 'socialReports/report-1').get());
  await assertSucceeds(doc(admin, 'socialReports/report-1').get());
  await assertFails(doc(anotherUser, 'socialReports/report-1').update({ status: 'closed' }));
  await assertFails(doc(anotherUser, 'socialProfiles/user-2').update({ role: 'admin' }));
  await assertSucceeds(doc(admin, 'socialProfiles/user-2').update({ role: 'guide' }));
});

test('social photo upload is limited to the signed-in owner', async () => {
  const path = 'public/social/user-1/trip.webp';
  await assertFails(guest.storage().ref(path).putString('photo', 'raw', { contentType: 'image/webp' }));
  await assertFails(anotherUser.storage().ref(path).putString('photo', 'raw', { contentType: 'image/webp' }));
  await assertSucceeds(user.storage().ref(path).putString('photo', 'raw', { contentType: 'image/webp' }));
  await assertSucceeds(guest.storage().ref(path).getDownloadURL());
});

test('conversation access is limited to participants while messages stay actor-scoped', async () => {
  await assertSucceeds(doc(user, 'conversations/thread-1').get());
  await assertSucceeds(doc(anotherUser, 'conversations/thread-1').get());
  await assertFails(doc(guide, 'conversations/thread-1').get());
  await assertFails(doc(guest, 'conversations/thread-1').get());
  await assertSucceeds(doc(user, 'conversations/thread-1/messages/message-1').get());
  await assertFails(doc(guide, 'conversations/thread-1/messages/message-1').get());
  await assertSucceeds(doc(anotherUser, 'conversations/thread-1/messages/message-2').set({
    id: 'message-2', conversationId: 'thread-1', senderId: 'user-2', text: 'Nice!', createdAt: serverTimestamp(), readBy: ['user-2'],
  }));
  await assertFails(doc(user, 'conversations/thread-1/messages/message-3').set({
    id: 'message-3', conversationId: 'thread-1', senderId: 'user-2', text: 'Spoofed sender', createdAt: serverTimestamp(), readBy: ['user-2'],
  }));
  await assertSucceeds(doc(anotherUser, 'conversations/thread-1/messages/message-1').update({ readBy: ['user-1', 'user-2'] }));
  await assertFails(doc(guide, 'conversations/thread-1/messages/message-1').update({ readBy: ['guide-1'] }));
});

test.after(async () => {
  await env.cleanup();
});
