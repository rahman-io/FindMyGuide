import { publicTripOfferings, tripOfferingAvailability, tripOfferingQuote } from '../guides/repository.js';

const intentRules = [
  { id: 'culture', label: 'Culture seeker', keywords: ['Cultural experience', 'Audio guide', 'Skip the line'], description: 'history, local culture and iconic places' },
  { id: 'adventure', label: 'Adventure seeker', keywords: ['Adventure', 'Guided tour'], description: 'active experiences and memorable adventures' },
  { id: 'food', label: 'Food and evening explorer', keywords: ['Dinner included'], description: 'local flavors and experiences after dark' },
];

const normalize = (value) => String(value || '').toLowerCase();

const optionDays = (option) => Number(option?.days) || Number(String(option?.duration || '').match(/^(\d+)\s+days?/i)?.[1]) || 1;
const experienceDays = (experience) => Number(String(experience?.duration || '').match(/^(\d+)\s+days?/i)?.[1]) || 1;
const coverageStopWords = new Set('a an and the to of in on with from day days night nights trip open shared private guide guided experience tour package activity activities local destination explore visit nature beach island water waterfall boat snorkeling safari national park area lombok sumbawa'.split(' '));
const experienceCoverageText = (experience) => normalize(JSON.stringify({ title: experience?.title, location: experience?.location, description: experience?.description, highlights: experience?.highlights, includes: experience?.includes, itinerary: experience?.itinerary, packageType: experience?.packageType }));
const experienceTerms = (experience) => [...new Set(experienceCoverageText(experience).replace(/[^a-z0-9]+/g, ' ').split(' ').filter((term) => term.length > 2 && !coverageStopWords.has(term)))];

export function coveredExperienceIds(experience, catalog = []) {
  const source = experienceCoverageText(experience);
  return catalog.filter((candidate) => candidate.id !== experience.id && experienceTerms(candidate).some((term) => source.includes(term))).map((candidate) => candidate.id);
}

export function packageOptionForDays(item, days) {
  const limit = Number(days) || 1;
  return (item.packageOptions || []).filter((option) => optionDays(option) <= limit).slice().sort((a, b) => optionDays(b) - optionDays(a) || Number(a.price || 0) - Number(b.price || 0))[0] || null;
}

export function approvedOfferForDays(item, days, travelers = 1) {
  const limit = Number(days) || 1;
  const options = (item.packageOptions || []).filter((option) => optionDays(option) <= limit).slice().sort((a, b) => optionDays(b) - optionDays(a) || Number(a.price || 0) - Number(b.price || 0));
  for (const option of options) {
    const offer = publicTripOfferings(item.id, option.id, '', travelers)[0];
    if (!offer) continue;
    const availability = tripOfferingAvailability(offer.id, travelers);
    const total = tripOfferingQuote(offer, travelers);
    if (availability.available && total !== null) return { option, offer: { id: offer.id, date: offer.date, time: offer.time, mode: offer.mode, price: offer.price, priceUnit: offer.priceUnit, total, seatsLeft: availability.seatsLeft } };
  }
  return null;
}

export function getTripIntent(userState = {}, catalog = [], socialContext = {}) {
  const wishlistItems = catalog.filter((item) => (userState.wishlist || []).includes(item.id));
  const socialPosts = socialContext.posts || [];
  const activeUserId = socialContext.userId;
  const engagedPosts = activeUserId ? socialPosts.filter((post) => post.likedBy.includes(activeUserId) || post.savedBy.includes(activeUserId) || post.comments.some((comment) => comment.authorId === activeUserId)) : [];
  const sourceItems = [...wishlistItems, ...catalog.filter((item) => engagedPosts.some((post) => post.experienceId === item.id))];
  const scores = intentRules.map((rule) => ({ ...rule, score: sourceItems.reduce((total, item) => total + (rule.keywords.some((keyword) => normalize(item.label) === normalize(keyword)) ? 2 : 0), 0) + engagedPosts.filter((post) => post.experienceId && sourceItems.some((item) => item.id === post.experienceId)).length }));
  const intent = scores.sort((a, b) => b.score - a.score)[0] || intentRules[0];
  const cityCounts = sourceItems.reduce((counts, item) => { counts[item.city] = (counts[item.city] || 0) + 1; return counts; }, {});
  const destination = Object.entries(cityCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || catalog[0]?.city || 'Lombok';
  const prices = sourceItems.map((item) => Number(item.price)).filter(Number.isFinite);
  const averagePrice = prices.length ? Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length) : 60;
  return { id: intent.id, label: intent.label, description: intent.description, destination, averagePrice, confidence: sourceItems.length ? Math.min(96, 58 + sourceItems.length * 12) : 42, source: sourceItems.length ? 'saved-and-social-signals' : 'catalog-cold-start' };
}

export function buildTripItinerary({ destination = '', days = 3, budget = 'mid', catalog = [], userState = {}, socialContext = {} } = {}) {
  const intent = getTripIntent(userState, catalog, socialContext);
  const city = destination || intent.destination;
  const maxPrice = budget === 'low' ? 60 : budget === 'high' ? Infinity : 120;
  const preferredIds = new Set(userState.wishlist || []);
  const tripDays = Number(days) || 3;
  const ranked = catalog.filter((item) => item.city === city && (item.price === null || item.price === undefined || item.price <= maxPrice)).map((experience) => {
    const packageOption = packageOptionForDays(experience, tripDays);
    const match = approvedOfferForDays(experience, tripDays);
    return { experience, packageOption, match, bookingAvailable: Boolean(match), preferred: preferredIds.has(experience.id) };
  }).sort((a, b) => Number(b.bookingAvailable) - Number(a.bookingAvailable) || Number(b.match ? optionDays(b.match.option) : 0) - Number(a.match ? optionDays(a.match.option) : 0) || Number(b.preferred) - Number(a.preferred) || Number(b.experience.rating) - Number(a.experience.rating));
  const selectedIds = new Set();
  const coveredIds = new Set();
  const selected = [];
  let remainingDays = tripDays;
  let nextDay = 1;
  const addCandidate = (candidate, duration) => {
    const span = Math.max(1, Math.min(duration, remainingDays));
    selected.push({ ...candidate, startDay: nextDay, endDay: nextDay + span - 1 });
    selectedIds.add(candidate.experience.id);
    coveredExperienceIds(candidate.experience, catalog).forEach((id) => coveredIds.add(id));
    nextDay += span;
    remainingDays -= span;
  };
  const anchor = ranked.find((candidate) => candidate.bookingAvailable);
  if (anchor) addCandidate(anchor, optionDays(anchor.match.option));
  while (remainingDays > 0) {
    const candidates = ranked.filter((candidate) => !selectedIds.has(candidate.experience.id) && !coveredIds.has(candidate.experience.id)).map((candidate) => {
      const match = approvedOfferForDays(candidate.experience, remainingDays);
      const packageOption = packageOptionForDays(candidate.experience, remainingDays);
      const duration = match ? optionDays(match.option) : packageOption ? optionDays(packageOption) : experienceDays(candidate.experience);
      return { ...candidate, match, packageOption, bookingAvailable: Boolean(match), duration };
    }).filter((candidate) => candidate.duration <= remainingDays);
    const candidate = candidates.sort((a, b) => Number(b.bookingAvailable) - Number(a.bookingAvailable) || b.duration - a.duration || Number(b.preferred) - Number(a.preferred) || Number(b.experience.rating) - Number(a.experience.rating))[0];
    if (!candidate) break;
    addCandidate(candidate, candidate.duration);
  }
  const itinerary = selected.map(({ experience, packageOption, match, startDay, endDay }) => ({ day: startDay, dayEnd: endDay, experienceId: experience.id, title: experience.title, city: experience.city, duration: match?.option?.duration || experience.duration, price: experience.price, bookingAvailable: Boolean(match), nextAvailable: match?.offer || null, packageOption: (match?.option || packageOption) ? { id: (match?.option || packageOption).id, name: (match?.option || packageOption).name, duration: (match?.option || packageOption).duration, price: (match?.option || packageOption).price, currency: (match?.option || packageOption).currency, pricingUnit: (match?.option || packageOption).pricingUnit } : null }));
  const bookableTotal = itinerary.reduce((sum, item) => sum + Number(item.nextAvailable?.total || 0), 0);
  return { intent, destination: city, days: tripDays, budget, itinerary, total: bookableTotal, bookableTotal, packageCount: itinerary.filter((item) => item.packageOption).length, bookablePackageCount: itinerary.filter((item) => item.bookingAvailable).length, generatedAt: new Date().toISOString(), schemaVersion: 2 };
}

export function toTripItineraryFirebaseFixture(itinerary) {
  return { ...itinerary, source: 'demo-local-intent-engine', status: 'draft', userId: 'demo-user' };
}
