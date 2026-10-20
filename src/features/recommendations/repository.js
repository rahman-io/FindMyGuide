const STORAGE_KEY = 'lombok-recommendation-demo-v1';
const MAX_EVENTS = 250;
const clone = (value) => JSON.parse(JSON.stringify(value));
const now = () => new Date().toISOString();
const makeId = (prefix) => `rec-${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;

export function createSeedRecommendationState() {
  return { schemaVersion: 1, userId: 'demo-user', events: [] };
}

function readState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.schemaVersion === 1 && Array.isArray(saved.events)) return saved;
  } catch { /* Recommendations stay available when storage is blocked. */ }
  return createSeedRecommendationState();
}

let currentState;
function recommendationState() {
  currentState ||= readState();
  return currentState;
}
function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(recommendationState())); return true; }
  catch { return false; }
}
function recentDuplicate(type, value) {
  const last = recommendationState().events.at(-1);
  return last?.type === type && (last.experienceId === value || last.city === value) && Date.now() - new Date(last.createdAt).getTime() < 10000;
}

export function trackRecommendationEvent(type, value = '', metadata = {}) {
  const validTypes = ['view', 'search', 'wishlist_add', 'wishlist_remove', 'social_like', 'social_save', 'social_comment', 'social_post', 'social_booking_open'];
  if (!validTypes.includes(type) || !value || recentDuplicate(type, value)) return false;
  const item = metadata.item;
  const event = {
    id: makeId(type), type, experienceId: metadata.experienceId || item?.id || null, city: item?.city || metadata.city || (type === 'search' ? value : null),
    label: item?.label || null, price: item?.price ?? null, duration: item?.duration || null,
    createdAt: now(), schemaVersion: 1,
  };
  recommendationState().events = [...recommendationState().events, event].slice(-MAX_EVENTS);
  return persist();
}

export function trackExperienceView(experienceId, item) { return trackRecommendationEvent('view', experienceId, { item }); }
export function trackSearch(city) { return trackRecommendationEvent('search', city); }
export function trackWishlistChange(experienceId, action, item) { return trackRecommendationEvent(`wishlist_${action}`, experienceId, { item }); }
export function trackSocialSignal(post, action) {
  if (!post?.experienceId || !['like', 'save', 'comment', 'post'].includes(action)) return false;
  return trackRecommendationEvent(`social_${action}`, post.id, { experienceId: post.experienceId });
}
export function trackSocialBookingOpen(experienceId, item) { return trackRecommendationEvent('social_booking_open', experienceId, { item }); }

function reviewCount(value) { return Number(String(value || 0).replaceAll(',', '')) || 0; }
function durationHours(value) {
  const numbers = String(value || '').match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
  return numbers.length ? Math.max(...numbers) : 0;
}
function recommendationProfile(source) {
  const profile = { views: {}, wishlist: {}, social: {}, cities: {}, labels: {}, prices: [], durations: [], searches: {} };
  for (const event of source.events) {
    if (event.experienceId) {
      profile.views[event.experienceId] = (profile.views[event.experienceId] || 0) + (event.type === 'view' ? 1 : 0);
      if (event.type === 'wishlist_add') profile.wishlist[event.experienceId] = (profile.wishlist[event.experienceId] || 0) + 1;
      if (event.type.startsWith('social_')) profile.social[event.experienceId] = (profile.social[event.experienceId] || 0) + 1;
    }
    if (event.city) {
      const key = event.city.toLowerCase();
      profile.cities[key] = (profile.cities[key] || 0) + 1;
      if (event.type === 'search') profile.searches[key] = (profile.searches[key] || 0) + 1;
    }
    if (event.label) profile.labels[event.label] = (profile.labels[event.label] || 0) + 1;
    if (event.price != null) profile.prices.push(Number(event.price));
    if (event.duration) profile.durations.push(durationHours(event.duration));
  }
  return profile;
}

function reasonFor(item, profile, wishlist, catalog) {
  if (wishlist.some((id) => catalog.find((entry) => entry.id === id)?.city === item.city)) return `Because you saved ${item.city} experiences`;
  if (profile.social[item.id]) return 'Because you engaged with this on Vibes';
  if (profile.searches[item.city.toLowerCase()]) return `Because you searched for ${item.city}`;
  if (profile.cities[item.city.toLowerCase()]) return `Because you explored ${item.city}`;
  if (profile.labels[item.label]) return `Because you like ${item.label.toLowerCase()}`;
  if (item.popularSearch || item.featured) return 'Popular with travelers like you';
  return 'A highly rated experience to discover';
}

export function getRecommendedExperiences(userState = {}, catalog = []) {
  const source = recommendationState();
  const profile = recommendationProfile(source);
  const wishlist = userState.wishlist || [];
  const viewed = new Set(Object.keys(profile.views));
  const averagePrice = profile.prices.length ? profile.prices.reduce((sum, value) => sum + value, 0) / profile.prices.length : null;
  const averageDuration = profile.durations.length ? profile.durations.reduce((sum, value) => sum + value, 0) / profile.durations.length : null;
  return catalog
    .filter((item) => !wishlist.includes(item.id))
    .map((item) => {
      const cityKey = item.city.toLowerCase();
      let score = Number(item.rating) * 2 + Math.log10(reviewCount(item.reviews) + 1) + (item.featured ? 1.5 : 0) + (item.popularSearch ? 1 : 0);
      if (profile.cities[cityKey]) score += Math.min(10, profile.cities[cityKey] * 4);
      if (profile.searches[cityKey]) score += Math.min(8, profile.searches[cityKey] * 5);
      if (profile.labels[item.label]) score += Math.min(7, profile.labels[item.label] * 3);
      if (profile.social[item.id]) score += Math.min(6, profile.social[item.id] * 2);
      if (averagePrice !== null) score += Math.max(0, 4 - Math.abs(item.price - averagePrice) / Math.max(averagePrice, 1));
      if (averageDuration !== null) score += Math.max(0, 3 - Math.abs(durationHours(item.duration) - averageDuration));
      if (viewed.has(item.id)) score -= 2;
      return { experience: item, score, reason: reasonFor(item, profile, wishlist, catalog) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

export function toRecommendationFirebaseFixture(source = recommendationState()) {
  return {
    recommendationEvents: clone(source.events).map((event) => ({ ...event, userId: source.userId })),
    recommendationProfile: { id: source.userId, schemaVersion: 1, source: 'demo-local-events', updatedAt: null },
  };
}
