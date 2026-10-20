// Port-transfer bookings (adopted from the Lembar Transport Customer flow): quoting,
// order lifecycle, cancellation policy and ferry "docked" handling. Follows the same
// single-writer read()/write() localStorage pattern as guides/repository.js.

import {
  transportDrivers, transportFerryRouteById, transportFerryRoutes, transportLocationById,
  transportMeetingPointById, transportMeetingPoints, transportSurcharges, transportHolidayDates,
  transportTariffFor, transportVehicleClassByCode, transportVehicleClasses, transportZones,
} from './data.js';

const storageKey = 'lombok-transport-demo-v1';
const TRANSPORT_SCHEMA_VERSION = 1;
export const TRANSPORT_QUOTE_TTL_MINUTES = 30;
export const TRANSPORT_FREE_WAITING_MINUTES = 60;
const TRANSPORT_CANCELLATION_TIERS = [[24, 0], [6, 50], [0, 100]];

export const TRANSPORT_STATUS_LABELS = {
  pending_payment: 'Awaiting payment', confirmed: 'Confirmed', assigned: 'Driver assigned',
  en_route: 'Driver heading to the port', arrived: 'Driver at meeting point', on_trip: 'On the way',
  completed: 'Completed', no_show: 'Passenger no-show', cancelled: 'Cancelled', expired: 'Expired',
};
// confirmed -> assigned happens instantly in this demo (no live dispatch/driver app yet),
// simulating a match being found rather than modelling a real-time offer/accept cycle.
const TRANSPORT_STATUS_TRANSITIONS = {
  pending_payment: ['confirmed', 'expired', 'cancelled'],
  confirmed: ['assigned', 'cancelled'],
  assigned: ['en_route', 'cancelled'],
  en_route: ['arrived', 'cancelled'],
  arrived: ['on_trip', 'no_show', 'cancelled'],
  on_trip: ['completed'],
  completed: [], no_show: [], cancelled: [], expired: [],
};
export function transportCanTransition(from, to) { return (TRANSPORT_STATUS_TRANSITIONS[from] || []).includes(to); }
export function transportStatusTone(status) {
  if (status === 'completed') return 'completed';
  if (['assigned', 'en_route', 'arrived', 'on_trip', 'confirmed'].includes(status)) return 'accepted';
  if (status === 'pending_payment') return 'pending';
  if (['cancelled', 'expired', 'no_show'].includes(status)) return 'declined';
  return 'pending';
}

function witaToIso(date, time) { return new Date(`${date}T${time}:00+08:00`).toISOString(); }
function witaHour(iso) { return (new Date(iso).getUTCHours() + 8) % 24; }
function witaDate(iso) { return new Date(new Date(iso).getTime() + 8 * 3600000).toISOString().slice(0, 10); }
function isTransportHoliday(iso) { return transportHolidayDates.includes(witaDate(iso)); }
function roundUpTo1000(amount) { return Math.ceil(amount / 1000) * 1000; }
// Indonesian schedule timezones -> fixed UTC offset. A ferry's departure time is entered in the
// clock of its origin port, which is not always WITA (e.g. Surabaya/Jakarta are WIB), so the
// departure must be anchored with the route's own offset, not Lombok's. Unknown values fall back
// to WITA so a new route with a blank/typo'd timezone still produces a sane (Lombok-local) time.
const TRANSPORT_TZ_OFFSETS = { WIB: '+07:00', WITA: '+08:00', WIT: '+09:00' };
function zonedToIso(date, time, timezone) { return new Date(`${date}T${time}:00${TRANSPORT_TZ_OFFSETS[timezone] || '+08:00'}`).toISOString(); }
// Builds the absolute (ISO) departure instant for a ferry route from the date/time the customer
// typed, reading the route's scheduleTimezone so WIB/WIT origins are converted correctly.
export function ferryDepartureToIso(routeId, date, time) {
  if (!date || !time) return null;
  const route = transportFerryRouteById(routeId);
  return zonedToIso(date, time, route?.scheduleTimezone);
}
export { witaToIso, witaHour, witaDate };

function bookingIdentity(id, createdAt = '') {
  const compact = String(id || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
  const suffix = (compact.slice(-6) || 'DEMO01').padStart(6, '0');
  const year = String(new Date(createdAt || Date.now()).getFullYear()).slice(-2);
  let verificationCode;
  do { verificationCode = Array.from(crypto.getRandomValues(new Uint8Array(6)), (value) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[value % 32]).join(''); } while (verificationCode === suffix);
  return { bookingId: `TR-${year}-${suffix}`, verificationCode };
}

function computeBreakdown(base, vehicleClassCode, pickupAt, { childSeats = 0, needsRoofRack = false } = {}) {
  const items = [];
  const hour = witaHour(pickupAt);
  if (hour >= 22 || hour < 6) { const s = transportSurcharges.find((entry) => entry.code === 'night'); const amount = s?.amountByClass?.[vehicleClassCode]; if (Number.isFinite(amount)) items.push({ code: s.code, label: s.label, amount }); }
  if (isTransportHoliday(pickupAt)) { const s = transportSurcharges.find((entry) => entry.code === 'holiday'); if (s) items.push({ code: s.code, label: s.label, amount: s.calcType === 'percent' ? Math.round(base * s.amount / 100) : s.amount }); }
  if (childSeats > 0) { const s = transportSurcharges.find((entry) => entry.code === 'child_seat'); if (s) items.push({ code: s.code, label: s.label, amount: s.amount, qty: childSeats }); }
  if (needsRoofRack) { const s = transportSurcharges.find((entry) => entry.code === 'roof_rack'); if (s) items.push({ code: s.code, label: s.label, amount: s.amount }); }
  const surchargeTotal = items.reduce((sum, item) => sum + item.amount, 0);
  return { base, surcharges: items, surchargeTotal, total: roundUpTo1000(base + surchargeTotal), currency: 'IDR' };
}

function logTransportEvent(order, type, text, actor) {
  order.events = order.events || [];
  order.events.push({ id: crypto.randomUUID(), type, text, actor, at: new Date().toISOString() });
  order.updatedAt = new Date().toISOString();
}

function autoAssignDriver(order) {
  const pool = transportDrivers.filter((driver) => driver.status === 'verified');
  const driver = pool[Math.floor(Math.random() * pool.length)] || pool[0] || null;
  order.driverId = driver?.id || null;
  order.status = 'assigned';
  order.updatedAt = new Date().toISOString();
  logTransportEvent(order, 'assigned', `Matched with driver ${driver?.name || 'a verified partner driver'}.`, 'system');
}

const upcomingDemoDate = (date, offset) => (date >= new Date().toISOString().slice(0, 10) ? date : new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10));
function seedOrders() {
  const soon = upcomingDemoDate('2026-10-24', 4);
  const later = upcomingDemoDate('2026-10-30', 10);
  const past = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
  const demoEmail = 'lombok_transfer@gmail.com';
  const make = (overrides) => {
    const id = overrides.id;
    const createdAt = overrides.createdAt || new Date().toISOString();
    const { bookingId, verificationCode } = bookingIdentity(id, createdAt);
    const base = { schemaVersion: TRANSPORT_SCHEMA_VERSION, bookingId, verificationCode, customerEmail: demoEmail, customerName: 'A Rahman', customerPhone: '+62812345000',
      ferry: null, meetingPointId: transportMeetingPoints[0].id, notes: '', waitingFee: 0, cancellationFee: 0, cancellationReason: null, cancelledAt: null,
      paymentProofAt: null, payoutStatus: 'not_due', rating: null, events: [], createdAt, updatedAt: createdAt };
    return { ...base, ...overrides, bookingId, verificationCode };
  };
  const giliBreakdown = computeBreakdown(transportTariffFor(6, 'mpv_premium'), 'mpv_premium', witaToIso(soon, '06:30'), {});
  const kutaBreakdown = computeBreakdown(transportTariffFor(5, 'minibus_12'), 'minibus_12', witaToIso(later, '14:00'), { childSeats: 1 });
  const sembalunBreakdown = computeBreakdown(transportTariffFor(8, 'mpv_standard'), 'mpv_standard', witaToIso(past, '09:00'), {});
  return [
    make({ id: 'demo-transport-gili-assigned', destinationLocationId: 601, zoneId: 6, vehicleClassCode: 'mpv_premium', pickupAt: witaToIso(soon, '06:30'), passengers: 3, luggageUnits: 3, childSeats: 0, needsRoofRack: false,
      ferry: { routeId: 1, departureAt: witaToIso(soon, '02:00'), etaMinAt: witaToIso(soon, '06:00'), etaMaxAt: witaToIso(soon, '07:30'), dockedAt: null },
      priceBreakdown: giliBreakdown, total: giliBreakdown.total, paymentMethod: 'cash', paymentStatus: 'unpaid', status: 'assigned', driverId: 'driver-made' }),
    make({ id: 'demo-transport-kuta-upcoming', destinationLocationId: 501, zoneId: 5, vehicleClassCode: 'minibus_12', pickupAt: witaToIso(later, '14:00'), passengers: 8, luggageUnits: 6, childSeats: 1, needsRoofRack: false,
      priceBreakdown: kutaBreakdown, total: kutaBreakdown.total, paymentMethod: 'bank_transfer', paymentStatus: 'paid', paymentProofAt: new Date().toISOString(), status: 'assigned', driverId: 'driver-ketut' }),
    make({ id: 'demo-transport-sembalun-completed', destinationLocationId: 802, zoneId: 8, vehicleClassCode: 'mpv_standard', pickupAt: witaToIso(past, '09:00'), passengers: 2, luggageUnits: 2, childSeats: 0, needsRoofRack: false,
      priceBreakdown: sembalunBreakdown, total: sembalunBreakdown.total, paymentMethod: 'cash', paymentStatus: 'unpaid', payoutStatus: 'paid', status: 'completed', driverId: 'driver-wayan',
      rating: { score: 5, comment: 'Smooth ride straight to Sembalun, driver was on time.', createdAt: new Date(Date.now() - 4 * 86400000).toISOString() } }),
  ];
}

function emptyData() { return { schemaVersion: TRANSPORT_SCHEMA_VERSION, orders: seedOrders() }; }
function read() {
  try {
    const data = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (!data || !Array.isArray(data.orders)) return emptyData();
    if (!data.orders.length) { data.orders = seedOrders(); write(data); }
    return data;
  } catch { return emptyData(); }
}
function write(data) { localStorage.setItem(storageKey, JSON.stringify(data)); return data; }

export function transportOrders(email) {
  const clean = String(email || '').toLowerCase();
  return read().orders.filter((order) => order.customerEmail === clean).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function transportOrderByCode(code) {
  return read().orders.find((order) => order.bookingId === code || order.id === code) || null;
}

export function quoteTransport({ destinationLocationId, pickupAt, passengers, luggageUnits = 0, childSeats = 0, needsRoofRack = false }) {
  const location = transportLocationById(destinationLocationId);
  if (!location) return null;
  const zone = transportZones.find((entry) => entry.id === location.zoneId);
  const options = transportVehicleClasses.map((cls) => {
    const base = transportTariffFor(zone.id, cls.code);
    if (base == null) return null;
    const breakdown = computeBreakdown(base, cls.code, pickupAt, { childSeats, needsRoofRack });
    const reasons = [];
    if (passengers > cls.maxPassengers) reasons.push(`Does not fit ${passengers} passengers (max ${cls.maxPassengers})`);
    if (luggageUnits > cls.maxLuggage) reasons.push(`Luggage exceeds capacity (max ${cls.maxLuggage} bags)`);
    return { vehicleClass: cls.code, name: cls.name, exampleVehicles: cls.exampleVehicles, maxPassengers: cls.maxPassengers, maxLuggage: cls.maxLuggage, fits: reasons.length === 0, reasons, suggestTwoVehicles: passengers > cls.maxPassengers && passengers <= cls.maxPassengers * 2, priceBreakdown: breakdown, total: breakdown.total };
  }).filter(Boolean);
  return { zone, destination: location, pickupAt, options, expiresAt: new Date(Date.now() + TRANSPORT_QUOTE_TTL_MINUTES * 60000).toISOString() };
}

export function ferryPickupEstimate(routeId, departureAt) {
  const route = transportFerryRouteById(routeId);
  if (!route || !departureAt) return null;
  const departure = new Date(departureAt).getTime();
  return { etaMinAt: new Date(departure + route.crossingMinMin * 60000).toISOString(), etaMaxAt: new Date(departure + route.crossingMinMax * 60000).toISOString() };
}

// Flags when the estimated docking time falls on a different WITA calendar day than the
// departure, so the ferry step can warn the customer their actual arrival day is the next day.
export function ferryArrivalCheck(routeId, departureAt) {
  const estimate = ferryPickupEstimate(routeId, departureAt);
  if (!estimate) return null;
  return { ...estimate, overnight: witaDate(estimate.etaMinAt) !== witaDate(departureAt) };
}

export function createTransportOrder(input) {
  const { destinationLocationId, pickupAt, vehicleClassCode, passengers, luggageUnits = 0, childSeats = 0, needsRoofRack = false, ferry = null, meetingPointId, notes = '', paymentMethod, customerEmail, customerName, customerPhone } = input;
  const location = transportLocationById(destinationLocationId);
  if (!location) return { error: 'Choose a destination to continue.' };
  const vehicleClass = transportVehicleClassByCode(vehicleClassCode);
  if (!vehicleClass) return { error: 'Choose a vehicle to continue.' };
  const base = transportTariffFor(location.zoneId, vehicleClassCode);
  if (base == null) return { error: 'No tariff is published for this route yet.' };
  if (!['cash', 'bank_transfer'].includes(paymentMethod)) return { error: 'Choose a payment method to continue.' };
  const breakdown = computeBreakdown(base, vehicleClassCode, pickupAt, { childSeats, needsRoofRack });
  const data = read();
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const { bookingId, verificationCode } = bookingIdentity(id, createdAt);
  const order = {
    id, schemaVersion: TRANSPORT_SCHEMA_VERSION, bookingId, verificationCode,
    customerEmail: String(customerEmail || '').toLowerCase(), customerName: String(customerName || '').trim().slice(0, 80), customerPhone: String(customerPhone || '').trim().slice(0, 30),
    destinationLocationId: location.id, zoneId: location.zoneId, vehicleClassCode,
    pickupAt, passengers: Number(passengers), luggageUnits: Number(luggageUnits), childSeats: Number(childSeats), needsRoofRack: Boolean(needsRoofRack),
    ferry: ferry ? { routeId: Number(ferry.routeId), departureAt: ferry.departureAt, etaMinAt: ferry.etaMinAt, etaMaxAt: ferry.etaMaxAt, dockedAt: null } : null,
    meetingPointId: meetingPointId ? Number(meetingPointId) : transportMeetingPoints[0]?.id ?? null,
    notes: String(notes || '').trim().slice(0, 500),
    priceBreakdown: breakdown, total: breakdown.total, waitingFee: 0,
    cancellationFee: 0, cancellationReason: null, cancelledAt: null,
    paymentMethod, paymentStatus: 'unpaid', paymentProofAt: null, payoutStatus: 'not_due',
    status: paymentMethod === 'cash' ? 'confirmed' : 'pending_payment',
    driverId: null, rating: null, events: [], createdAt, updatedAt: createdAt,
  };
  logTransportEvent(order, 'created', 'Order created.', 'customer');
  if (order.status === 'confirmed') autoAssignDriver(order);
  data.orders.push(order);
  write(data);
  return { order };
}

export function submitTransportPaymentProof(code) {
  const data = read();
  const order = data.orders.find((entry) => entry.bookingId === code || entry.id === code);
  if (!order || order.status !== 'pending_payment') return { error: 'This order is not awaiting payment.' };
  order.paymentStatus = 'paid'; order.paymentProofAt = new Date().toISOString();
  order.status = 'confirmed'; order.updatedAt = order.paymentProofAt;
  logTransportEvent(order, 'paid', 'Payment proof received and confirmed.', 'system');
  autoAssignDriver(order);
  write(data);
  return { order };
}

export function markTransportDocked(code) {
  const data = read();
  const order = data.orders.find((entry) => entry.bookingId === code || entry.id === code);
  if (!order || !order.ferry || order.ferry.dockedAt) return { error: 'This order has no pending ferry arrival.' };
  order.ferry.dockedAt = new Date().toISOString(); order.updatedAt = order.ferry.dockedAt;
  logTransportEvent(order, 'docked', 'Customer confirmed the ferry has docked. Free waiting time has started.', 'customer');
  write(data);
  return { order };
}

export function transportCancellationPreview(order, at = new Date()) {
  const hoursBefore = (new Date(order.pickupAt).getTime() - at.getTime()) / 3600000;
  let percent = 100;
  for (const [minHours, pct] of TRANSPORT_CANCELLATION_TIERS) { if (hoursBefore >= minHours) { percent = pct; break; } }
  if (['en_route', 'arrived'].includes(order.status)) percent = 100;
  if (order.status === 'pending_payment') percent = 0;
  const fee = Math.round(order.total * percent / 100);
  const paid = order.paymentStatus === 'paid' ? order.total : 0;
  const cancellable = !['completed', 'cancelled', 'expired', 'no_show', 'on_trip'].includes(order.status);
  return { cancellable, hoursBeforePickup: Math.round(hoursBefore * 10) / 10, feePercent: percent, fee, paid, refund: Math.max(0, paid - fee) };
}

export function cancelTransportOrder(code, reason) {
  const data = read();
  const order = data.orders.find((entry) => entry.bookingId === code || entry.id === code);
  if (!order) return { error: 'Order not found.' };
  const preview = transportCancellationPreview(order);
  if (!preview.cancellable) return { error: 'This order can no longer be cancelled.' };
  order.status = 'cancelled'; order.cancellationReason = String(reason || '').trim().slice(0, 300); order.cancellationFee = preview.fee; order.cancelledAt = new Date().toISOString(); order.updatedAt = order.cancelledAt;
  if (preview.paid > 0) order.paymentStatus = 'refunded';
  logTransportEvent(order, 'cancelled', `Order cancelled by customer · fee ${preview.feePercent}%.`, 'customer');
  write(data);
  return { order, preview };
}

export function rateTransportOrder(code, score, comment) {
  const data = read();
  const order = data.orders.find((entry) => entry.bookingId === code || entry.id === code);
  if (!order || order.status !== 'completed' || order.rating) return { error: 'This order cannot be rated right now.' };
  order.rating = { score: Math.min(5, Math.max(1, Number(score) || 5)), comment: String(comment || '').trim().slice(0, 500), createdAt: new Date().toISOString() };
  order.updatedAt = order.rating.createdAt;
  logTransportEvent(order, 'rated', `Customer rated the trip ${order.rating.score}/5.`, 'customer');
  write(data);
  return { order };
}

// Exportable seed/current shape: each array becomes a separate Firebase collection, mirroring
// toSocialFirebaseFixture() in social/repository.js.
export function toTransportFirebaseFixture(source = read()) {
  return {
    transportVehicleClasses: transportVehicleClasses.map((cls) => ({ ...cls, id: cls.code, schemaVersion: 1 })),
    transportZones: transportZones.map(({ locations, ...zone }) => ({ ...zone, schemaVersion: 1 })),
    transportLocations: transportZones.flatMap((zone) => zone.locations.map((location) => ({ ...location, zoneId: zone.id, schemaVersion: 1 }))),
    transportMeetingPoints: transportMeetingPoints.map((point) => ({ ...point, schemaVersion: 1 })),
    transportFerryRoutes: transportFerryRoutes.map((route) => ({ ...route, schemaVersion: 1 })),
    transportDrivers: transportDrivers.map((driver) => ({ ...driver, schemaVersion: 1, needsUpload: false })),
    transportOrders: source.orders.map((order) => ({ ...order })),
  };
}
