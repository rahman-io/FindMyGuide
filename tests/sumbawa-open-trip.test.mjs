import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

test('Sumbawa open trip has a production-like booking flow connected to its guide account', async () => {
  const values = new Map();
  globalThis.localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'silent' });
  try {
    const data = await vite.ssrLoadModule('/src/features/experiences/data.js');
    const { resultsView } = await vite.ssrLoadModule('/src/features/search/view.js');
    const { experienceView } = await vite.ssrLoadModule('/src/features/experience-detail/view.js');
    const { toExperienceDocument } = await vite.ssrLoadModule('/src/features/experiences/firebase-documents.js');
    const { activeGuide, createTripOfferRequest, guideDemoData, publicTripOfferings, switchGuide, tripOfferingCalendar } = await vite.ssrLoadModule('/src/features/guides/repository.js');
    const { guideDashboardView } = await vite.ssrLoadModule('/src/features/guides/view.js');
    const { activeSocialUser, socialState, switchSocialUser } = await vite.ssrLoadModule('/src/features/social/repository.js');
    const { state } = await vite.ssrLoadModule('/src/app/store.js');
    const ids = ['pulau-kenawa', 'pulau-moyo', 'mata-jitu-waterfall', 'sumbawa-whale-shark', 'sumbawa-open-trip-3d2n'];
    const sumbawaItems = data.getExperiencesByCity('Sumbawa');
    assert.deepEqual(sumbawaItems.map((item) => item.id), ids);
    assert.equal(data.destinations.some((item) => item.name === 'Sumbawa'), true);
    assert.ok(data.getExperiencesByCity('all', 'Waterfall').some((item) => item.id === 'mata-jitu-waterfall'));
    assert.ok(data.getExperiencesByCity('all', 'Open trip').some((item) => item.id === 'sumbawa-open-trip-3d2n'));
    assert.match(resultsView('all', 'Open trip'), /Sumbawa Open Trip: Kenawa, Moyo &amp; Whale Sharks/);
    assert.match(resultsView('all', 'Open trip'), /Open trip offer/);
    assert.doesNotMatch(resultsView('all', 'Open trip'), /Not open for booking/);

    const trip = data.getExperience('sumbawa-open-trip-3d2n');
    assert.equal(trip.packageItinerary.length, 3);
    assert.equal(trip.packageItinerary[2].items[0].time, 'TBC');
    assert.match(trip.itineraryNote, /not visible in the supplied source/i);
    assert.equal(trip.price, null);
    assert.equal(trip.isInquiryOnly, false);
    assert.equal(trip.packageOptions[0].id, trip.id);
    assert.equal(trip.packageOptions[0].price, 3500000);
    assert.equal(trip.packageOptions[0].demoOnly, true);
    assert.match(trip.demoBookingNotice, /subject to operator confirmation/i);
    assert.match(trip.gallery[0], /sumbawa-whale-shark/);
    assert.equal(data.getExperience('sumbawa-whale-shark').image, trip.gallery[0]);

    const demo = guideDemoData();
    const offer = demo.offerings.find((entry) => entry.id === 'demo-sumbawa-open-trip-3d2n');
    assert.ok(offer);
    assert.equal(offer.guideId, 'guide-sumbawa-demo');
    assert.equal(offer.mode, 'shared');
    assert.equal(offer.price, 3500000);
    assert.equal(offer.maxGuests, 14);
    assert.equal(offer.status, 'published');
    assert.equal(demo.guides.find((entry) => entry.id === offer.guideId).demoAccount, true);
    assert.equal(socialState().users.find((user) => user.id === offer.guideId).accountEmail, 'sumbawa.guide@example.com');
    assert.equal(tripOfferingCalendar(trip.id)[offer.date].status, 'available');

    Object.assign(state, { availabilityChecked: true, date: offer.date, adults: 2, children: 0, selectedPackageExperienceId: trip.id, selectedPackageOptionId: trip.packageOptions[0].id, selectedOfferId: offer.id });
    const page = experienceView('sumbawa-open-trip-3d2n');
    assert.match(page, /Open trip itinerary/);
    assert.match(page, /Pulau Kenawa/);
    assert.match(page, /Mata Jitu Waterfall/);
    assert.match(page, /Whale shark activity/);
    assert.match(page, /Not included/);
    assert.match(page, /third-night Lombok hotel and airport transfer are explicitly excluded/i);
    assert.match(page, /Open trip departure · operator confirmation pending/);
    assert.match(page, /Rp3,500,000 per-person price/);
    assert.match(page, /Choose date &amp; book|Choose date & book/);
    assert.match(page, /Shared departure/);
    assert.match(page, /href="#\/checkout\/sumbawa-open-trip-3d2n"/);
    assert.doesNotMatch(page, /Verified booking|Customer reviews/);
    assert.match(page, /commons\.wikimedia\.org\/wiki\/File:Pulau_kenawa\.jpg/);

    const request = createTripOfferRequest({ offerId: offer.id, adults: 2, children: 0, travelerName: 'Traveler Sumbawa Demo', travelerEmail: 'sumbawa.traveler@example.com', notes: 'Testing the Sumbawa shared trip.', expectedTotal: 7000000 });
    assert.ok(request);
    assert.equal(request.status, 'pending');
    assert.equal(request.guideId, 'guide-sumbawa-demo');
    assert.equal(request.travelerTotal, 7000000);

    assert.equal(switchSocialUser('guide-sumbawa-demo'), true);
    assert.equal(activeSocialUser().role, 'guide');
    assert.equal(switchGuide('guide-sumbawa-demo'), true);
    assert.equal(activeGuide().id, request.guideId);
    const guidePage = guideDashboardView();
    assert.match(guidePage, /Verified by FindMyGuide/);
    assert.match(guidePage, /Traveler Sumbawa Demo/);
    assert.match(guidePage, /Sumbawa Open Trip · Shared/);

    const doc = toExperienceDocument(trip, undefined);
    assert.equal(doc.pricing.adultBaseCents, null);
    assert.equal(doc.pricing.status, 'pending_operator_confirmation');
    assert.equal(doc.availabilityStatus, 'demo_departure_available');
    assert.equal(doc.packages[0].demoOnly, true);
    assert.equal(doc.rating, null);
    assert.equal(doc.itinerary.length, 3);
    assert.equal(doc.itinerary[2].items[0].time, 'TBC');
    assert.ok(doc.content.excludes.includes('Transfer out to the airport'));
    assert.ok(doc.mediaAttributions.some((credit) => credit.label.includes('Papudaengoyang')));
  } finally {
    await vite.close();
    delete globalThis.localStorage;
  }
});
