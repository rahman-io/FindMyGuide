import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

test('shared departures use one guide-set point and require each paid party to see it before start', async () => {
  const values = new Map();
  globalThis.localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'silent' });
  try {
    const repository = await vite.ssrLoadModule('/src/features/guides/repository.js');
    const { acknowledgeSharedDepartureMeetingPoint, guideDemoData, proposeBookingChange, reportBookingIssue, resolveBookingIssue, setSharedDepartureMeetingPoint, sharedDepartureStatus, startSharedTrip } = repository;
    const data = guideDemoData();
    const offer = data.offerings.find((entry) => entry.id === 'demo-rinjani-shared');
    offer.date = new Date().toISOString().slice(0, 10);
    offer.minGuests = 2;
    const booking = (id, email, name) => ({
      id, bookingId: `LT-26-${id.toUpperCase()}`, verificationCode: 'ABCD23', offerId: offer.id, tripMode: 'shared', teamGuideIds: ['guide-adi'],
      experienceId: offer.experienceId, packageId: offer.packageId, guideId: offer.guideId, date: offer.date, time: offer.time,
      status: 'accepted', paymentStatus: 'paid', payoutStatus: 'not_due', bookingStatus: 'confirmed', verificationStatus: 'verified',
      travelers: 1, travelerName: name, travelerEmail: email, createdAt: new Date().toISOString(), safety: { meetingPoint: '', proposal: null, guideStartedAt: null, travelerStartedAt: null, guideEndedAt: null, travelerEndedAt: null, travelerCheckInAt: null, trustedContact: null, reports: [], events: [] },
    });
    data.requests.push(booking('party-a', 'a@example.com', 'Traveler A'), booking('party-b', 'b@example.com', 'Traveler B'));
    values.set('lombok-guide-demo-v1', JSON.stringify(data));

    const guide = { role: 'guide', id: 'guide-adi' };
    const travelerA = { role: 'traveler', email: 'a@example.com' };
    const travelerB = { role: 'traveler', email: 'b@example.com' };
    assert.equal(proposeBookingChange('party-a', travelerA, 'meetingPoint', 'Private address'), false);
    assert.equal(proposeBookingChange('party-a', guide, 'meetingPoint', 'Private address'), false);
    assert.equal(setSharedDepartureMeetingPoint(offer.id, travelerA, 'Private address'), false);
    assert.equal(setSharedDepartureMeetingPoint(offer.id, guide, 'Main public visitor entrance'), true);
    assert.equal(startSharedTrip(offer.id, guide), false);
    assert.equal(acknowledgeSharedDepartureMeetingPoint(offer.id, guide), false);
    assert.equal(acknowledgeSharedDepartureMeetingPoint(offer.id, travelerA), true);
    assert.equal(acknowledgeSharedDepartureMeetingPoint(offer.id, travelerA), false);
    assert.equal(acknowledgeSharedDepartureMeetingPoint(offer.id, travelerB), true);
    assert.equal(sharedDepartureStatus(offer.id).allMeetingPointsAcknowledged, true);

    assert.equal(setSharedDepartureMeetingPoint(offer.id, guide, 'Official visitor center entrance'), true);
    assert.equal(sharedDepartureStatus(offer.id).meetingPointAcknowledgedCount, 0);
    assert.equal(startSharedTrip(offer.id, guide), false);
    assert.equal(acknowledgeSharedDepartureMeetingPoint(offer.id, travelerA), true);
    assert.equal(acknowledgeSharedDepartureMeetingPoint(offer.id, travelerB), true);
    assert.equal(reportBookingIssue('party-b', travelerB, 'safety', 'The proposed location does not feel safe.'), true);
    assert.equal(startSharedTrip(offer.id, guide), false);
    assert.equal(resolveBookingIssue('party-b', 'resolved'), true);
    assert.equal(startSharedTrip(offer.id, guide), true);
    assert.deepEqual(guideDemoData().requests.filter((entry) => entry.offerId === offer.id).map((entry) => entry.safety.meetingPoint), ['Official visitor center entrance', 'Official visitor center entrance']);
  } finally {
    await vite.close();
  }
});
