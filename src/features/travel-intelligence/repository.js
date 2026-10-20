const STORAGE_KEY = 'lombok-travel-intelligence-demo-v1';
const normalize = (value) => String(value || '').toLowerCase();
const notificationCatalog = [
  { id: 'colosseum', city: 'Rome', label: 'Guided tour', duration: '2.5 hours' },
  { id: 'pantheon', city: 'Rome', label: 'Audio guide', duration: '1 day' },
  { id: 'vatican', city: 'Rome', label: 'Skip the line', duration: '2 - 3 hours' },
  { id: 'skydiving', city: 'Queenstown', label: 'Adventure', duration: '3 hours' },
  { id: 'kayaking', city: 'Split', label: 'Guided tour', duration: '2.5 hours' },
  { id: 'agafay', city: 'Marrakech', label: 'Dinner included', duration: '5 hours' },
  { id: 'sumo', city: 'Tokyo', label: 'Cultural experience', duration: '75 minutes' },
];

export function createSeedTravelIntelligenceState() {
  return { schemaVersion: 1, claimedMissionIds: [] };
}

function readState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.schemaVersion === 1 && Array.isArray(saved.claimedMissionIds)) return saved;
  } catch { /* Intelligence stays available when storage is blocked. */ }
  return createSeedTravelIntelligenceState();
}

let currentState;
function intelligenceState() {
  currentState ||= readState();
  return currentState;
}
function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(intelligenceState())); return true; }
  catch { return false; }
}

function durationHours(value) {
  const numbers = String(value || '').match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
  return numbers.length ? Math.max(...numbers) : 0;
}

export function getTravelMissions({ userState = {}, posts = [], userId = 'rahman', catalog = [] } = {}) {
  const authoredPosts = posts.filter((post) => post.authorId === userId);
  const engagedPosts = posts.filter((post) => post.likedBy.includes(userId) || post.savedBy.includes(userId) || post.comments.some((comment) => comment.authorId === userId));
  const wishlistCities = new Set(catalog.filter((item) => (userState.wishlist || []).includes(item.id)).map((item) => item.city));
  return [
    { id: 'save-three', title: 'Build your shortlist', description: 'Save three experiences for your next trip.', progress: Math.min(3, (userState.wishlist || []).length), target: 3, reward: 120, badge: 'Curious collector' },
    { id: 'share-two', title: 'Share the journey', description: 'Post two travel moments in Vibes.', progress: Math.min(2, authoredPosts.length), target: 2, reward: 180, badge: 'Storyteller' },
    { id: 'explore-three', title: 'Explore beyond one city', description: 'Interact with experiences across three destinations.', progress: Math.min(3, new Set([...wishlistCities, ...engagedPosts.map((post) => post.location).filter(Boolean)]).size), target: 3, reward: 240, badge: 'Open-road explorer' },
  ].map((mission) => ({ ...mission, completed: mission.progress >= mission.target, claimed: intelligenceState().claimedMissionIds.includes(mission.id) }));
}

export function claimTravelMission(id, context = {}) {
  const mission = getTravelMissions(context).find((item) => item.id === id);
  if (!mission?.completed || mission.claimed) return false;
  intelligenceState().claimedMissionIds.push(id);
  return persist();
}

export function getGamificationSummary(missions = []) {
  const claimedPoints = missions.filter((mission) => mission.claimed).reduce((sum, mission) => sum + mission.reward, 0);
  const points = 320 + claimedPoints + missions.reduce((sum, mission) => sum + Math.round((mission.progress / mission.target) * mission.reward * 0.25), 0);
  const level = Math.floor(points / 500) + 1;
  const nextLevelPoints = level * 500;
  return { points, level, nextLevelPoints, progress: Math.min(100, Math.round((points / nextLevelPoints) * 100)), title: level >= 3 ? 'Seasoned explorer' : level === 2 ? 'Frequent explorer' : 'Getting curious' };
}

export function getTravelProfileIntelligence({ userState = {}, posts = [], userId = 'rahman', catalog = [] } = {}) {
  const wishlistItems = catalog.filter((item) => (userState.wishlist || []).includes(item.id));
  const engagedItems = catalog.filter((item) => posts.some((post) => post.experienceId === item.id && (post.likedBy.includes(userId) || post.savedBy.includes(userId) || post.comments.some((comment) => comment.authorId === userId))));
  const items = [...new Map([...wishlistItems, ...engagedItems].map((item) => [item.id, item])).values()];
  const cityCounts = items.reduce((counts, item) => { counts[item.city] = (counts[item.city] || 0) + 1; return counts; }, {});
  const labelCounts = items.reduce((counts, item) => { counts[item.label] = (counts[item.label] || 0) + 1; return counts; }, {});
  const topCity = Object.entries(cityCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'Rome';
  const topStyle = Object.entries(labelCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'curated experiences';
  const averageDuration = items.length ? items.reduce((sum, item) => sum + durationHours(item.duration), 0) / items.length : 0;
  const pace = averageDuration > 4 ? 'Slow, immersive planner' : averageDuration > 2 ? 'Balanced explorer' : 'Quick-hit explorer';
  return { persona: `${pace} into ${topStyle.toLowerCase()}`, topCity, topStyle, pace, signals: items.length, confidence: items.length ? Math.min(94, 58 + items.length * 9) : 42, source: items.length ? 'wishlist-and-vibes-signals' : 'cold-start-profile' };
}

export function getSmartReviewIntelligence(item, review = {}) {
  const rating = Number(review.rating || 5);
  const focus = item.label || 'the experience';
  const prompts = [`What stood out about ${focus.toLowerCase()}?`, `How did the ${item.duration || 'activity'} fit your day?`, 'What would you tell another traveler before booking?'];
  const quality = Math.min(98, 65 + Math.round(rating * 6) + (item.featured ? 7 : 0));
  return { quality, tone: rating >= 4 ? 'Your review can help travelers choose with confidence.' : 'Your honest feedback can help the provider improve.', prompts, suggestedTags: [item.city, item.label || 'travel experience'].filter(Boolean), source: 'demo-local-review-intelligence' };
}

export function getContextAwareNotifications({ userState = {}, posts = [], catalog = [], nowValue = new Date() } = {}) {
  const notifications = [];
  const sourceCatalog = catalog.length ? catalog : notificationCatalog;
  const savedItems = sourceCatalog.filter((item) => (userState.wishlist || []).includes(item.id));
  if (savedItems.length) notifications.push({ id: 'saved-plans', type: 'Smart', title: 'Your saved plans are waiting', body: `${savedItems.length} saved experience${savedItems.length === 1 ? '' : 's'} ready for a date check`, href: '#/wishlist', timeLabel: 'For you' });
  const savedCity = savedItems[0]?.city;
  const cityPost = posts.find((post) => savedCity && normalize(post.location).includes(normalize(savedCity)));
  if (cityPost) notifications.push({ id: `vibes-${savedCity.toLowerCase()}`, type: 'Smart', title: `${savedCity} is active on Vibes`, body: 'Travelers are sharing fresh inspiration for one of your saved destinations', href: '#/social', timeLabel: 'Just now' });
  if (nowValue.getHours() >= 17) notifications.push({ id: 'evening-inspiration', type: 'Smart', title: 'A good time to plan tomorrow', body: 'Compare dates and lock in an experience while your shortlist is fresh', href: '#/trip-planner', timeLabel: 'Tonight' });
  return notifications;
}

export function toTravelIntelligenceFirebaseFixture(context = {}) {
  const missions = getTravelMissions(context);
  return { travelProfile: { ...getTravelProfileIntelligence(context), userId: context.userId || 'rahman', schemaVersion: 1 }, missions: missions.map((mission) => ({ ...mission, userId: context.userId || 'rahman' })), gamification: getGamificationSummary(missions), source: 'demo-local-travel-intelligence' };
}
