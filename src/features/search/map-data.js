// Only catalog activities with known coordinates are placed on the map.
export const mapDestinations = {
  Lombok: { center: [-8.65, 116.32], zoom: 10, areas: [
    { id: 'south-lombok', name: 'South Lombok', bounds: [-9.05, 116.10, -8.70, 116.55] },
    { id: 'central-lombok', name: 'Central Lombok', bounds: [-8.75, 116.10, -8.42, 116.55] },
    { id: 'north-lombok', name: 'North Lombok', bounds: [-8.55, 115.90, -8.10, 116.55] },
    { id: 'gili-islands', name: 'Gili Islands', bounds: [-8.45, 115.90, -8.22, 116.12] },
  ] },
  Mataram: { center: [-8.5833, 116.1167], zoom: 13, areas: [] },
  Sembalun: { center: [-8.3667, 116.5333], zoom: 12, areas: [] },
};

export const mapActivities = {
  colosseum: { coordinates: [-8.912, 116.385], area: 'south-lombok', category: 'tour' },
  arena: { coordinates: [-8.367, 116.533], area: 'north-lombok', category: 'tour' },
  pantheon: { coordinates: [-8.350, 116.040], area: 'gili-islands', category: 'ticket' },
  vatican: { coordinates: [-8.306, 116.401], area: 'north-lombok', category: 'tour' },
  basilica: { coordinates: [-8.566, 116.326], area: 'central-lombok', category: 'tour' },
};

export function validCoordinates(point) {
  return Array.isArray(point) && point.length === 2 && point.every(Number.isFinite) && Math.abs(point[0]) <= 90 && Math.abs(point[1]) <= 180;
}

export function distanceMeters(from, to) {
  if (!validCoordinates(from) || !validCoordinates(to)) return null;
  const radians = (value) => value * Math.PI / 180;
  const a = Math.sin(radians(to[0] - from[0]) / 2) ** 2 + Math.cos(radians(from[0])) * Math.cos(radians(to[0])) * Math.sin(radians(to[1] - from[1]) / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
}

export function formatDistance(from, to) {
  const meters = distanceMeters(from, to);
  if (meters === null) return '';
  return meters < 1000 ? `${Math.round(meters)} m away` : `${(meters / 1000).toFixed(1)} km away`;
}

export function inBounds(point, bounds) {
  return validCoordinates(point) && point[0] >= bounds[0] && point[0] <= bounds[2] && point[1] >= bounds[1] && point[1] <= bounds[3];
}

export function filterMapActivities(points, { area = 'all', category = 'all', mode = 'all', bounds } = {}) {
  if (mode === 'restaurant' || mode === 'hotel') return [];
  return points.filter((point) => (area === 'all' || area === 'view' || point.area === area)
    && (category === 'all' || point.category === category)
    && (!bounds || inBounds(point.coordinates, bounds)));
}

export function parseMapPlaces(data) {
  if (!Array.isArray(data?.elements) || data.remark) throw new Error('Incomplete nearby places response');
  const seen = new Set();
  return data.elements.flatMap((element) => {
    const tags = element.tags || {};
    const type = tags.amenity === 'restaurant' ? 'restaurant' : tags.tourism === 'hotel' ? 'hotel' : null;
    const coordinates = [element.lat ?? element.center?.lat, element.lon ?? element.center?.lon];
    if (!type || typeof tags.name !== 'string' || !tags.name.trim() || !validCoordinates(coordinates)) return [];
    const key = `${type}:${tags.name.trim()}:${coordinates.map((value) => value.toFixed(4)).join(',')}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ id: `${element.type}-${element.id}`, name: tags.name.trim(), type, coordinates }];
  });
}

export function locationErrorMessage(error) {
  if (error.code === 1) return 'Location access is blocked. Allow it in your browser’s site settings, then try again.';
  if (error.code === 3) return 'Finding your location took too long. Try again near a window or outdoors.';
  return 'Your device could not determine its location. Check location services and try again.';
}
