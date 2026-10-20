// Port-transfer catalog (vehicle + driver transfers from Lembar Port). Stable ids and plain
// objects deliberately mirror future Firestore documents, the same convention used by
// experiences/data.js and social/data.js elsewhere in this app.
//
// Zone/location/tariff/vehicle-class/surcharge/holiday/meeting-point/ferry-route data below is
// synced from the real Lembar Transport backend (database/seeders/VehicleClassSeeder.php,
// TariffSeeder.php and GeographySeeder.php), redesigned into FMG's own catalog shape and search
// style rather than copied as a literal UI.

export const transportVehicleClasses = [
  { code: 'mpv_standard', name: 'Standard MPV', exampleVehicles: 'Avanza, Xenia, Ertiga', maxPassengers: 4, maxLuggage: 3, sortOrder: 1, image: '/images/vehicle-mpv.webp' },
  { code: 'mpv_premium', name: 'Premium MPV', exampleVehicles: 'Innova Reborn, Innova Zenix', maxPassengers: 5, maxLuggage: 4, sortOrder: 2, image: '/images/vehicle-mpv.webp' },
  { code: 'minibus_12', name: 'Minibus 12 seats', exampleVehicles: 'Hiace Commuter, Elf short', maxPassengers: 12, maxLuggage: 12, sortOrder: 3, image: '/images/vehicle-minibus.webp' },
  { code: 'minibus_16', name: 'Minibus 16 seats', exampleVehicles: 'Hiace Premio, Elf long', maxPassengers: 16, maxLuggage: 14, sortOrder: 4, image: '/images/vehicle-minibus.webp' },
];

export const transportZones = [
  {
    id: 1, code: 'Z1', name: 'Sekotong', description: 'Sekotong, Pelangan, Bangko-Bangko (Desert Point) and the Gili Nanggu/Gede crossing.',
    locations: [
      { id: 101, name: 'Sekotong', type: 'area', distanceKmEst: 25, durationMinEst: 50 },
      { id: 102, name: 'Pelangan', type: 'area', distanceKmEst: 35, durationMinEst: 70 },
      { id: 103, name: 'Bangko-Bangko (Desert Point)', type: 'poi', distanceKmEst: 45, durationMinEst: 90 },
      { id: 104, name: 'Tawun Harbour (Gili Nanggu)', type: 'harbor', distanceKmEst: 30, durationMinEst: 60 },
    ],
  },
  {
    id: 2, code: 'Z2', name: 'Mataram Raya', description: 'Mataram, Cakranegara, Ampenan and the Mandalika Bus Terminal (Bertais).',
    locations: [
      { id: 201, name: 'Mataram (city centre)', type: 'area', distanceKmEst: 25, durationMinEst: 50 },
      { id: 202, name: 'Cakranegara', type: 'area', distanceKmEst: 28, durationMinEst: 55 },
      { id: 203, name: 'Ampenan', type: 'area', distanceKmEst: 25, durationMinEst: 50 },
      { id: 204, name: 'Mandalika Bus Terminal (Bertais)', type: 'poi', distanceKmEst: 30, durationMinEst: 60 },
    ],
  },
  {
    id: 3, code: 'Z3', name: 'Senggigi', description: "Batu Layar, Senggigi, Mangsit and Klui — Lombok's original beach strip.",
    locations: [
      { id: 301, name: 'Senggigi', type: 'area', distanceKmEst: 40, durationMinEst: 70 },
      { id: 302, name: 'Batu Layar', type: 'area', distanceKmEst: 35, durationMinEst: 60 },
      { id: 303, name: 'Mangsit', type: 'area', distanceKmEst: 43, durationMinEst: 75 },
      { id: 304, name: 'Klui', type: 'area', distanceKmEst: 45, durationMinEst: 80 },
    ],
  },
  {
    id: 4, code: 'Z4', name: 'Bandara', description: 'Lombok International Airport (Praya) and Praya town.',
    locations: [
      { id: 401, name: 'Lombok International Airport (LOP)', type: 'airport', distanceKmEst: 38, durationMinEst: 65 },
      { id: 402, name: 'Praya', type: 'area', distanceKmEst: 36, durationMinEst: 60 },
    ],
  },
  {
    id: 5, code: 'Z5', name: 'Mandalika', description: 'Kuta Mandalika, Gerupuk, Selong Belanak and Mawun.',
    locations: [
      { id: 501, name: 'Kuta Mandalika', type: 'area', distanceKmEst: 55, durationMinEst: 85 },
      { id: 502, name: 'Gerupuk', type: 'area', distanceKmEst: 60, durationMinEst: 95 },
      { id: 503, name: 'Selong Belanak', type: 'area', distanceKmEst: 50, durationMinEst: 80 },
      { id: 504, name: 'Mawun', type: 'area', distanceKmEst: 55, durationMinEst: 90 },
    ],
  },
  {
    id: 6, code: 'Z6', name: 'Bangsal / Gili', description: 'Bangsal, Teluk Nare and Teluk Kodek — the Gili Islands crossing points.',
    locations: [
      { id: 601, name: 'Bangsal Harbour', type: 'harbor', distanceKmEst: 58, durationMinEst: 105 },
      { id: 602, name: 'Teluk Nare', type: 'harbor', distanceKmEst: 56, durationMinEst: 100 },
      { id: 603, name: 'Teluk Kodek', type: 'harbor', distanceKmEst: 56, durationMinEst: 100 },
    ],
  },
  {
    id: 7, code: 'Z7', name: 'Lombok Timur', description: 'Tetebatu, Selong and the Kayangan Harbour (Labuhan Lombok) crossing.',
    locations: [
      { id: 701, name: 'Tetebatu', type: 'area', distanceKmEst: 65, durationMinEst: 110 },
      { id: 702, name: 'Selong', type: 'area', distanceKmEst: 80, durationMinEst: 140 },
      { id: 703, name: 'Kayangan Harbour (Labuhan Lombok)', type: 'harbor', distanceKmEst: 100, durationMinEst: 180 },
    ],
  },
  {
    id: 8, code: 'Z8', name: 'Rinjani', description: 'Senaru and Sembalun — the Mount Rinjani trekking gateways.',
    locations: [
      { id: 801, name: 'Senaru', type: 'area', distanceKmEst: 95, durationMinEst: 190 },
      { id: 802, name: 'Sembalun', type: 'area', distanceKmEst: 125, durationMinEst: 230 },
    ],
  },
];

// Flat fare per zone x vehicle class (IDR), matching the "managed marketplace, fixed tariff"
// model this feature is adopted from. Keyed by zone id for O(1) lookup.
export const transportTariffs = {
  1: { mpv_standard: 200000, mpv_premium: 275000, minibus_12: 450000, minibus_16: 550000 },
  2: { mpv_standard: 225000, mpv_premium: 300000, minibus_12: 475000, minibus_16: 575000 },
  3: { mpv_standard: 300000, mpv_premium: 375000, minibus_12: 550000, minibus_16: 650000 },
  4: { mpv_standard: 300000, mpv_premium: 375000, minibus_12: 550000, minibus_16: 650000 },
  5: { mpv_standard: 375000, mpv_premium: 450000, minibus_12: 650000, minibus_16: 750000 },
  6: { mpv_standard: 400000, mpv_premium: 475000, minibus_12: 700000, minibus_16: 800000 },
  7: { mpv_standard: 500000, mpv_premium: 600000, minibus_12: 850000, minibus_16: 950000 },
  8: { mpv_standard: 650000, mpv_premium: 750000, minibus_12: 1000000, minibus_16: 1150000 },
};

// "night" and "waiting" vary by vehicle class (bigger vehicles cost more to run after hours or
// idle), so each carries an amountByClass map instead of one flat amount. "waiting" is published
// here as a rate the customer can see up front; actually metering and billing elapsed wait time
// is a live-tracking feature of its own and isn't wired into computeBreakdown() in this pass.
export const transportSurcharges = [
  { code: 'night', label: 'Night transfer (22:00–06:00)', calcType: 'flat_by_class', amountByClass: { mpv_standard: 50000, mpv_premium: 75000, minibus_12: 100000, minibus_16: 100000 } },
  { code: 'holiday', label: 'Public holiday', calcType: 'percent', amount: 15 },
  { code: 'waiting', label: 'Waiting fee per 30 minutes after free wait', calcType: 'per_unit_by_class', unitMinutes: 30, amountByClass: { mpv_standard: 25000, mpv_premium: 25000, minibus_12: 40000, minibus_16: 40000 } },
  { code: 'child_seat', label: 'Child seat (on request)', calcType: 'flat', amount: 50000 },
  { code: 'roof_rack', label: 'Roof rack / surfboard rack', calcType: 'flat', amount: 50000 },
];

export const transportHolidayDates = [
  '2026-12-24', '2026-12-25', '2026-12-26', '2026-12-27', '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31',
  '2027-01-01', '2027-01-02',
];

export const transportMeetingPoints = [
  { id: 1, name: 'Passenger terminal exit (Gate A)', instructions: 'Exit the passenger terminal and turn right; your driver waits next to the information desk holding a name board.', photoUrl: null },
  { id: 2, name: 'Private vehicle parking area', instructions: 'For groups with lots of luggage: the driver waits at the parking area in front of the terminal.', photoUrl: null },
];

// Padangbai (Bali) and Lembar (Lombok) are both WITA, so pickup timing needs no timezone offset.
// The Surabaya route departs from WIB (one hour behind WITA); this catalog records its real
// schedule timezone, but the pickup-time field still only collects a single WITA clock time, so a
// Surabaya departure time entered here can be off by up to an hour until that field is made
// timezone-aware.
export const transportFerryRoutes = [
  { id: 1, name: 'Padangbai → Lembar', operator: 'ASDP & private operators', originPort: 'Padangbai (Bali)', scheduleTimezone: 'WITA', crossingMinMin: 270, crossingMinMax: 420 },
  { id: 2, name: 'Surabaya (Tanjung Perak) → Lembar', operator: 'Dharma Lautan Utama / ASDP', originPort: 'Surabaya (Tanjung Perak)', scheduleTimezone: 'WIB', crossingMinMin: 1200, crossingMinMax: 1500 },
];

export const transportDrivers = [
  { id: 'driver-wayan', name: 'Wayan Suarta', initials: 'WS', ratingAvg: 4.9, tripsCompleted: 212, phone: '+6281234500001', status: 'verified', vehicle: { brand: 'Toyota', model: 'Avanza', color: 'Silver', plateNumber: 'DR 1234 AB' } },
  { id: 'driver-made', name: 'Made Artana', initials: 'MA', ratingAvg: 4.8, tripsCompleted: 156, phone: '+6281234500002', status: 'verified', vehicle: { brand: 'Toyota', model: 'Innova Zenix', color: 'White', plateNumber: 'DR 5678 CD' } },
  { id: 'driver-ketut', name: 'Ketut Sudiarta', initials: 'KS', ratingAvg: 4.95, tripsCompleted: 301, phone: '+6281234500003', status: 'verified', vehicle: { brand: 'Toyota', model: 'Hiace', color: 'White', plateNumber: 'DR 9012 EF' } },
];

export function transportZoneByLocationId(locationId) {
  return transportZones.find((zone) => zone.locations.some((location) => location.id === Number(locationId))) || null;
}
export function transportLocationById(id) {
  for (const zone of transportZones) {
    const location = zone.locations.find((entry) => entry.id === Number(id));
    if (location) return { ...location, zoneId: zone.id };
  }
  return null;
}
export function transportVehicleClassByCode(code) {
  return transportVehicleClasses.find((entry) => entry.code === code) || null;
}
export function transportTariffFor(zoneId, vehicleClassCode) {
  const amount = transportTariffs[zoneId]?.[vehicleClassCode];
  return Number.isFinite(amount) ? amount : null;
}
export function transportPriceList() {
  return transportZones.map((zone) => ({ zone, prices: Object.fromEntries(transportVehicleClasses.map((cls) => [cls.code, transportTariffFor(zone.id, cls.code)])) }));
}
export function transportMeetingPointById(id) {
  return transportMeetingPoints.find((entry) => entry.id === Number(id)) || null;
}
export function transportFerryRouteById(id) {
  return transportFerryRoutes.find((entry) => entry.id === Number(id)) || null;
}
export function transportDriverById(id) {
  return transportDrivers.find((entry) => entry.id === id) || null;
}

// Well-known non-Lombok landmarks (kept as a small local list, not imported from Discover's
// catalog, so this file stays free of Discover's image-asset imports — those can't be resolved
// outside a bundler and would break every other feature's tests that happen to import this file).
export const transportOutOfCoverageLandmarks = [
  { name: 'Pulau Kenawa', city: 'Sumbawa' },
  { name: 'Pulau Moyo', city: 'Sumbawa' },
  { name: 'Mata Jitu Waterfall', city: 'Sumbawa' },
  { name: 'Whale shark encounter', city: 'Sumbawa' },
  { name: 'Sumbawa', city: 'Sumbawa' },
];

// Curated aliases for well-known Lombok landmarks that aren't already a zone location's exact
// name. Each alias resolves to a real transportZones location id, so price and duration always
// come from that zone's own, already-verified tariff and estimate — no new fare is invented for
// the alias.
export const transportDestinationAliases = [
  { alias: 'Mount Rinjani', locationId: 802 },
  { alias: 'Rinjani summit', locationId: 802 },
  { alias: 'Rinjani (via Senaru)', locationId: 801 },
  { alias: 'Gili Trawangan', locationId: 601 },
  { alias: 'Gili Air', locationId: 601 },
  { alias: 'Gili Meno', locationId: 601 },
  { alias: 'Bangsal Harbour crossing', locationId: 601 },
  { alias: 'Mandalika Circuit', locationId: 501 },
  { alias: 'Lombok Airport', locationId: 401 },
  { alias: 'LOP', locationId: 401 },
];

// Finds destinations matching free text: real zone locations first, then the curated aliases
// above (both resolve to a priced, zoned location). An empty query returns every real location,
// grouped by zone, matching what the old <select>'s full option list showed. If nothing in
// Lombok matches, checks a small local out-of-coverage list so the UI can explain why it isn't
// bookable here instead of just showing "no results".
export function transportSearchDestinations(query) {
  const normalized = String(query || '').trim().toLocaleLowerCase();
  if (!normalized) {
    return { matches: transportZones.flatMap((zone) => zone.locations.map((location) => ({ ...location, zoneId: zone.id, zoneName: zone.name }))), outOfCoverage: null };
  }
  const seen = new Set();
  const matches = [];
  const addMatch = (location, zone) => {
    if (!location || seen.has(location.id)) return;
    seen.add(location.id);
    matches.push({ ...location, zoneId: zone.id, zoneName: zone.name });
  };
  transportZones.forEach((zone) => zone.locations.forEach((location) => {
    if (location.name.toLocaleLowerCase().includes(normalized)) addMatch(location, zone);
  }));
  transportDestinationAliases.forEach((entry) => {
    if (!entry.alias.toLocaleLowerCase().includes(normalized)) return;
    const location = transportLocationById(entry.locationId);
    if (location) addMatch(location, transportZones.find((zone) => zone.id === location.zoneId));
  });
  if (matches.length) return { matches, outOfCoverage: null };
  const outside = transportOutOfCoverageLandmarks.find((item) => item.name.toLocaleLowerCase().includes(normalized));
  return { matches: [], outOfCoverage: outside || null };
}
