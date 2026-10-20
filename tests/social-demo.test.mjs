import test from 'node:test';
import assert from 'node:assert/strict';
import {
  activeSocialUser, addSocialComment, createSeedSocialState, createSocialPost,
  deleteSocialComment, deleteSocialPost, editSocialPost, isFollowing, reportSocialPost, socialPost, socialPostsForExperience, socialState,
  switchSocialUser, toSocialFirebaseFixture, toggleSocialFollow, toggleSocialLike,
  toggleSocialSave,
} from '../src/features/social/repository.js';
import { rankSocialPosts, relatedSocialPosts, recommendedSocialUsers, socialSafetyScore, trendingSocialTopics } from '../src/features/social/intelligence.js';

const store = new Map();
globalThis.localStorage = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => { store.set(key, value); },
};

test('seeded community has stable linked users, posts and interactions', () => {
  const seed = createSeedSocialState();
  assert.equal(seed.users.length, 12);
  assert.equal(seed.users.find((user) => user.id === 'guide-sumbawa-demo')?.guideId, 'guide-sumbawa-demo');
  assert.ok(seed.posts.length >= 6);
  for (const post of seed.posts) {
    assert.ok(seed.users.some((user) => user.id === post.authorId));
    assert.ok(post.likedBy.every((id) => seed.users.some((user) => user.id === id)));
    assert.ok(post.comments.every((comment) => seed.users.some((user) => user.id === comment.authorId)));
  }
  assert.ok(seed.posts.some((post) => post.media.length > 1));
});

test('switching demo accounts changes whose likes, saves and follows are toggled', () => {
  assert.equal(activeSocialUser().id, 'rahman');
  const post = socialPost('post-pantheon');
  assert.equal(post.likedBy.includes('rahman'), true);
  assert.equal(toggleSocialLike(post.id), true);
  assert.equal(post.likedBy.includes('rahman'), false);
  assert.equal(toggleSocialSave(post.id), true);
  assert.equal(post.savedBy.includes('rahman'), true);
  assert.equal(isFollowing('maya'), true);
  assert.equal(toggleSocialFollow('maya'), true);
  assert.equal(isFollowing('maya'), false);
  assert.equal(switchSocialUser('maya'), true);
  assert.equal(activeSocialUser().id, 'maya');
  assert.equal(post.likedBy.includes('maya'), true);
  assert.equal(toggleSocialLike(post.id), true);
  assert.equal(post.likedBy.includes('maya'), false);
});

test('comments and posts keep author identity and self-only deletion', () => {
  assert.equal(addSocialComment('post-agafay', '  Wonderful trip!  '), true);
  assert.equal(socialPost('post-agafay').comments.at(-1).authorId, 'maya');
  const commentId = socialPost('post-agafay').comments.at(-1).id;
  assert.equal(addSocialComment('post-agafay', 'A reply from the trail!', commentId), true);
  assert.equal(socialPost('post-agafay').comments.at(-1).parentId, commentId);
  const replyId = socialPost('post-agafay').comments.at(-1).id;
  assert.equal(deleteSocialComment('post-agafay', replyId), true);
  assert.equal(deleteSocialComment('post-agafay', commentId), true);
  const created = createSocialPost({ caption: '  One more adventure  ', location: 'Split', imageKey: 'kayaking', experienceId: 'kayaking' });
  assert.equal(created.authorId, 'maya');
  assert.equal(created.caption, 'One more adventure');
  assert.equal(socialPostsForExperience('kayaking').some((post) => post.id === created.id), true);
  assert.equal(editSocialPost(created.id, { caption: 'Updated caption', location: 'Croatia' }), true);
  assert.equal(socialPost(created.id).caption, 'Updated caption');
  const photoOnly = createSocialPost({ caption: '', location: 'Split', imageKey: 'kayaking' });
  assert.equal(photoOnly.caption, '');
  const carousel = createSocialPost({ caption: 'A carousel', location: 'Split', media: [{ imageKey: 'kayaking' }, { imageKey: 'kayakingSunset' }] });
  assert.equal(carousel.media.length, 2);
  assert.equal(switchSocialUser('rahman'), true);
  assert.equal(editSocialPost(created.id, { caption: 'Wrong owner', location: 'Elsewhere' }), false);
  assert.equal(deleteSocialPost(created.id), false);
  assert.equal(reportSocialPost(created.id), true);
  assert.equal(reportSocialPost(created.id), false);
  assert.equal(switchSocialUser('maya'), true);
  assert.equal(deleteSocialPost(created.id), true);
  assert.equal(socialPost(created.id), undefined);
});

test('Firebase export separates relationships and keeps photos/posts unpublished', () => {
  const exported = toSocialFirebaseFixture(socialState());
  assert.ok(exported.likes.length > 0);
  assert.ok(exported.saves.length > 0);
  assert.ok(exported.follows.length > 0);
  assert.equal(exported.socialPosts[0].status, 'draft');
  assert.equal(Array.isArray(exported.socialPosts[0].media), true);
  assert.equal(exported.socialPosts[0].media[0].storagePath, null);
  assert.equal('likedBy' in exported.socialPosts[0], false);
  assert.equal('localImage' in exported.socialPosts[0], false);
  assert.equal(exported.reports[0].reporterId, 'rahman');
});

test('Vibes Intelligence ranks content, matches people, finds related travel and flags safety signals', () => {
  const seed = createSeedSocialState();
  const ranked = rankSocialPosts(seed.posts, seed.activeUserId, seed.follows);
  assert.equal(ranked.length, seed.posts.length);
  assert.ok(ranked.some(({ reason }) => reason.includes('follow') || reason.includes('like') || reason.includes('Popular')));
  assert.ok(recommendedSocialUsers(seed.users, seed.posts, seed.follows, seed.activeUserId).every(({ user }) => user.id !== seed.activeUserId));
  assert.ok(relatedSocialPosts(seed.posts[0], seed.posts).some(({ post }) => post.id === 'post-kayak-sunset'));
  assert.ok(trendingSocialTopics(seed.posts).some(({ topic }) => topic === 'kayaking'));
  assert.equal(socialSafetyScore(seed.posts[0], [{ postId: seed.posts[0].id, status: 'open' }, { postId: seed.posts[0].id, status: 'open' }]).label, 'Needs review');
});

test('fresh posts stay above older viral posts while AI still ranks the older feed', () => {
  const seed = createSeedSocialState();
  const fresh = { ...seed.posts[0], id: 'post-fresh', createdAt: new Date().toISOString(), likedBy: [], savedBy: [], comments: [] };
  const ranked = rankSocialPosts([...seed.posts, fresh], seed.activeUserId, seed.follows);
  assert.equal(ranked[0].post.id, 'post-fresh');
  assert.equal(ranked[0].reason, 'Just posted');
  assert.ok(ranked.some(({ post }) => post.id === 'post-kayak-night'));
});
