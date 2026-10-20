// Port-transfer views (adopted from the Lembar Transport Customer flow): landing page,
// booking wizard, and the order ticket/detail screen. Follows the same template-literal
// view-function pattern as guides/view.js, reusing shared layout/header/icon/currency helpers
// and the existing .guide-status / .traveler-booking-card / .option-card classes.

import { mainLayout } from '../../layouts/MainLayout.js';
import { header } from '../../components/Header.js';
import { icon } from '../../components/icons.js';
import { escapeHtml } from '../../utils/html.js';
import { state } from '../../app/store.js';
import { formatCurrency } from '../../services/currency.js';
import {
  transportVehicleClasses, transportMeetingPoints, transportMeetingPointById,
  transportFerryRoutes, transportFerryRouteById, transportLocationById, transportDriverById,
  transportVehicleClassByCode, transportPriceList, transportSearchDestinations,
} from './data.js';
import {
  TRANSPORT_STATUS_LABELS, TRANSPORT_FREE_WAITING_MINUTES, transportStatusTone,
  transportOrderByCode, transportCancellationPreview, ferryArrivalCheck, ferryDepartureToIso,
} from './repository.js';

const esc = escapeHtml;
const money = (amount) => formatCurrency(amount, 'IDR');
const WITA_TZ = 'Asia/Makassar';
const witaTimeLabel = (iso) => iso ? new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: WITA_TZ }).format(new Date(iso)) : '—';
const witaDateLabel = (iso) => iso ? new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: WITA_TZ }).format(new Date(iso)) : '—';
const witaFullLabel = (iso) => iso ? `${witaDateLabel(iso)} · ${witaTimeLabel(iso)} WITA` : 'To be confirmed';

// ---------------------------------------------------------------------------
// Landing page
// ---------------------------------------------------------------------------
export function transportLandingView() {
  const priceRows = transportPriceList();
  return mainLayout(`${header('Port transfers')}<div class="page-pad transport-page">
    <section class="transport-hero">
      <div class="transport-hero-banner">
        <div class="transport-hero-images">
          <div class="transport-hero-img-wrap"><img src="/images/vehicle-mpv.webp" alt="MPV" /></div>
          <div class="transport-hero-img-wrap"><img src="/images/vehicle-minibus.webp" alt="Minibus" /></div>
        </div>
        <h1>Port transfers<br /><span>made simple</span></h1>
        <p>Fixed-fare vehicles from Lembar Port, the airport, or your hotel — verified drivers, live tracking, no bargaining.</p>
      </div>
      <div class="transport-hero-badges">
        <span>${icon('check', 14)} Fixed fares</span>
        <span>${icon('check', 14)} Verified drivers</span>
        <span>${icon('check', 14)} Free ferry wait</span>
      </div>
      <a class="primary-button full" href="#/transport/book">Book a transfer</a>
    </section>
    <div class="transport-card" style="margin-top:18px">
      <h2 style="margin:0 0 10px;font-size:15px">Published fares</h2>
      ${priceRows.map(({ zone, prices }) => `<div class="transport-summary-row"><span>${esc(zone.name)}</span><span>${transportVehicleClasses.map((cls) => money(prices[cls.code])).join(' / ')}</span></div>`).join('')}
      <p style="margin:10px 0 0;color:var(--muted);font-size:11px">${transportVehicleClasses.map((cls) => cls.name).join(' / ')} · night, holiday, child-seat and roof-rack surcharges may apply</p>
    </div>
  </div>`, 'Bookings');
}

// ---------------------------------------------------------------------------
// Booking wizard
// ---------------------------------------------------------------------------
export function transportDestinationResultsHtml(query) {
  const { matches, outOfCoverage } = transportSearchDestinations(query);
  if (!matches.length) {
    if (outOfCoverage) return `<div class="transport-destination-outside">${esc(outOfCoverage.name)} is in ${esc(outOfCoverage.city)} — outside our Lombok transfer coverage.</div>`;
    return `<div class="transport-destination-empty">No destinations match “${esc(query)}”. Try a nearby town or landmark.</div>`;
  }
  return matches.map((location) => `<button type="button" class="transport-destination-option" data-action="select-transport-destination" data-id="${location.id}"><span class="transport-destination-icon">${icon('pin', 18)}</span><span><strong>${esc(location.name)}</strong><small>${esc(location.zoneName)} · ~${location.durationMinEst} min</small></span></button>`).join('');
}

function transportStepCriteria(t) {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const selectedLocation = t.destLocationId ? transportLocationById(t.destLocationId) : null;
  return `<form id="transport-step-0-form" class="transport-form">
    <span class="transport-payment-group-label" id="transport-destination-label">Destination</span>
    <div class="transport-destination-field"><span class="transport-destination-field-icon">${icon('search', 20)}</span><input id="transport-destination-search" type="search" autocomplete="off" aria-labelledby="transport-destination-label" placeholder="Search a destination in Lombok" value="${esc(selectedLocation?.name || '')}" /></div>
    <input type="hidden" name="destinationLocationId" id="transport-destination-value" value="${esc(t.destLocationId || '')}" />
    <div id="transport-destination-results" class="transport-destination-results"${selectedLocation ? ' hidden' : ''}>${transportDestinationResultsHtml('')}</div>
    <div class="transport-field-row">
      <label>Pickup date<input type="date" name="date" value="${esc(t.date || tomorrow)}" required /></label>
      <label>Pickup time<input type="time" name="time" value="${esc(t.time || '05:30')}" required /></label>
    </div>
    <label class="transport-check"><input type="checkbox" name="useFerry" ${t.useFerry === false ? '' : 'checked'} /> I'm arriving by ferry from Bali (Padangbai)</label>
    <p style="margin:-4px 0 14px;color:var(--muted);font-size:11px">If you're arriving by ferry, give your best estimate here — you'll confirm the exact crossing on the next step and we'll re-check the price for you.</p>
    <div class="transport-stepper"><span>Passengers</span><input type="number" name="passengers" min="1" max="20" value="${t.pax || 2}" required /></div>
    <div class="transport-stepper"><span>Luggage (bags)</span><input type="number" name="luggageUnits" min="0" max="20" value="${t.luggage ?? 2}" /></div>
    <div class="transport-stepper"><span>Child seats needed</span><input type="number" name="childSeats" min="0" max="4" value="${t.childSeats ?? 0}" /></div>
    <label class="transport-check"><input type="checkbox" name="needsRoofRack" ${t.roofRack ? 'checked' : ''} /> I need a roof / surfboard rack</label>
    <button class="primary-button full" type="submit" style="margin-top:6px">See vehicle options</button>
  </form>`;
}

function transportStepVehicles(t) {
  const quote = t.quote;
  if (!quote) return transportStepCriteria(t);
  return `<div class="transport-card" style="margin-bottom:14px"><strong>${esc(quote.destination.name)}</strong><br /><small style="color:var(--muted)">${witaFullLabel(quote.pickupAt)} (estimate) · ${t.pax} passenger${t.pax === 1 ? '' : 's'}</small></div>
  <div class="transport-vehicle-list">${quote.options.map((option) => `<div class="transport-vehicle-card ${t.vehicleClass === option.vehicleClass ? 'selected' : ''}${option.fits ? '' : ' unavailable'}">
      ${transportVehicleClassByCode(option.vehicleClass)?.image ? `<div class="transport-vehicle-hero"><img class="transport-vehicle-img" src="${transportVehicleClassByCode(option.vehicleClass).image}" alt="${esc(option.name)}" /></div>` : ''}
      <strong class="transport-vehicle-name">${esc(option.name)}</strong>
      <small class="transport-vehicle-examples">${esc(option.exampleVehicles)}</small>
      <div class="transport-vehicle-specs"><span>${option.maxPassengers} passengers</span><span>${option.maxLuggage} bags</span></div>
      ${option.priceBreakdown.surcharges.length ? `<div class="transport-vehicle-meta">${option.priceBreakdown.surcharges.map((surcharge) => `<span class="surcharge">${esc(surcharge.label)}</span>`).join('')}</div>` : ''}
      <div class="transport-vehicle-footer"><div class="transport-vehicle-price"><small>fixed fare</small><strong>${money(option.total)}</strong></div>${option.fits ? `<button type="button" class="transport-select-button" data-action="select-transport-vehicle" data-id="${esc(option.vehicleClass)}">${t.vehicleClass === option.vehicleClass ? 'Selected' : 'Choose this vehicle'}</button>` : `<p class="transport-vehicle-reason">${esc(option.reasons.join(' · '))}${option.suggestTwoVehicles ? ' — consider two vehicles, or choose a Minibus.' : ''}</p>`}</div>
    </div>`).join('')}</div>
  <button class="outline-button full" style="margin-top:14px" type="button" data-action="transport-back-step" data-value="0">Edit trip details</button>`;
}

export function transportFerryEstimateBanner(check) {
  if (!check?.overnight) return '';
  return `<strong>Overnight crossing — arrives the next day. Please confirm your arrival date.</strong><br />Arrival date: <b>${witaDateLabel(check.etaMinAt)}</b> · Estimated docking: <b>${witaTimeLabel(check.etaMinAt)}–${witaTimeLabel(check.etaMaxAt)} WITA</b>`;
}

function transportStepFerry(t) {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const ferryDate = t.ferryDepDate || t.date || tomorrow;
  const ferryTime = t.ferryDepTime || '23:00';
  const routeId = t.ferryRouteId || transportFerryRoutes[0]?.id;
  const ferryTz = transportFerryRouteById(routeId)?.scheduleTimezone || 'WITA';
  const check = routeId ? ferryArrivalCheck(routeId, ferryDepartureToIso(routeId, ferryDate, ferryTime)) : null;
  return `<form id="transport-step-2-form" class="transport-form">
    <div class="transport-alert">Tell us your ferry crossing so we can confirm the exact pickup time and re-check your fare for any night surcharge.</div>
    <label>Ferry route<select name="ferryRouteId" required>${transportFerryRoutes.map((route) => `<option value="${route.id}" ${String(t.ferryRouteId || '') === String(route.id) ? 'selected' : ''}>${esc(route.name)} · ${esc(route.operator)}</option>`).join('')}</select></label>
    <div class="transport-field-row">
      <label>Departure date<input type="date" name="ferryDepDate" value="${esc(ferryDate)}" required /></label>
      <label><span>Departure time <small class="transport-field-hint">(<span id="transport-ferry-tz">${esc(ferryTz)}</span>)</small></span><input type="time" name="ferryDepTime" value="${esc(ferryTime)}" required /></label>
    </div>
    <div class="transport-alert transport-alert-warn" id="transport-ferry-estimate"${check?.overnight ? '' : ' hidden'}>${transportFerryEstimateBanner(check)}</div>
    <label>Meeting point at Lembar Port<select name="meetingPointId">${transportMeetingPoints.map((point) => `<option value="${point.id}" ${String(t.meetingPointId || '') === String(point.id) ? 'selected' : ''}>${esc(point.name)}</option>`).join('')}</select></label>
    <button class="primary-button full" type="submit">Confirm ferry & continue</button>
  </form>
  <button class="outline-button full" style="margin-top:10px" type="button" data-action="transport-back-step" data-value="1">Back to vehicle options</button>`;
}

function transportStepPayment(t) {
  const breakdown = t.vehiclePriceBreakdown;
  if (!breakdown) return transportStepVehicles(t);
  const vehicle = transportVehicleClassByCode(t.vehicleClass);
  const location = transportLocationById(t.destLocationId);
  return `${t.priceUpdated ? `<div class="transport-alert transport-alert-warn">Your fare was updated to ${money(t.vehicleTotal)} based on your confirmed ferry arrival time.</div>` : ''}
  <div class="transport-card" style="margin-bottom:14px">
    <strong>${esc(vehicle?.name || t.vehicleClass)} to ${esc(location?.name || '')}</strong>
    <div class="transport-summary-row"><span>Pickup</span><span>${witaFullLabel(t.pickupAt)}</span></div>
    <div class="transport-summary-row"><span>Passengers</span><span>${t.pax} pax · ${t.luggage} bags${t.childSeats ? ` · ${t.childSeats} child seat${t.childSeats === 1 ? '' : 's'}` : ''}</span></div>
    ${t.ferry ? `<div class="transport-summary-row"><span>Ferry</span><span>${esc(transportFerryRouteById(t.ferry.routeId)?.name || '')}</span></div>` : ''}
    <div class="transport-summary-row"><span>Base fare</span><span>${money(breakdown.base)}</span></div>
    ${breakdown.surcharges.map((surcharge) => `<div class="transport-summary-row"><span>${esc(surcharge.label)}${surcharge.qty ? ` ×${surcharge.qty}` : ''}</span><span>${money(surcharge.amount)}</span></div>`).join('')}
    <div class="transport-summary-row total"><span>Total due</span><span>${money(t.vehicleTotal)}</span></div>
  </div>
  <form id="transport-step-3-form" class="transport-form">
    <label>Contact name<input type="text" name="customerName" value="${esc(state.guestName)}" maxlength="80" required /></label>
    <label>Contact phone<input type="tel" name="customerPhone" placeholder="+62 812 3456 7890" maxlength="30" required /></label>
    <div class="transport-payment-group">
      <span class="transport-payment-group-label">Payment method</span>
      <label class="transport-payment-option">
        <input type="radio" name="paymentMethod" value="cash" checked />
        <span class="transport-payment-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 10h.01M18 14h.01"/></svg></span>
        <span class="transport-payment-copy"><strong>Cash to driver</strong><small>Pay in Rupiah when you meet your driver</small></span>
        <span class="transport-payment-check">${icon('check', 14)}</span>
      </label>
      <label class="transport-payment-option">
        <input type="radio" name="paymentMethod" value="bank_transfer" />
        <span class="transport-payment-icon">${icon('credit', 22)}</span>
        <span class="transport-payment-copy"><strong>Bank transfer</strong><small>We'll confirm your order once you've sent the transfer</small></span>
        <span class="transport-payment-check">${icon('check', 14)}</span>
      </label>
    </div>
    <label>Notes for your driver (optional)<textarea name="notes" maxlength="500" placeholder="Flight number, extra stop, etc."></textarea></label>
    <button class="primary-button full" type="submit">Confirm transfer · ${money(t.vehicleTotal)}</button>
  </form>
  <button class="outline-button full" style="margin-top:10px" type="button" data-action="transport-back-step" data-value="${t.useFerry ? 2 : 1}">Back</button>`;
}

export function transportWizardView() {
  const t = state.transport || {};
  let step = t.quote ? Number(t.step) || 0 : 0;
  if (step >= 2 && !t.vehicleClass) step = 1;
  if (step === 2 && !t.useFerry) step = 3;
  if (step === 3 && !t.vehiclePriceBreakdown) step = t.vehicleClass ? (t.useFerry ? 2 : 1) : 1;

  const stepLabels = ['Trip details', 'Choose vehicle', 'Ferry schedule', 'Payment'];
  const stepsNav = `<ol class="transport-steps">${stepLabels.map((label, index) => {
    const stateClass = index < step ? 'done' : index === step ? 'active' : '';
    const bullet = index < step ? icon('check', 14) : String(index + 1);
    return `<li class="${stateClass}"><span class="transport-step-bullet">${bullet}</span><span class="transport-step-label">${esc(label)}</span></li>`;
  }).join('')}</ol>`;
  const body = step === 0 ? transportStepCriteria(t) : step === 1 ? transportStepVehicles(t) : step === 2 ? transportStepFerry(t) : transportStepPayment(t);
  return mainLayout(`${header('Book a transfer')}<div class="page-pad transport-page">${stepsNav}${body}</div>`, 'Bookings');
}

// ---------------------------------------------------------------------------
// Order ticket / detail
// ---------------------------------------------------------------------------
export function transportTicketView(code) {
  const order = transportOrderByCode(code);
  if (!order || order.customerEmail !== state.email.toLowerCase()) return transportLandingView();
  const location = transportLocationById(order.destinationLocationId);
  const vehicle = transportVehicleClassByCode(order.vehicleClassCode);
  const driver = order.driverId ? transportDriverById(order.driverId) : null;
  const meetingPoint = order.meetingPointId ? transportMeetingPointById(order.meetingPointId) : null;
  const ferryRoute = order.ferry ? transportFerryRouteById(order.ferry.routeId) : null;
  const tone = transportStatusTone(order.status);
  const label = TRANSPORT_STATUS_LABELS[order.status] || order.status;
  const closedStatus = ['cancelled', 'expired', 'no_show'].includes(order.status);
  const cancellable = !['completed', 'on_trip', ...(closedStatus ? [order.status] : [])].includes(order.status) && !closedStatus;
  const canRate = order.status === 'completed' && !order.rating;
  const needsFerryDockConfirm = order.ferry && !order.ferry.dockedAt && !closedStatus && order.status !== 'completed';
  const awaitingPayment = order.status === 'pending_payment';
  const breakdown = order.priceBreakdown;

  const timelineSteps = closedStatus
    ? [['Order placed', true], [label, true]]
    : [
        ['Order placed', true],
        ['Payment confirmed', order.status !== 'pending_payment'],
        ['Driver assigned', Boolean(order.driverId)],
        ['Driver en route / at meeting point', ['en_route', 'arrived', 'on_trip', 'completed'].includes(order.status)],
        ['Trip completed', order.status === 'completed'],
      ];
  const currentIndex = timelineSteps.findIndex(([, done]) => !done);

  const cancelCard = cancellable ? (() => {
    const preview = transportCancellationPreview(order);
    return `<div class="transport-card"><p style="margin:0 0 10px;color:var(--muted);font-size:12px">Cancelling now would ${preview.fee > 0 ? `incur a fee of ${money(preview.fee)} (${preview.feePercent}% of the total).` : 'be free of charge.'}</p><button class="outline-button full" data-action="cancel-transport-order" data-id="${esc(order.bookingId)}">Cancel this transfer</button></div>`;
  })() : '';

  const ratingCard = order.rating
    ? `<div class="transport-card"><h2 style="margin:0 0 6px;font-size:15px">Your rating</h2><p style="margin:0;color:var(--navy)">${'★'.repeat(order.rating.score)}${'☆'.repeat(5 - order.rating.score)}</p>${order.rating.comment ? `<p style="margin:6px 0 0;color:var(--muted);font-size:12px">${esc(order.rating.comment)}</p>` : ''}</div>`
    : canRate
      ? `<div class="transport-card"><h2 style="margin:0 0 10px;font-size:15px">Rate this transfer</h2><form class="transport-rate-form" data-order-code="${esc(order.bookingId)}"><label>Rating<select name="score" required><option value="5">★★★★★ · Excellent</option><option value="4">★★★★ · Good</option><option value="3">★★★ · Okay</option><option value="2">★★ · Poor</option><option value="1">★ · Very poor</option></select></label><label>Comment (optional)<textarea name="comment" maxlength="500" placeholder="How was your transfer?"></textarea></label><button class="primary-button full" type="submit">Submit rating</button></form></div>`
      : '';

  return mainLayout(`${header('Transfer details')}<div class="page-pad transport-page">
    <div class="transport-card">
      <span class="guide-status guide-status-${esc(tone)}">${esc(label)}</span>
      <h1 style="margin:10px 0 2px;font-size:20px">Transfer to ${esc(location?.name || 'destination')}</h1>
      <p style="margin:0;color:var(--muted);font-size:12px">Booking ID ${esc(order.bookingId)} · ${esc(vehicle?.name || order.vehicleClassCode)}</p>
      <div class="transport-summary-row" style="margin-top:10px"><span>Pickup</span><span>${witaFullLabel(order.pickupAt)}</span></div>
    </div>
    ${needsFerryDockConfirm ? `<div class="transport-alert">Your driver is waiting for your ferry${ferryRoute ? ` (${esc(ferryRoute.name)})` : ''}. Tell us once you've docked so free waiting time starts.</div><button class="primary-button full" data-action="mark-transport-docked" data-id="${esc(order.bookingId)}">I've docked at Lembar Port</button>` : ''}
    ${order.ferry?.dockedAt ? `<div class="transport-alert transport-alert-good">Docked confirmed at ${witaFullLabel(order.ferry.dockedAt)}. Free waiting time: ${TRANSPORT_FREE_WAITING_MINUTES} minutes.</div>` : ''}
    <div class="transport-card">
      <h2 style="margin:0 0 10px;font-size:15px">Trip progress</h2>
      <div class="transport-timeline">${timelineSteps.map(([stepLabel, done], index) => `<div class="transport-timeline-step ${done ? 'done' : ''} ${!done && index === currentIndex ? 'current' : ''}"><span class="dot"></span><span>${esc(stepLabel)}</span></div>`).join('')}</div>
    </div>
    ${driver ? `<div class="transport-card"><h2 style="margin:0 0 10px;font-size:15px">Your driver</h2><div class="transport-driver-contact"><span class="guide-avatar guide-avatar-large">${esc(driver.initials)}</span><span><strong>${esc(driver.name)}</strong><small>${esc(driver.vehicle.brand)} ${esc(driver.vehicle.model)} · ${esc(driver.vehicle.color)} · ${esc(driver.vehicle.plateNumber)}</small><small>★ ${driver.ratingAvg.toFixed(1)} · ${driver.tripsCompleted} trips</small></span></div><button type="button" class="primary-button full" style="margin-top:12px" data-action="transport-driver-chat" data-id="${esc(order.bookingId)}">Chat with driver</button></div>` : ''}
    ${meetingPoint ? `<div class="transport-card transport-meeting-copy"><strong>Meeting point</strong><p>${esc(meetingPoint.name)} — ${esc(meetingPoint.instructions)}</p></div>` : ''}
    ${order.ferry ? `<div class="transport-card"><h2 style="margin:0 0 10px;font-size:15px">Ferry crossing</h2><div class="transport-summary-row"><span>Route</span><span>${esc(ferryRoute?.name || '—')}</span></div><div class="transport-summary-row"><span>Departure</span><span>${witaFullLabel(order.ferry.departureAt)}</span></div><div class="transport-summary-row"><span>Estimated arrival</span><span>${witaFullLabel(order.ferry.etaMinAt)} – ${witaFullLabel(order.ferry.etaMaxAt)}</span></div></div>` : ''}
    <div class="transport-card">
      <h2 style="margin:0 0 10px;font-size:15px">Price breakdown</h2>
      <div class="transport-summary-row"><span>Base fare</span><span>${money(breakdown.base)}</span></div>
      ${breakdown.surcharges.map((surcharge) => `<div class="transport-summary-row"><span>${esc(surcharge.label)}${surcharge.qty ? ` ×${surcharge.qty}` : ''}</span><span>${money(surcharge.amount)}</span></div>`).join('')}
      <div class="transport-summary-row total"><span>Total</span><span>${money(order.total)}</span></div>
      <p style="margin:10px 0 0;color:var(--muted);font-size:11px">Payment method: ${order.paymentMethod === 'cash' ? 'Cash to driver' : 'Bank transfer'} · ${esc(String(order.paymentStatus).replace('_', ' '))}</p>
      ${awaitingPayment ? `<button class="primary-button full" style="margin-top:12px" data-action="confirm-transport-payment" data-id="${esc(order.bookingId)}">I've sent the payment</button>` : ''}
    </div>
    ${ratingCard}
    ${cancelCard}
  </div>`, 'Bookings');
}

// ---------------------------------------------------------------------------
// Merge-into-Bookings card (consumed by guides/view.js's travelerBookingsView)
// ---------------------------------------------------------------------------
export function transportBookingListCard(order) {
  const location = transportLocationById(order.destinationLocationId);
  const label = TRANSPORT_STATUS_LABELS[order.status] || order.status;
  const progressMap = { pending_payment: 15, confirmed: 35, assigned: 55, en_route: 70, arrived: 85, on_trip: 92, completed: 100, cancelled: 100, expired: 100, no_show: 100 };
  const progress = progressMap[order.status] ?? 20;
  const closed = ['cancelled', 'expired', 'no_show'].includes(order.status);
  return `<a class="traveler-booking-card${closed ? ' is-closed' : ''}" href="#/transport/orders/${encodeURIComponent(order.bookingId)}" aria-label="View transfer ${esc(order.bookingId)}: transfer to ${esc(location?.name || 'destination')}, ${esc(label)}"><span class="traveler-booking-card-top"><span>Transfer status</span><span>${esc(order.bookingId)}</span></span><span class="traveler-booking-card-main"><span class="traveler-booking-card-icon">${icon('map', 27)}</span><span class="traveler-booking-card-copy"><strong>Transfer to ${esc(location?.name || 'destination')}</strong><span>${witaFullLabel(order.pickupAt)}</span><em>${esc(label)}</em></span></span><span class="traveler-booking-progress" role="progressbar" aria-label="Transfer progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><span style="width:${progress}%"></span></span><span class="traveler-booking-card-bottom"><span>View transfer details</span><span class="traveler-booking-card-arrow">${icon('chevron', 18)}</span></span></a>`;
}
