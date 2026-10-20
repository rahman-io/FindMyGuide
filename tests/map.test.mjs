import test from 'node:test';
import assert from 'node:assert/strict';
import { distanceMeters, formatDistance, filterMapActivities, inBounds, locationErrorMessage, mapActivities, mapDestinations, parseMapPlaces } from '../src/features/search/map-data.js';
import { fetchMapPlaces } from '../src/features/search/map-service.js';

test('map distances handle absent GPS, zero, long distances and antipodes', () => {
  assert.equal(formatDistance(null, [41, 12]), '');
  assert.equal(distanceMeters([NaN, 12], [41, 12]), null);
  assert.equal(distanceMeters([91, 12], [41, 12]), null);
  assert.equal(formatDistance([41, 12], [41, 12]), '0 m away');
  assert.match(formatDistance([41, 12], [41.001, 12]), /^111 m away$/);
  assert.ok(distanceMeters([52.2297, 21.0122], [41.9028, 12.4964]) > 1300000);
  assert.ok(Number.isFinite(distanceMeters([90, 180], [-90, 0])));
});

test('area, activity type, place type and current viewport constrain the same activity set', () => {
  const points = Object.entries(mapActivities).map(([id, value]) => ({ id, ...value }));
  assert.equal(filterMapActivities(points).length, 5);
  assert.deepEqual(filterMapActivities(points, { area: 'north-lombok' }).map((p) => p.id), ['arena', 'vatican']);
  assert.deepEqual(filterMapActivities(points, { category: 'ticket' }).map((p) => p.id), ['pantheon']);
  assert.equal(filterMapActivities(points, { area: 'north-lombok', category: 'ticket' }).length, 0);
  assert.equal(filterMapActivities(points, { mode: 'hotel' }).length, 0);
  assert.equal(filterMapActivities(points, { area: 'view', bounds: [52, 20, 53, 22] }).length, 0);
  for (const point of points) assert.ok(inBounds(point.coordinates, mapDestinations.Lombok.areas.find((area) => area.id === point.area).bounds));
});

test('nearby results validate coordinates, use way centers, deduplicate and keep OSM IDs distinct', () => {
  const elements = [
    { type: 'node', id: 1, lat: 41.9, lon: 12.49, tags: { name: 'Cafe', amenity: 'restaurant' } },
    { type: 'way', id: 1, center: { lat: 41.91, lon: 12.48 }, tags: { name: 'Hotel', tourism: 'hotel' } },
    { type: 'way', id: 2, center: { lat: 41.9, lon: 12.49 }, tags: { name: 'Cafe', amenity: 'restaurant' } },
    { type: 'node', id: 3, tags: { name: 'No coordinates', tourism: 'hotel' } },
    { type: 'node', id: 4, lat: 41.9, lon: 12.49, tags: { amenity: 'restaurant' } },
    { type: 'node', id: 5, lat: 41.9, lon: 12.49, tags: { name: 'Park', leisure: 'park' } },
  ];
  assert.deepEqual(parseMapPlaces({ elements }).map((p) => p.id), ['node-1', 'way-1']);
  assert.deepEqual(parseMapPlaces({ elements: [] }), []);
  assert.throws(() => parseMapPlaces({ elements: [], remark: 'runtime error: timeout' }));
  assert.throws(() => parseMapPlaces({}));
});

test('location timeout and unavailable GPS are not presented as permission denial', () => {
  assert.match(locationErrorMessage({ code: 1 }), /blocked/);
  assert.match(locationErrorMessage({ code: 2 }), /location services/);
  assert.match(locationErrorMessage({ code: 3 }), /too long/);
});

test('nearby service falls back after HTTP failure or incomplete data, but does not fabricate places', async () => {
  let calls = 0;
  const result = await fetchMapPlaces('query', { fetcher: async () => ++calls === 1 ? { ok: false, status: 503 } : { ok: true, json: async () => ({ elements: [] }) } });
  assert.deepEqual(result, []);
  assert.equal(calls, 2);
  await assert.rejects(fetchMapPlaces('query', { fetcher: async () => ({ ok: true, json: async () => ({ remark: 'timeout', elements: [] }) }) }));
});

test('nearby request timeout is bounded and cancelled requests never try the fallback', async () => {
  let calls = 0;
  const pendingFetch = (_url, { signal }) => new Promise((_resolve, reject) => {
    calls++;
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  });
  await assert.rejects(fetchMapPlaces('query', { fetcher: pendingFetch, timeoutMs: 5 }));
  assert.equal(calls, 2);
  calls = 0;
  const controller = new AbortController();
  const request = fetchMapPlaces('query', { signal: controller.signal, fetcher: pendingFetch });
  controller.abort();
  await assert.rejects(request, { name: 'AbortError' });
  assert.equal(calls, 1);
});
