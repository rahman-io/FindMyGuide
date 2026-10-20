// Demo-only booking data. Replace these records with provider data when a backend is connected.
import { formatCurrency } from '../../services/currency.js';
const weekdayMultipliers = { 0: 1.12, 1: 1, 2: 1.03, 3: 1.05, 4: 1.08, 5: 1.1, 6: 1.15 };
const demoTimeOptions = ['6:00 PM', '7:30 PM'];
export const demoBookingData = {
  colosseum: { childPrice: 39, weekdayMultipliers, timeOptions: demoTimeOptions },
  arena: { childPrice: 32, weekdayMultipliers, timeOptions: demoTimeOptions },
  vatican: { childPrice: 47, weekdayMultipliers, timeOptions: demoTimeOptions },
  basilica: { childPrice: 52, weekdayMultipliers, timeOptions: demoTimeOptions },
  pantheon: { childPrice: 6, weekdayMultipliers, timeOptions: demoTimeOptions },
  skydiving: { childPrice: 160, weekdayMultipliers, timeOptions: demoTimeOptions, popularDays: [4, 6] },
  kayaking: { childPrice: 37, weekdayMultipliers, timeOptions: demoTimeOptions, popularDays: [4, 6] },
  agafay: { childPrice: 43, weekdayMultipliers, timeOptions: demoTimeOptions },
  sumo: { childPrice: 25, weekdayMultipliers, timeOptions: demoTimeOptions, popularDays: [5, 6] },
};

export function getDemoBooking(item) {
  return demoBookingData[item.id];
}

export function calculateDemoQuote(item, { adults = 1, children = 0, date = '' } = {}) {
  const booking = getDemoBooking(item);
  const day = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T12:00:00`).getDay() : null;
  const multiplier = day === null || Number.isNaN(day) ? 1 : booking?.weekdayMultipliers?.[day] ?? 1;
  const adultCents = Math.round(item.price * multiplier * 100);
  const childCents = Math.round((booking?.childPrice ?? item.price) * multiplier * 100);
  return {
    adultPrice: adultCents / 100,
    childPrice: childCents / 100,
    total: (adultCents * adults + childCents * children) / 100,
  };
}

export function formatDemoPrice(amount) {
  return formatCurrency(amount, 'USD');
}

export function formatListedPrice(item) {
  const amount = item?.listedPrice ?? item?.price ?? 0;
  return formatCurrency(amount, item?.listedPriceCurrency || 'USD');
}
