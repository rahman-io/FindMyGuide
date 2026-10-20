import { parseMapPlaces } from './map-data.js';

export const mapPlaceProviders = ['https://overpass.private.coffee/api/interpreter', 'https://overpass-api.de/api/interpreter'];

// Try providers sequentially and cancel both timeouts and requests on navigation.
export async function fetchMapPlaces(statement, { signal, endpoints = mapPlaceProviders, timeoutMs = 12000, fetcher = fetch, onFallback = () => {} } = {}) {
  let lastError;
  for (const [index, endpoint] of endpoints.entries()) {
    signal?.throwIfAborted();
    if (index) onFallback();
    const controller = new AbortController();
    const cancel = () => controller.abort();
    signal?.addEventListener('abort', cancel, { once: true });
    const timeout = setTimeout(cancel, timeoutMs);
    try {
      const response = await fetcher(`${endpoint}?data=${encodeURIComponent(statement)}`, { signal: controller.signal });
      if (!response.ok) throw new Error(`Nearby places service returned ${response.status}`);
      return parseMapPlaces(await response.json());
    } catch (error) {
      signal?.throwIfAborted();
      lastError = error;
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', cancel);
    }
  }
  throw lastError || new Error('No nearby places provider is configured');
}
