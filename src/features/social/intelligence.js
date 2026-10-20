const topicStopWords = new Set(['the', 'and', 'with', 'from', 'this', 'that', 'your', 'our', 'for', 'one', 'more', 'into', 'like', 'you', 'are']);

const normalize = (value) => String(value || '').toLowerCase().trim();
const unique = (values) => [...new Set(values.filter(Boolean))];
const hoursSince = (value, now = Date.now()) => Math.max(0, (now - new Date(value).getTime()) / 36e5);

export function socialTopics(post) {
  const hashtags = String(post?.caption || '').match(/#[\p{L}\d_]+/gu)?.map((tag) => tag.slice(1).toLowerCase()) || [];
  const locationWords = normalize(post?.location).split(/[^\p{L}\d]+/u).filter((word) => word.length > 2 && !topicStopWords.has(word));
  return unique([...hashtags, ...locationWords]).slice(0, 6);
}

function engagement(post) {
  return post.likedBy.length * 1.5 + post.savedBy.length * 2.5 + post.comments.length * 3;
}

function preferenceProfile(posts, userId) {
  const topics = {};
  const authors = {};
  const experiences = {};
  for (const post of posts) {
    if (post.likedBy.includes(userId) || post.savedBy.includes(userId) || post.comments.some((comment) => comment.authorId === userId)) {
      for (const topic of socialTopics(post)) topics[topic] = (topics[topic] || 0) + 1;
      authors[post.authorId] = (authors[post.authorId] || 0) + 1;
      if (post.experienceId) experiences[post.experienceId] = (experiences[post.experienceId] || 0) + 1;
    }
  }
  return { topics, authors, experiences };
}

export function scoreSocialPost(post, { userId, follows = [], posts = [], now = Date.now() } = {}) {
  const profile = preferenceProfile(posts, userId);
  const followed = follows.some(([from, to]) => from === userId && to === post.authorId);
  const sharedTopics = socialTopics(post).filter((topic) => profile.topics[topic]);
  let score = Math.log1p(engagement(post)) + Math.max(0, 8 - hoursSince(post.createdAt, now) / 18);
  if (followed) score += 8;
  if (post.authorId === userId) score -= 2;
  if (profile.authors[post.authorId]) score += Math.min(5, profile.authors[post.authorId] * 2);
  if (post.experienceId && profile.experiences[post.experienceId]) score += 7;
  score += Math.min(8, sharedTopics.length * 3);
  return { score, sharedTopics };
}

export function rankSocialPosts(posts, userId, follows = []) {
  const now = Date.now();
  const freshnessWindow = 24 * 36e5;
  return posts.map((post) => {
    const ranking = scoreSocialPost(post, { userId, follows, posts, now });
    const isFresh = now - new Date(post.createdAt).getTime() <= freshnessWindow;
    const reason = isFresh ? 'Just posted' : ranking.sharedTopics.length ? `Because you like ${ranking.sharedTopics[0]}` : follows.some(([from, to]) => from === userId && to === post.authorId) ? 'From someone you follow' : 'Popular with travelers';
    return { post, score: ranking.score, reason, isFresh };
  }).sort((a, b) => Number(b.isFresh) - Number(a.isFresh) || (a.isFresh ? b.post.createdAt.localeCompare(a.post.createdAt) : b.score - a.score || b.post.createdAt.localeCompare(a.post.createdAt)));
}

export function recommendedSocialUsers(users, posts, follows, userId) {
  const followedIds = new Set(follows.filter(([from]) => from === userId).map(([, to]) => to));
  const profile = preferenceProfile(posts, userId);
  return users.filter((user) => user.id !== userId && !followedIds.has(user.id)).map((user) => {
    const userPosts = posts.filter((post) => post.authorId === user.id);
    const userTopics = unique(userPosts.flatMap(socialTopics));
    const sharedTopics = userTopics.filter((topic) => profile.topics[topic]);
    const mutuals = follows.filter(([source, target]) => source === user.id && followedIds.has(target)).length;
    const followerCount = follows.filter(([, target]) => target === user.id).length;
    const score = sharedTopics.length * 5 + mutuals * 4 + followerCount + (user.role === 'guide' ? 2 : 0);
    return { user, score, reason: sharedTopics.length ? `Travels like you in ${sharedTopics[0]}` : user.role === 'guide' ? 'Local guide worth following' : 'Popular traveler in the community' };
  }).sort((a, b) => b.score - a.score).slice(0, 3);
}

export function relatedSocialPosts(post, posts) {
  return posts.filter((candidate) => candidate.id !== post.id).map((candidate) => {
    const sameExperience = post.experienceId && candidate.experienceId === post.experienceId;
    const sharedTopics = socialTopics(post).filter((topic) => socialTopics(candidate).includes(topic));
    const sameLocation = normalize(post.location) && normalize(post.location) === normalize(candidate.location);
    const score = (sameExperience ? 12 : 0) + sharedTopics.length * 4 + (sameLocation ? 5 : 0) + Math.log1p(engagement(candidate));
    return { post: candidate, score };
  }).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
}

export function trendingSocialTopics(posts) {
  const counts = {};
  for (const post of posts) for (const topic of socialTopics(post)) counts[topic] = (counts[topic] || 0) + 1;
  return Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 6).map(([topic, count]) => ({ topic, count }));
}

export function socialBookingSignals(posts) {
  const signals = {};
  for (const post of posts) {
    if (!post.experienceId) continue;
    const entry = signals[post.experienceId] ||= { experienceId: post.experienceId, posts: 0, engagement: 0, topics: [] };
    entry.posts += 1;
    entry.engagement += engagement(post);
    entry.topics = unique([...entry.topics, ...socialTopics(post)]).slice(0, 4);
  }
  return Object.values(signals).map((signal) => ({ ...signal, score: signal.engagement + signal.posts * 4 })).sort((a, b) => b.score - a.score);
}

export function socialSafetyScore(post, reports = []) {
  const reportCount = reports.filter((report) => report.postId === post.id && report.status === 'open').length;
  const repeatedText = /free money|crypto|click here|urgent offer/i.test(post.caption || '');
  const score = Math.max(0, 100 - reportCount * 35 - (repeatedText ? 45 : 0));
  return { score, label: score >= 80 ? 'Healthy' : score >= 55 ? 'Review suggested' : 'Needs review', flags: [...(reportCount ? [`${reportCount} open report${reportCount > 1 ? 's' : ''}`] : []), ...(repeatedText ? ['Promotional wording'] : [])] };
}

export function socialModerationQueue(state) {
  return state.posts.filter((post) => post.status === 'published').map((post) => ({ post, safety: socialSafetyScore(post, state.reports) })).filter(({ safety }) => safety.score < 80).sort((a, b) => a.safety.score - b.safety.score);
}

export function rankSocialActivity(events, follows, userId) {
  return [...events].sort((a, b) => {
    const priority = (event) => (event.kind === 'comment' ? 3 : event.kind === 'follow' ? 2 : 1) + (follows.some(([from, to]) => from === userId && to === event.actorId) ? 1 : 0);
    return priority(b) - priority(a) || b.createdAt.localeCompare(a.createdAt);
  });
}
