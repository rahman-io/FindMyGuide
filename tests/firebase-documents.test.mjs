import test from 'node:test';
import assert from 'node:assert/strict';
import { toExperienceDocument, toMediaDocuments, toDestinationDocument, toTileMediaDocument } from '../src/features/experiences/firebase-documents.js';

const experience = {
  id: 'demo', title: 'Demo activity', city: 'Lombok', duration: '2 hours',
  image: '/local/cover.webp', cardImage: '/local/card.webp', gallery: ['/local/cover.webp', '/local/second.webp'],
  rating: '4.8', reviews: '2,441', price: 52, description: 'Demo description', highlights: ['First highlight'],
};
const booking = { childPrice: 37, weekdayMultipliers: { 6: 1.15 }, popularDays: [6], timeOptions: ['6:00 PM'] };

test('experience fixture uses stable IDs, numeric counts, cents and media references', () => {
  const doc = toExperienceDocument(experience, booking);
  assert.equal(doc.id, 'demo');
  assert.equal(doc.organizationId, 'demo-operator');
  assert.equal(doc.status, 'draft');
  assert.deepEqual(doc.rating, { average: 4.8, count: 2441 });
  assert.deepEqual(doc.pricing, { currency: 'USD', adultBaseCents: 5200, childBaseCents: 3700, weekdayMultiplierBasisPoints: { 6: 11500 } });
  assert.deepEqual(doc.media.galleryIds, ['demo-gallery-0', 'demo-gallery-1']);
  assert.equal(JSON.stringify(doc).includes('/local/'), false);
});

test('media fixtures stay unpublished until rights and Storage paths are supplied', () => {
  const media = toMediaDocuments(experience);
  assert.equal(media[0].status, 'draft');
  assert.equal(media[0].storagePath, null);
  assert.equal(media[0].licenseStatus, 'unverified');
  assert.equal(media[3].id, 'demo-gallery-1');
});

test('destination and attraction tiles keep numeric counts and matching media IDs', () => {
  const tile = { name: 'Vatican Museums', city: 'Rome', count: '530 activities', image: '/local/tile.webp' };
  assert.equal(toDestinationDocument(tile, 'attraction').activityCount, 530);
  assert.equal(toDestinationDocument(tile, 'attraction').mediaId, toTileMediaDocument(tile, 'attraction').id);
});

test('experience packages are serialized for the future Firebase collection', () => {
  const doc = toExperienceDocument({ ...experience, packageType: 'Day tour', packageOptions: [{ id: 'day-tour', name: 'Day tour package', days: 1, duration: '1 day', price: 250000, currency: 'IDR', pricingUnit: 'per person', includes: ['Guide'] }] }, booking);
  assert.equal(doc.packageType, 'Day tour');
  assert.deepEqual(doc.packages[0].pricing, { currency: 'IDR', amount: 250000, unit: 'per person' });
  assert.deepEqual(doc.packages[0].includes, ['Guide']);
});
