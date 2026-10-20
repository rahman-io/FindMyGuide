import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

test('dated trip styles are approved, priced by party and booked without public guide names', async () => {
  const values = new Map();
  globalThis.localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'silent' });
  try {
    const repo = await vite.ssrLoadModule('/src/features/guides/repository.js');
    const { tripOfferingPicker, travelerBookingsView, travelerBookingDetailView } = await vite.ssrLoadModule('/src/features/guides/view.js');
    const { getExperience } = await vite.ssrLoadModule('/src/features/experiences/data.js');
    const { state } = await vite.ssrLoadModule('/src/app/store.js');
    const item = getExperience('arena');
    const option = item.packageOptions.find((entry) => entry.id === 'rinjani-2d1n');
    const publicOffer = repo.publicTripOfferings('arena', option.id, '', 20).find((offer) => offer.mode === 'group');
    assert.ok(publicOffer);
    assert.equal(repo.tripOfferingQuote(publicOffer, 20), 18000000);
    assert.equal(repo.tripOfferingQuote(publicOffer, 7), null);
    const picker = tripOfferingPicker(item, option, '', 20, '');
    assert.match(picker, /Private group/);
    assert.doesNotMatch(picker, /Adi Saputra|Raka Pradana|Siti Mariani/);
    const sharedDeparture = repo.guideDemoData().offerings.find((entry) => entry.id === 'demo-rinjani-shared');
    const dateOffers = repo.publicTripOfferings('arena', option.id, sharedDeparture.date, 1);
    const promoOffers = repo.filterTripOfferingsByPrice(dateOffers, 1, 'promo');
    assert.equal(promoOffers.length, 1);
    assert.equal(promoOffers[0].offer.id, 'demo-rinjani-shared');
    assert.ok(promoOffers[0].savings > 0);
    assert.equal(repo.tripOfferingCalendar('arena')[sharedDeparture.date].status, 'available');
    const filteredPicker = tripOfferingPicker(item, option, sharedDeparture.date, 1, '', { priceFilter: 'promo', showPriceFilters: true });
    assert.match(filteredPicker, /All prices/);
    assert.match(filteredPicker, /Promo · Save Rp/);
    Object.assign(state, { selectedPackageExperienceId: 'arena', selectedPackageOptionId: option.id, selectedOfferId: publicOffer.id, date: publicOffer.date, adults: 20, children: 0, checkoutStep: 1 });
    const { checkoutView } = await vite.ssrLoadModule('/src/features/booking/view.js');
    const checkout = checkoutView('arena');
    assert.match(checkout, /Rp18\.000\.000/);
    assert.doesNotMatch(checkout, /Adi Saputra|Raka Pradana|Siti Mariani/);

    const date = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const offer = repo.createTripOffering('guide-adi', { experienceId: 'arena', packageId: option.id, date, time: '5:00 AM', mode: 'group', minGuests: 8, maxGuests: 22, price: 18000000, coGuideIds: ['guide-raka', 'guide-siti'] });
    assert.equal(offer.status, 'pending');
    assert.equal(repo.publicTripOfferings('arena', option.id, date, 20).length, 0);
    assert.equal(repo.reviewTripOffering(offer.id, 'published'), true);
    assert.equal(repo.publicTripOfferings('arena', option.id, date, 20)[0].id, offer.id);
    assert.equal(repo.createTripOfferRequest({ offerId: offer.id, adults: 7, children: 0, travelerName: 'Too small', travelerEmail: 'small@example.com', expectedTotal: 18000000 }), null);
    const booking = repo.createTripOfferRequest({ offerId: offer.id, adults: 20, children: 0, travelerName: 'Office group', travelerEmail: 'office@example.com', expectedTotal: 18000000 });
    assert.equal(booking.travelerTotal, 18000000);
    assert.equal(booking.guideShare, 16200000);
    assert.deepEqual(booking.teamGuideIds, ['guide-adi', 'guide-raka', 'guide-siti']);
    state.email = 'office@example.com';
    const pendingView = travelerBookingsView();
    assert.doesNotMatch(pendingView, /Adi Saputra/);
    assert.equal(repo.updateGuideRequest(booking.id, 'guide-adi', 'accepted'), true);
    assert.equal(repo.tripOfferingAvailability(offer.id, 1).available, false);
    assert.equal(repo.createTripOfferRequest({ offerId: offer.id, adults: 2, children: 0, travelerName: 'Another party', travelerEmail: 'second@example.com', expectedTotal: 18000000 }), null);
    assert.equal(repo.markGuideRequestPaid(booking.id, 'office@example.com'), true);
    assert.match(travelerBookingsView(), /Booking confirmed/);
    assert.match(travelerBookingDetailView(booking.id), /Adi Saputra/);
  } finally { await vite.close(); delete globalThis.localStorage; }
});

test('shared departures track seats, minimum travelers and a confirmed group chat', async () => {
  const values = new Map();
  globalThis.localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'silent' });
  try {
    const repo = await vite.ssrLoadModule('/src/features/guides/repository.js');
    const messaging = await vite.ssrLoadModule('/src/features/messaging/repository.js');
    const social = await vite.ssrLoadModule('/src/features/social/repository.js');
    const offer = repo.guideDemoData().offerings.find((item) => item.id === 'demo-rinjani-shared');
    const first = repo.createTripOfferRequest({ offerId: offer.id, adults: 1, children: 0, travelerName: 'Maya Putri', travelerEmail: 'maya.demo@example.com', expectedTotal: 950000 });
    const second = repo.createTripOfferRequest({ offerId: offer.id, adults: 1, children: 0, travelerName: 'A Rahman', travelerEmail: 'lombok_transfer@gmail.com', expectedTotal: 950000 });
    assert.ok(first && second);
    assert.equal(repo.updateGuideRequest(first.id, 'guide-adi', 'accepted'), true);
    assert.equal(repo.sharedTripReady(first), false);
    assert.equal(repo.markGuideRequestPaid(first.id, 'maya.demo@example.com'), false);
    assert.equal(repo.updateGuideRequest(second.id, 'guide-adi', 'accepted'), true);
    assert.equal(repo.sharedTripReady(first), true);
    assert.equal(repo.tripOfferingAvailability(offer.id).seatsLeft, 12);
    assert.equal(repo.markGuideRequestPaid(first.id, 'maya.demo@example.com'), true);
    assert.equal(repo.markGuideRequestPaid(second.id, 'lombok_transfer@gmail.com'), true);
    social.switchSocialUser('maya');
    const threadId = messaging.getOrCreateSharedTripThread(offer.id);
    assert.equal(threadId, `trip-${offer.id}`);
    assert.deepEqual(messaging.chatThread(threadId).participantIds.sort(), ['guide-adi', 'guide-raka', 'maya', 'rahman'].sort());
    social.switchSocialUser('nina');
    assert.equal(messaging.chatThread(threadId), undefined);
    assert.equal(messaging.getOrCreateSharedTripThread(offer.id), null);
    social.switchSocialUser('guide-raka');
    assert.ok(messaging.chatThread(threadId));
  } finally { await vite.close(); delete globalThis.localStorage; }
});
