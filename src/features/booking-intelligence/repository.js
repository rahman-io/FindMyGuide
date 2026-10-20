import { getDemoBooking } from '../experiences/booking-demo.js';

const normalize = (value) => String(value || '').toLowerCase();
export function getSmartBundle(item, catalog = [], userState = {}) {
  const wishlist = new Set(userState.wishlist || []);
  const candidates = catalog.filter((candidate) => candidate.id !== item.id).map((candidate) => {
    const sameCity = normalize(candidate.city) === normalize(item.city);
    const sameLabel = normalize(candidate.label) === normalize(item.label);
    const score = (sameCity ? 8 : 0) + (sameLabel ? 4 : 0) + (wishlist.has(candidate.id) ? 5 : 0) + Number(candidate.rating || 0);
    return { experience: candidate, score };
  }).sort((a, b) => b.score - a.score).slice(0, 2);
  const total = Number(item.price || 0) + candidates.reduce((sum, entry) => sum + Number(entry.experience.price || 0), 0);
  const savings = candidates.length ? Math.max(3, Math.round(total * 0.08)) : 0;
  return { items: candidates.map(({ experience }) => experience), total, savings, score: candidates.length ? Math.min(97, 68 + candidates.length * 12) : 0, reason: candidates.length ? 'Pairs well with your travel plans' : 'More matching experiences will appear as data grows' };
}

export function getBookingLikelihood(item, userState = {}, signals = {}) {
  const saved = (userState.wishlist || []).includes(item.id);
  const views = Number(signals.views || 0);
  const social = Number(signals.social || 0);
  let score = 42 + (item.featured ? 8 : 0) + (item.popularSearch ? 7 : 0) + (saved ? 19 : 0) + Math.min(16, views * 5 + social * 4);
  score = Math.min(98, score);
  const label = score >= 78 ? 'High booking intent' : score >= 58 ? 'Growing booking intent' : 'Still exploring';
  const timing = score >= 78 ? 'Best time to book: today' : score >= 58 ? 'Best time to book: within 48 hours' : 'Best time to book: after comparing dates';
  return { score, label, timing, reason: saved ? 'You saved this experience' : social ? 'You interacted with this on Vibes' : item.popularSearch ? 'Travelers are viewing this now' : 'Based on current catalog interest' };
}

export function getPriceAvailabilityAlerts(item, booking = getDemoBooking(item)) {
  const alerts = [];
  if (item.oldPrice && item.oldPrice > item.price) alerts.push({ type: 'price', title: 'Price opportunity', text: `Save $${item.oldPrice - item.price} compared with the usual price` });
  if (booking?.popularDays?.length) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const popular = booking.popularDays.map((day) => days[day]).join(' and ');
    alerts.push({ type: 'availability', title: 'Availability watch', text: `Most popular on ${popular}; earlier dates may fill faster` });
  }
  if (item.badge === 'Likely to sell out') alerts.push({ type: 'demand', title: 'High demand signal', text: 'Popular slots can become unavailable first' });
  if (!alerts.length) alerts.push({ type: 'watch', title: 'Price & availability watch', text: 'We will surface changes when live provider data is connected' });
  return alerts;
}

export function toBookingIntelligenceFirebaseFixture(item, catalog = [], userState = {}) {
  return { experienceId: item.id, smartBundle: getSmartBundle(item, catalog, userState), bookingLikelihood: getBookingLikelihood(item, userState), alerts: getPriceAvailabilityAlerts(item), source: 'demo-local-booking-intelligence', schemaVersion: 1 };
}
