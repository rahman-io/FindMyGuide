import { mainLayout } from '../../layouts/MainLayout.js';
import { header } from '../../components/Header.js';
import { icon } from '../../components/icons.js';
import { escapeHtml } from '../../utils/html.js';
import { experiences, getExperience } from '../experiences/data.js';
import { state } from '../../app/store.js';
import { activeSocialUser, socialUser } from '../social/repository.js';
import { activeGuide, bookingQrPayload, filterTripOfferingsByPrice, financeBreakdown, financeConfig, financeSummary, guideById, guideRatingSummary, guideDemoData, guideTripsByGuide, packagePrice, priceSplit, publicTripOfferings, requestDateRange, sharedTripReady, tripModeLabel, tripOfferingAvailability, tripOfferingQuote } from './repository.js';
import { formatCurrency } from '../../services/currency.js';
import { transportOrders } from '../transport/repository.js';
import { transportBookingListCard } from '../transport/view.js';

const esc = escapeHtml;
const money = (amount) => formatCurrency(amount, 'IDR');
const prettyDate = (date) => date ? new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date to be confirmed';
const verificationCodeDisplay = (code) => `<div class="booking-code-tools"><span class="booking-code-display" aria-label="Verification code ${esc(code)}">${String(code || '').split('').map((character) => `<b>${esc(character)}</b>`).join('')}</span><button type="button" class="booking-code-copy" data-action="copy-booking-code" data-value="${esc(code)}">Copy</button></div>`;
const packageCatalog = experiences.filter((item) => item.packageOptions?.length);
const guidePackages = (guide) => packageCatalog.filter((item) => guide.experienceIds.includes(item.id)).flatMap((item) => item.packageOptions.map((option) => ({ item, option })));
const destinationCatalog = experiences;
const AREA_GROUPS = { Lombok: ['Lombok', 'Mataram', 'Sembalun'], Sumbawa: ['Sumbawa'] };
const cityToArea = (city) => Object.keys(AREA_GROUPS).find((area) => AREA_GROUPS[area].includes(city)) || city;
const serviceCities = [...new Set(experiences.map((e) => cityToArea(e.city)).filter(Boolean))].sort();
const GUIDE_LANGUAGES = ['Indonesian', 'English', 'Japanese', 'Korean', 'Chinese', 'French', 'German', 'Spanish', 'Dutch', 'Arabic'];

const statusChip = (status) => {
  const map = { 
    pending_review: ['Pending review', 'pending'], 
    draft: ['Draft', 'pending'], 
    published: ['Published', 'verified'],
    rejected: ['Rejected', 'declined'],
    needs_revision: ['Needs revision', 'pending']
  };
  const [label, tone] = map[status] || [status, 'pending'];
  return `<span class="guide-status guide-status-${tone}">${esc(label)}</span>`;
};


export function tripOfferingPicker(experience, option, date, travelers, selectedId, { priceFilter = 'all', showPriceFilters = false } = {}) {
  if (!option) return '';
  const matchingDate = publicTripOfferings(experience.id, option.id, date, travelers);
  const offers = date ? matchingDate : publicTripOfferings(experience.id, option.id, '', travelers);
  const priceDetails = filterTripOfferingsByPrice(offers, travelers, priceFilter);
  const filters = [['all', 'All prices'], ['promo', 'Promo'], ['cheap', 'Cheapest'], ['mid', 'Mid-range'], ['premium', 'Premium']];
  const filterControls = showPriceFilters && offers.length ? `<div class="trip-price-filters" aria-label="Filter departures by price">${filters.map(([value, label]) => `<button type="button" class="${priceFilter === value ? 'active' : ''}" data-action="set-trip-price-filter" data-value="${value}" aria-pressed="${priceFilter === value}">${label}</button>`).join('')}</div>` : '';
  const noResults = priceFilter === 'promo' ? 'No approved promo departure is available on this date.' : 'No departure matches this price range. Try another filter.';
  const offerCard = ({ offer, total, originalTotal, savings, isPromo, band }) => {
    const availability = tripOfferingAvailability(offer.id);
    const guide = guideById(offer.guideId);
    const rating = guideRatingSummary(offer.guideId);
    const languages = guide?.languages ? esc(guide.languages) : '';
    const trustLine = `${rating.count > 0 ? `<b>★ ${rating.average.toFixed(1)}</b> · ${rating.count} review${rating.count === 1 ? '' : 's'}` : 'New guide'}${languages ? ` · ${languages}` : ''}`;
    const unitLine = offer.priceUnit === 'group' ? `per group · ≈${money(Math.round(total / Math.max(1, travelers)))} per person` : `${money(offer.price)} per person`;
    return `<button type="button" class="guide-pick trip-offer-pick ${selectedId === offer.id ? 'selected' : ''}" data-action="select-trip-offer" data-id="${esc(offer.id)}" aria-pressed="${selectedId === offer.id}"><span class="guide-pick-copy"><strong>${esc(tripModeLabel(offer.mode))}</strong><small>${esc(prettyDate(offer.date))} · ${esc(offer.time)} · ${esc(option.duration)}</small><small>${offer.mode === 'shared' ? `${availability.seatsLeft} seats left · Minimum ${offer.minGuests} travelers to depart` : `${offer.minGuests}–${offer.maxGuests} travelers · Your party only`}</small><small class="guide-pick-trust">${trustLine}</small>${isPromo ? `<em class="trip-price-badge promo">Promo · Save ${money(savings)}</em>` : band === 'cheap' ? '<em class="trip-price-badge value">Lowest price</em>' : ''}</span><span class="guide-pick-price">${money(total)}${isPromo ? `<small><s>${money(originalTotal)}</s> · ${unitLine}</small>` : `<small>${unitLine}</small>`}</span></button>`;
  };
  const modeOrder = ['shared', 'private', 'solo', 'group'];
  const groupedLists = modeOrder.map((mode) => {
    const groupEntries = priceDetails.filter((entry) => entry.offer.mode === mode);
    if (!groupEntries.length) return '';
    const unitLabel = ['private', 'group'].includes(mode) ? 'flat per group' : 'per person';
    return `<div class="guide-pick-group"><h3 class="guide-pick-group-head"><span>${esc(tripModeLabel(mode))}</span><small>${unitLabel}</small></h3><div class="guide-pick-list">${groupEntries.map(offerCard).join('')}</div></div>`;
  }).join('');
  return `<section class="guide-picker" id="guide-picker"><div class="guide-section-heading"><div><small>Guided departures</small><h2>Choose your trip style</h2></div></div><p>${date && !matchingDate.length ? `No approved departure is available on ${esc(prettyDate(date))} for ${travelers} traveler${travelers === 1 ? '' : 's'}. Try another date or party size.` : date ? `Available on ${esc(prettyDate(date))} for ${travelers} traveler${travelers === 1 ? '' : 's'}.` : 'Select a date to see available departures.'} Your assigned guide is introduced after booking confirmation.</p>${filterControls}${offers.length ? priceDetails.length ? groupedLists : `<div class="guide-empty">${noResults}</div>` : '<div class="guide-empty">No approved departure fits this party size yet. Choose another package or try another date.</div>'}</section>`;
}

function baseGuideRequestCard(request, guideMode = false) {
  const item = getExperience(request.experienceId);
  const option = item?.packageOptions?.find((entry) => entry.id === request.packageId);
  const guide = guideMode || request.paymentStatus === 'paid' ? guideById(request.guideId) : null;
  const finance = request.finance || financeBreakdown(request.travelerTotal);
  const dateRange = requestDateRange(request);
  const dateLabel = dateRange.days > 1 ? `${prettyDate(dateRange.start)} – ${prettyDate(dateRange.end)}` : prettyDate(dateRange.start);
  const adults = Number(request.adults || request.travelers || 0);
  const children = Number(request.children || 0);
  const travelerLabel = `${adults} adult${adults === 1 ? '' : 's'}${children ? ` · ${children} child${children === 1 ? '' : 'ren'}` : ''}`;
  const paymentLabel = String(request.paymentStatus || 'unpaid').replace('_', ' ');
  const payoutLabel = String(request.payoutStatus || 'not due').replace('_', ' ');
  const paymentAction = !guideMode && request.status === 'accepted' && request.paymentStatus === 'unpaid' ? `<div class="guide-card-actions"><button data-action="pay-guide-request" data-id="${esc(request.id)}">Pay now</button></div>${request.tripMode === 'shared' && !sharedTripReady(request) ? '<small class="shared-work-hint">You can pay now. If the shared minimum is still unmet within 24 hours of departure, everyone will decide together what happens next.</small>' : ''}` : '';
  const bookingAction = !guideMode && request.paymentStatus === 'paid' ? `<div class="guide-card-actions"><a class="primary-button" href="#/bookings/${esc(request.id)}">Open booking workspace</a></div>` : '';
  const displayStatus = request.paymentStatus === 'paid' && request.status === 'accepted' ? 'confirmed' : request.status;
  const paymentHint = request.paymentStatus === 'refunded' ? 'Payment refunded after the request was declined.' : request.paymentStatus === 'paid' ? `Booking confirmed · payout ${payoutLabel}` : request.status === 'accepted' ? 'Payment is due before the tour starts.' : 'Payment is requested after the guide accepts.';
  const verification = request.paymentStatus === 'paid' ? `<div class="booking-verification" data-booking-verification="${esc(request.id)}"><span><small>Booking ID</small><strong>${esc(request.bookingId)}</strong></span><em class="booking-verification-status ${request.verificationStatus === 'verified' ? 'verified' : ''}">${request.verificationStatus === 'verified' ? 'Verified' : 'Verify at meeting point'}</em>${guideMode && request.verificationStatus !== 'verified' ? `<p class="booking-verification-hint">Ask the traveler to show their QR code or read their verification code.</p><label><span class="sr-only">Traveler verification code</span><input data-booking-code="${esc(request.id)}" inputmode="text" maxlength="8" placeholder="Enter code from traveler" /><button data-action="verify-booking" data-id="${esc(request.id)}">Verify booking</button></label>` : ''}</div>` : '';
  return `<article class="guide-request-card"><div class="guide-request-top"><span class="guide-status guide-status-${esc(displayStatus === 'confirmed' ? 'accepted' : displayStatus)}">${esc(displayStatus)}</span><small>${esc(request.date)} · ${esc(request.time)}</small></div><div class="guide-booking-total"><small>Total booking</small><strong>${money(finance.travelerTotal)}</strong></div>${verification}<h3>${esc(option?.name || item?.title || 'Travel package')}</h3><p>${guideMode ? `Traveler: ${esc(request.travelerName)}` : `Guide: ${esc(guide?.name || 'Local guide')}`} · ${request.travelers} traveler${request.travelers === 1 ? '' : 's'}</p><div class="guide-request-details"><span><small>Destination</small><strong>${esc(item?.city || 'Destination to be confirmed')}</strong></span><span><small>Travel dates</small><strong>${esc(dateLabel)}</strong></span><span><small>Duration</small><strong>${esc(option?.duration || `${dateRange.days} day${dateRange.days === 1 ? '' : 's'}`)}</strong></span><span><small>Start time</small><strong>${esc(request.time || 'To be confirmed')}</strong></span><span><small>Travelers</small><strong>${esc(travelerLabel)}</strong></span><span class="guide-request-detail-wide"><small>Traveler notes</small><strong>${esc(request.notes || 'No special requests added.')}</strong></span></div><div class="guide-request-split"><span>Guide receives <strong>${money(finance.guideShare)}</strong></span><span>Platform gross <strong>${money(finance.platformShare)}</strong></span><span>Payment fee <strong>${money(finance.paymentFee)}</strong></span><span>Platform net est. <strong>${money(finance.platformNet)}</strong></span></div><p class="guide-finance-status"><strong>Payment: ${esc(paymentLabel)}</strong> · ${esc(paymentHint)}</p>${guideMode ? `<div class="guide-card-actions">${request.status === 'pending' ? `<button data-action="guide-request-accept" data-id="${esc(request.id)}">Accept request</button><button data-action="guide-request-decline" data-id="${esc(request.id)}">Decline</button>` : request.status === 'accepted' ? `<button data-action="guide-request-complete" data-id="${esc(request.id)}">Mark tour completed</button>` : ''}${request.paymentStatus === 'paid' ? `<button class="primary-button" data-action="guide-booking-chat" data-id="${esc(request.id)}">Chat with traveler</button>` : ''}</div>` : `${paymentAction}${bookingAction}${request.status === 'completed' && !request.review ? `<form class="guide-review-form" data-request-id="${esc(request.id)}"><label>Rate your guide<select name="stars" required><option value="5">★★★★★ · Excellent</option><option value="4">★★★★ · Good</option><option value="3">★★★ · Okay</option><option value="2">★★ · Poor</option><option value="1">★ · Very poor</option></select></label><label>Review<textarea name="comment" maxlength="500" placeholder="How was your tour?"></textarea></label><button class="primary-button" type="submit">Submit review</button></form>` : request.review ? `<p class="guide-review">${'★'.repeat(request.review.stars)} ${esc(request.review.comment)}</p>` : `<p class="guide-request-hint">${request.status === 'pending' ? 'Waiting for the guide to respond.' : request.status === 'accepted' ? 'Your guide has accepted this request.' : 'The guide declined this request.'}</p>`}`}</article>`;
}

function guideRequestCard(request, guideMode = false) {
  const card = baseGuideRequestCard(request, guideMode).replace(/<button data-action="guide-request-complete"[^>]*>Mark tour completed<\/button>/, '').replace('</h3><p>', `</h3><p>${esc(tripModeLabel(request.tripMode))} · `);
  if (!['paid', 'refunded'].includes(request.paymentStatus)) return card;
  return card.replace(/<\/article>$/, `${request.tripMode === 'shared' && ['paid', 'refunded'].includes(request.paymentStatus) ? `<button class="outline-button full guardian-entry" data-action="booking-shared-chat" data-id="${esc(request.id)}">Open shared trip chat</button>` : ''}<a class="outline-button full guardian-entry" href="#/bookings/${encodeURIComponent(request.id)}/safety">Open Trip Safety Center</a></article>`);
}

function baseTravelerBookingDetailView(id) {
  const request = guideDemoData().requests.find((entry) => entry.id === id && entry.travelerEmail === state.email.toLowerCase());
  if (!request) return travelerBookingsView();
  const item = getExperience(request.experienceId);
  const option = item?.packageOptions?.find((entry) => entry.id === request.packageId);
  const guide = request.paymentStatus === 'paid' ? guideById(request.guideId) : null;
  const finance = request.finance || financeBreakdown(request.travelerTotal);
  const range = requestDateRange(request);
  const dateLabel = range.days > 1 ? `${prettyDate(range.start)} – ${prettyDate(range.end)}` : prettyDate(range.start);
  const paid = request.paymentStatus === 'paid';
  const completed = request.status === 'completed';
  const timeline = [['Request sent', true], ['Guide accepted', request.status !== 'pending' && request.status !== 'declined'], ['Payment received', paid], ['Ready for your trip', paid && !completed], ['Trip completed', completed]];
  const verificationCard = paid ? `<section class="booking-workspace-card booking-verification-card"><div class="booking-verification-heading"><span><small>Booking identity</small><h2>${esc(request.bookingId)}</h2></span><em class="booking-verification-status ${request.verificationStatus === 'verified' ? 'verified' : ''}">${request.verificationStatus === 'verified' ? 'Verified' : 'Ready to verify'}</em></div><div class="booking-qr-wrap"><canvas data-booking-qr data-qr-value="${esc(bookingQrPayload(request))}" width="180" height="180" aria-label="Booking QR code"></canvas><div><strong>Show this QR code to your guide</strong><p>Keep this code private until you meet your guide. The guide will enter it to verify this booking.</p><span class="booking-code-label">Your verification code</span>${verificationCodeDisplay(request.verificationCode)}</div></div></section>` : '';
  return mainLayout(`${header('Booking details')}<div class="page-pad guide-bookings booking-workspace"><div class="booking-workspace-hero"><span class="guide-status guide-status-${esc(completed ? 'completed' : paid ? 'accepted' : request.status)}">${completed ? 'Completed' : paid ? 'Confirmed' : request.status}</span><small>${paid ? 'Your guide is ready to coordinate the trip with you.' : request.status === 'accepted' ? 'Complete payment to confirm your place.' : 'Your request is being reviewed by the guide.'}</small><h1>${esc(option?.name || item?.title || 'Travel package')}</h1><strong>${money(finance.travelerTotal)}</strong></div><section class="booking-timeline"><h2>Booking progress</h2>${timeline.map(([label, done]) => `<div class="booking-timeline-step ${done ? 'done' : ''}"><span>${done ? '✓' : '○'}</span><strong>${label}</strong></div>`).join('')}</section>${verificationCard}<section class="booking-workspace-card"><h2>Your trip</h2><div class="guide-request-details"><span><small>Destination</small><strong>${esc(item?.city || 'Destination to be confirmed')}</strong></span><span><small>Travel dates</small><strong>${esc(dateLabel)}</strong></span><span><small>Duration</small><strong>${esc(option?.duration || `${range.days} day${range.days === 1 ? '' : 's'}`)}</strong></span><span><small>Start time</small><strong>${esc(request.time || 'To be confirmed')}</strong></span><span><small>Travelers</small><strong>${request.adults} adult${request.children ? ` · ${request.children} child${request.children === 1 ? '' : 'ren'}` : ''}</strong></span><span class="guide-request-detail-wide"><small>Your notes</small><strong>${esc(request.notes || 'No special requests added.')}</strong></span></div></section><section class="booking-workspace-card"><h2>Your guide</h2><div class="booking-guide-contact"><span class="guide-avatar guide-avatar-large">${esc(guide?.initials || '?')}</span><span><strong>${esc(guide?.name || 'Local guide')}</strong><small>${esc(guide?.area || 'Local service area')} · ${esc(guide?.languages || 'Languages available')}</small></span></div>${paid ? `<button class="primary-button full" data-action="booking-chat" data-id="${esc(request.id)}">Chat with your guide</button>` : '<p class="guide-caption">Chat access will open after payment confirms the booking.</p>'}</section><section class="booking-workspace-card"><h2>What happens next?</h2><p class="guide-caption">${completed ? 'Your trip is complete. Share your experience by leaving a review below.' : paid ? 'Use the chat to agree on the meeting point, preparation, and any last-minute needs. We will keep this booking available in Bookings until the trip is complete.' : request.status === 'accepted' ? 'Pay the approved total to confirm this booking. After payment, you can chat with your guide and prepare for the trip.' : 'Wait for the guide to accept your request. You will be able to pay after acceptance.'}</p>${!paid && request.status === 'accepted' ? `<button class="primary-button full" data-action="pay-guide-request" data-id="${esc(request.id)}">Pay now (demo)</button>` : ''}${paid ? `<a class="outline-button full booking-destination-link" href="#/experience/${encodeURIComponent(request.experienceId)}">Open destination details</a>` : ''}</section>${completed && !request.review ? `<section class="booking-workspace-card"><h2>Review your guide</h2><form class="guide-review-form" data-request-id="${esc(request.id)}"><label>Rating<select name="stars" required><option value="5">★★★★★ · Excellent</option><option value="4">★★★★ · Good</option><option value="3">★★★ · Okay</option><option value="2">★★ · Poor</option><option value="1">★ · Very poor</option></select></label><label>Review<textarea name="comment" maxlength="500" placeholder="How was your trip?"></textarea></label><button class="primary-button full" type="submit">Submit review</button></form></section>` : ''}</div>`, 'Bookings');
}

export function travelerBookingDetailView(id) {
  let page = baseTravelerBookingDetailView(id);
  const request = guideDemoData().requests.find((entry) => entry.id === id && entry.travelerEmail === state.email.toLowerCase());
  if (request?.tripMode === 'shared' && ['paid', 'refunded'].includes(request.paymentStatus)) page = page.replace('<section class="booking-workspace-card"><h2>What happens next?</h2>', `<section class="booking-workspace-card"><h2>Your shared departure</h2><p class="guide-caption">Meet other travelers and coordinate group decisions and trip details in the shared chat. Your booking remains private.</p><button class="primary-button full" data-action="booking-shared-chat" data-id="${esc(id)}">Open shared trip chat</button></section><section class="booking-workspace-card"><h2>What happens next?</h2>`);
  return ['paid', 'refunded'].includes(request?.paymentStatus) ? page.replace('<section class="booking-workspace-card"><h2>Your trip</h2>', `<a class="outline-button full guardian-entry" href="#/bookings/${encodeURIComponent(id)}/safety">Open Trip Safety Center</a><section class="booking-workspace-card"><h2>Your trip</h2>`) : page;
}

function travelerBookingListCard(request) {
  const item = getExperience(request.experienceId);
  const option = item?.packageOptions?.find((entry) => entry.id === request.packageId);
  const finished = request.status === 'completed';
  const closed = ['declined', 'cancelled'].includes(request.status) || request.paymentStatus === 'refunded';
  const inProgress = request.bookingStatus === 'in_progress';
  const paid = request.paymentStatus === 'paid';
  const label = finished ? 'Trip completed' : closed ? request.paymentStatus === 'refunded' ? 'Refunded' : request.status === 'cancelled' ? 'Cancelled' : 'Declined' : inProgress ? 'Trip in progress' : paid ? 'Booking confirmed' : request.status === 'accepted' ? 'Awaiting payment' : 'Request sent';
  const progress = finished || closed ? 100 : inProgress ? 90 : paid ? 75 : request.status === 'accepted' ? 45 : 20;
  const range = requestDateRange(request);
  const date = range.days > 1 ? `${prettyDate(range.start)} – ${prettyDate(range.end)}` : prettyDate(range.start);
  const title = option?.name || item?.title || 'Travel package';
  return `<a class="traveler-booking-card${closed ? ' is-closed' : ''}" href="#/bookings/${encodeURIComponent(request.id)}" aria-label="View booking ${esc(request.bookingId || request.id)}: ${esc(title)}, ${esc(label)}"><span class="traveler-booking-card-top"><span>Booking status</span><span>${esc(request.bookingId || request.id)}</span></span><span class="traveler-booking-card-main"><span class="traveler-booking-card-icon">${icon('tickets', 27)}</span><span class="traveler-booking-card-copy"><strong>${esc(title)}</strong><span>${esc(date)} · ${esc(item?.city || 'Destination')}</span><em>${esc(label)}</em></span></span><span class="traveler-booking-progress" role="progressbar" aria-label="Booking progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><span style="width:${progress}%"></span></span><span class="traveler-booking-card-bottom"><span>View booking details</span><span class="traveler-booking-card-arrow">${icon('chevron', 18)}</span></span></a>`;
}

export function travelerBookingsView(tab = 'active', category = 'all') {
  const guideRequests = guideDemoData().requests.filter((request) => request.travelerEmail === state.email.toLowerCase());
  const transportOrdersList = transportOrders(state.email);
  const history = tab === 'history';
  const closedGuide = (request) => request.status === 'completed' || ['declined', 'cancelled'].includes(request.status) || request.paymentStatus === 'refunded';
  const closedTransport = (order) => ['completed', 'cancelled', 'expired', 'no_show'].includes(order.status);
  const visibleGuide = guideRequests.filter((request) => closedGuide(request) === history);
  const visibleTransport = transportOrdersList.filter((order) => closedTransport(order) === history);
  const showGuide = category !== 'transport';
  const showTransport = category !== 'guides';
  const visibleCount = (showGuide ? visibleGuide.length : 0) + (showTransport ? visibleTransport.length : 0);
  const cards = `${showGuide ? visibleGuide.map(travelerBookingListCard).join('') : ''}${showTransport ? visibleTransport.map(transportBookingListCard).join('') : ''}`;
  const tabQuery = history ? '?tab=history' : '';
  const categoryHref = (value) => `#/bookings${tabQuery}${value === 'all' ? '' : `${tabQuery ? '&' : '?'}category=${value}`}`;
  const categoryTab = (value, label) => `<a href="${categoryHref(value)}" class="${category === value ? 'active' : ''}" ${category === value ? 'aria-current="page"' : ''}>${label}</a>`;
  const categoryNav = `<nav class="traveler-bookings-tabs traveler-bookings-tabs-category" aria-label="Booking category">${categoryTab('all', 'All')}${categoryTab('guides', 'Guides')}${categoryTab('transport', 'Transport')}</nav>`;
  const emptyAction = history ? '' : category === 'transport' ? '<a class="primary-button" href="#/transport/book">Book a transfer</a>' : '<a class="primary-button" href="#/">Explore experiences</a>';
  return mainLayout(`<header class="screen-header traveler-bookings-header"><strong class="screen-header-title"><span class="screen-header-brand">FMG</span><span>Bookings</span></strong></header><div class="page-pad guide-bookings traveler-bookings-list"><nav class="traveler-bookings-tabs" aria-label="Booking lists"><a href="#/bookings" class="${history ? '' : 'active'}" ${history ? '' : 'aria-current="page"'}>Active</a><a href="#/bookings?tab=history" class="${history ? 'active' : ''}" ${history ? 'aria-current="page"' : ''}>History</a></nav>${categoryNav}${visibleCount ? `<div class="traveler-booking-cards">${cards}</div>` : `<div class="guide-empty"><h2>${history ? 'No past bookings yet' : 'No active bookings yet'}</h2><p>${history ? 'Completed and cancelled trips will appear here.' : 'Choose a package and approved departure, or book a transfer, to see it here.'}</p>${emptyAction}</div>`}</div>`, 'Bookings');
}

export function guideDashboardView() {
  const guide = activeGuide(); const data = guideDemoData();
  const requests = data.requests.filter((request) => request.guideId === guide.id);
  const completed = requests.filter((request) => request.status === 'completed');
  const pending = requests.filter((request) => request.status === 'pending');
  const accepted = requests.filter((request) => request.status === 'accepted');
  const upcomingCount = accepted.length;
  const earned = guide.demoAccount
    ? requests.filter((request) => request.paymentStatus === 'paid').reduce((sum, request) => sum + Number(request.finance?.guideShare || 0), 0)
    : completed.reduce((sum, request) => sum + request.guideShare, 0);
  const pendingPayout = completed.filter((request) => request.paymentStatus === 'paid' && request.payoutStatus !== 'paid').reduce((sum, request) => sum + Number(request.finance?.guideShare || request.guideShare), 0);
  const reviews = completed.filter((request) => request.review);
  const verifiedText = guide.status === 'verified' || guide.demoAccount ? 'Verified by FindMyGuide' : 'Application pending review';

  return mainLayout(`${header('Guide workspace')}<div class="page-pad guide-dashboard">
    <span class="sr-only">${verifiedText}</span>
    ${pending.length ? `<div class="gd-alert-banner"><span class="gd-alert-dot"></span><span>You have <strong>${pending.length} new booking request${pending.length === 1 ? '' : 's'}</strong> waiting for your response.</span></div>` : ''}
    ${guide.status === 'pending' && !guide.demoAccount ? `<div class="guide-empty gd-pending-box"><h2>\u23f3 Waiting for verification</h2><p>Your application is saved. Once approved, your packages will be visible to travelers and you can start accepting bookings.</p></div>` : `
    <div class="gd-stats">
      <div class="gd-stat"><span class="gd-stat-val">${pending.length}</span><span class="gd-stat-lbl"><svg class="gd-stat-fa" viewBox="0 0 512 512" width="11" height="11" fill="currentColor" aria-hidden="true"><path d="M448 64c17.7 0 32 14.3 32 32v256c0 17.7-14.3 32-32 32H347.3c-6.8 0-13.3 2.7-18.1 7.5L304 416H208l-25.2-24.5c-4.8-4.8-11.3-7.5-18.1-7.5H64c-17.7 0-32-14.3-32-32V96c0-17.7 14.3-32 32-32H448zM0 96c0-35.3 28.7-64 64-64H448c35.3 0 64 28.7 64 64V352c0 35.3-28.7 64-64 64H347.3c-6.8 0-13.3 2.7-18.1 7.5L304 448H208l-25.2-24.5c-4.8-4.8-11.3-7.5-18.1-7.5H64c-35.3 0-64-28.7-64-64V96z"/></svg>New requests</span></div>
      <div class="gd-stat"><span class="gd-stat-val">${upcomingCount}</span><span class="gd-stat-lbl"><svg class="gd-stat-fa" viewBox="0 0 448 512" width="11" height="11" fill="currentColor" aria-hidden="true"><path d="M128 0c17.7 0 32 14.3 32 32V64H288V32c0-17.7 14.3-32 32-32s32 14.3 32 32V64h48c26.5 0 48 21.5 48 48v48H0V112C0 85.5 21.5 64 48 64H96V32c0-17.7 14.3-32 32-32zM0 192H448V464c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V192zm337 121c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-111 111-47-47c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9l64 64c9.4 9.4 24.6 9.4 33.9 0L337 313z"/></svg>Upcoming</span></div>
      <div class="gd-stat"><span class="gd-stat-val">${money(earned)}</span><span class="gd-stat-lbl"><svg class="gd-stat-fa" viewBox="0 0 512 512" width="11" height="11" fill="currentColor" aria-hidden="true"><path d="M64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V192c0-35.3-28.7-64-64-64H80c-8.8 0-16-7.2-16-16s7.2-16 16-16H448c17.7 0 32-14.3 32-32s-14.3-32-32-32H64zM416 272a32 32 0 1 1 0 64 32 32 0 1 1 0-64z"/></svg>Guide share</span></div>
    </div>
    ${pendingPayout ? `<div class="gd-payout-row"><span>Pending payout <strong>${money(pendingPayout)}</strong></span><a href="#/admin/finance">View finance \u2192</a></div>` : ''}
    <a href="#/guide/trips" class="gd-create-cta">
      <span class="gd-create-icon">${icon('sparkle', 22)}</span>
      <span class="gd-create-text"><strong>Create a New Trip</strong><small>Set your dates, price, and booking style</small></span>
      <span class="gd-create-arrow">${icon('chevron', 20)}</span>
    </a>
    <div class="guide-section-heading"><h2>Booking requests</h2></div>
    ${requests.length ? requests.map((request) => guideRequestCard(request, true)).join('') : '<div class="guide-empty">' + (guide.demoAccount ? 'No Sumbawa requests yet. Switch to a traveler account and book the Sumbawa open trip to see the request here.' : 'No requests yet.<br><small>Switch to the traveler profile to try booking one of your packages.</small>') + '</div>'}
    ${(() => {
      const trips = guideTripsByGuide(guide.id);
      if (!trips.length) return '';
      return `<div class="gtrip-mytrips"><div class="guide-section-heading"><h2>Your trips</h2></div>${trips.map((trip) => `<article class="gtrip-listing">
    <a href="#/guide/trips/${esc(trip.id)}" class="gtrip-listing-link">
      <div class="gtrip-listing-cover"><span>${icon('image', 20)}</span></div>
      <div class="gtrip-listing-body">
        <div class="gtrip-listing-top">${statusChip(trip.status)}</div>
        <div class="gtrip-listing-meta">
          <h3>${esc(trip.title)}</h3>
          <small>${esc(trip.city)} · ${esc(trip.duration)}</small>
        </div>
        ${(trip.experienceIds || []).length ? `<div class="gtrip-listing-dests">${(trip.experienceIds || []).map((id) => getExperience(id)).filter(Boolean).map((d) => esc(d.title)).join(' · ')}</div>` : ''}
        <div class="gtrip-listing-methods">${(trip.methods || []).map((m) => `<span class="gtrip-tag">${esc(tripModeLabel(m.mode))} · ${money(m.price)}</span>`).join('')}</div>
        ${trip.adminNotes ? `<div class="gtrip-admin-notes"><strong>${icon('alert', 14)} Admin feedback:</strong><p>${esc(trip.adminNotes)}</p></div>` : ''}
      </div>
    </a>
    <div class="gtrip-listing-actions" onclick="event.stopPropagation()">
      <button type="button" class="outline-button" data-action="gtrip-edit" data-id="${esc(trip.id)}">Edit</button>
      <button type="button" class="outline-button gtrip-delete-btn" data-action="gtrip-delete" data-id="${esc(trip.id)}">Delete</button>
    </div>
  </article>`).join('')}</div>`;
    })()}
    <div class="guide-section-heading"><h2>Traveler feedback</h2></div>
    ${reviews.length ? reviews.map((request) => `<div class="guide-feedback"><strong>${esc(request.travelerName)}</strong><span>${'&#9733;'.repeat(request.review.stars)}</span><p>${esc(request.review.comment || 'Rated this tour')}</p></div>`).join('') : '<p class="guide-caption">Reviews appear here after a completed tour.</p>'}
    `}
  </div>`, 'Profile', { hideNavigation: true, className: 'guide-shell' });
}

export function guidePackagesView() {
  const guide = activeGuide();
  const offers = guidePackages(guide).map(({ item, option }) => {
    const agreement = guide.priceAgreements?.[option.id];
    const approved = packagePrice(guide, option);
    const proposed = agreement?.proposal;
    const suggested = proposed?.status === 'pending' ? proposed.amount : approved ?? option.price;
    const split = priceSplit(suggested);
    const finance = financeBreakdown(suggested);
    return `<form class="guide-price-form" data-package-id="${esc(option.id)}"><small>${esc(item.city)} · ${esc(option.duration)}</small><h2>${esc(option.name)}</h2><p class="guide-caption">${approved === null ? 'Not bookable until a price is approved.' : `Traveler currently sees ${money(approved)} per person.`}</p>${proposed ? `<span class="guide-status guide-status-${esc(proposed.status)}">${esc(proposed.status)} proposal: ${money(proposed.amount)}</span>` : ''}<label>Propose traveler price per person (IDR)<input name="price" type="number" inputmode="numeric" min="1000" step="1" value="${suggested}" ${guide.status !== 'verified' ? 'disabled' : ''} required /></label><div class="guide-request-split"><span>Guide receives <strong>${money(split.guideShare)}</strong></span><span>Platform gross <strong>${money(finance.platformShare)}</strong></span><span>Payment fee est. <strong>${money(finance.paymentFee)}</strong></span><span>Platform net est. <strong>${money(finance.platformNet)}</strong></span></div><button class="primary-button" type="submit" ${guide.status !== 'verified' ? 'disabled' : ''}>Submit price proposal</button></form>`;
  });
  const config = financeConfig();
  return mainLayout(`${header('Packages & pricing')}<div class="page-pad guide-dashboard"><p class="guide-caption">Propose the full traveler price per person. A demo admin must approve an exact amount before it appears publicly. The guide receives ${Math.round((1 - config.platformRate) * 100)}%; the app keeps ${Math.round(config.platformRate * 100)}% gross, less an estimated ${Math.round(config.paymentRate * 100)}% payment fee.</p><a class="guide-admin-link" href="#/admin/prices">Open demo admin approvals →</a><h2>Experiences offered</h2><div class="guide-offer-list">${packageCatalog.map((item) => `<button data-action="guide-toggle-experience" data-id="${esc(item.id)}" aria-pressed="${guide.experienceIds.includes(item.id)}" ${guide.status !== 'verified' ? 'disabled' : ''}><span>${esc(item.title)}</span><strong>${guide.experienceIds.includes(item.id) ? 'Offering ✓' : 'Add'}</strong></button>`).join('')}</div>${offers.length ? offers.join('') : '<div class="guide-empty">No package assigned yet.</div>'}</div>`, 'Profile', { hideNavigation: true, className: 'guide-shell' });
}

export function guidePriceApprovalsView() {
  const entries = guideDemoData().guides.flatMap((guide) => guide.experienceIds.flatMap((experienceId) => {
    const item = getExperience(experienceId);
    return (item?.packageOptions || []).filter((option) => guide.priceAgreements?.[option.id]?.proposal).map((option) => ({ guide, item, option, agreement: guide.priceAgreements[option.id] }));
  }));
  const pending = entries.filter(({ agreement }) => agreement.proposal.status === 'pending');
  const decided = entries.filter(({ agreement }) => agreement.proposal.status !== 'pending');
  const card = ({ guide, item, option, agreement }) => `<article class="guide-price-form"><small>${esc(item.city)} · ${esc(guide.name)}</small><h2>${esc(option.name)}</h2><span class="guide-status guide-status-${esc(agreement.proposal.status)}">${esc(agreement.proposal.status)}</span><div class="guide-request-split"><span>Currently approved <strong>${agreement.approvedAmount === null ? 'None' : money(agreement.approvedAmount)}</strong></span><span>Guide proposes <strong>${money(agreement.proposal.amount)}</strong></span></div>${agreement.proposal.status === 'pending' ? `<p class="guide-caption">Approve this exact proposal, or reject it so the guide can propose another price.</p><div class="guide-card-actions"><button type="button" data-action="admin-approve-price" data-id="${esc(guide.id)}" data-value="${esc(option.id)}">Approve price</button><button type="button" data-action="admin-reject-price" data-id="${esc(guide.id)}" data-value="${esc(option.id)}">Reject proposal</button></div>` : `<p class="guide-caption">${agreement.proposal.status === 'approved' ? `Agreed price: ${money(agreement.proposal.agreedAmount)} per person.` : 'Previous approved price remains available, if any.'}</p>`}</article>`;
  return mainLayout(`${header('Demo admin · prices')}<div class="page-pad guide-dashboard"><p class="guide-caption">Local demo approval screen; no admin authentication or payment is connected yet. Only approved prices appear to travelers. Booking requests keep a snapshot of the approved amount.</p><a class="guide-admin-link" href="#/admin/guides">Review guide applications →</a><h2>Awaiting decision · ${pending.length}</h2>${pending.length ? pending.map(card).join('') : '<div class="guide-empty">No price proposals are waiting.</div>'}<h2>Recent decisions</h2>${decided.length ? decided.map(card).join('') : '<p class="guide-caption">No decisions yet.</p>'}<a class="guide-admin-link" href="#/guide/packages">← Back to guide packages</a></div>`, 'Profile', { hideNavigation: true, className: 'guide-shell' });
}

export function guideApplicationsAdminView() {
  const applications = guideDemoData().guides.filter((guide) => guide.accountUserId);
  const pending = applications.filter((guide) => guide.status === 'pending');
  const card = (guide) => {
    const account = socialUser(guide.accountUserId);
    const association = guide.associationName ? `<p><strong>Association:</strong> ${esc(guide.associationName)}${guide.associationId ? ` · ${esc(guide.associationId)}` : ''} <small>(self-reported; not verified)</small></p>` : '';
    return `<article class="guide-request-card"><div class="guide-request-top"><span class="guide-status guide-status-${esc(guide.status)}">${esc(guide.status)}</span><small>${esc(guide.submittedAt ? prettyDate(guide.submittedAt.slice(0, 10)) : 'Demo application')}</small></div><h3>${esc(guide.name)}</h3><p>${esc(account?.accountEmail || 'Traveler account')} · ${esc(guide.area)} · ${esc(guide.languages || 'Languages not specified')}</p><p>${esc(guide.bio || 'No experience details provided.')}</p>${association}<div class="guide-request-details"><span><small>Group capacity</small><strong>${guide.capacity} travelers</strong></span><span><small>Destinations</small><strong>${guide.experienceIds.map((id) => getExperience(id)?.title || id).map(esc).join(', ')}</strong></span></div>${guide.status === 'pending' ? `<div class="guide-card-actions"><button data-action="admin-guide-approve" data-id="${esc(guide.id)}">Approve guide</button><button data-action="admin-guide-reject" data-id="${esc(guide.id)}">Reject application</button></div>` : ''}</article>`;
  };
  return mainLayout(`${header('Demo admin · guide applications')}<div class="page-pad guide-dashboard"><p class="guide-caption">Local demo review only; this screen has no admin authentication and does not verify identity, credentials, or HPI membership. Verify documents and association claims before approving real guides.</p><h2>Awaiting review · ${pending.length}</h2>${pending.length ? pending.map(card).join('') : '<div class="guide-empty">No guide applications are waiting.</div>'}<h2>Application history</h2>${applications.length ? applications.filter((guide) => guide.status !== 'pending').map(card).join('') || '<p class="guide-caption">No decisions yet.</p>' : '<p class="guide-caption">No applications yet.</p>'}<a class="guide-admin-link" href="#/admin/prices">← Back to demo admin</a></div>`, 'Profile', { hideNavigation: true, className: 'guide-shell' });
}

function baseFinanceDashboardView() {
  const data = guideDemoData();
  const summary = financeSummary();
  const requests = [...data.requests].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const status = (value) => String(value || 'not due').replace('_', ' ');
  const card = (request) => {
    const item = getExperience(request.experienceId);
    const option = item?.packageOptions?.find((entry) => entry.id === request.packageId);
    const guide = guideById(request.guideId);
    const finance = request.finance || financeBreakdown(request.travelerTotal);
    const actions = [request.paymentStatus === 'unpaid' && ['pending', 'accepted'].includes(request.status) ? `<button type="button" data-action="admin-record-payment" data-id="${esc(request.id)}">Record payment</button>` : '', request.status === 'completed' && request.paymentStatus === 'paid' && request.payoutStatus !== 'paid' ? `<button type="button" data-action="admin-release-payout" data-id="${esc(request.id)}">Release guide payout</button>` : ''].filter(Boolean).join('');
    return `<article class="guide-request-card finance-request-card"><div class="guide-request-top"><span class="guide-status guide-status-${esc(request.status)}">${esc(request.status)}</span><small>${esc(request.date)} · ${esc(request.time)}</small></div><h3>${esc(option?.name || item?.title || 'Travel package')}</h3><p>${esc(request.travelerName)} · ${esc(guide?.name || 'Local guide')} · ${request.travelers} traveler${request.travelers === 1 ? '' : 's'}</p><div class="guide-request-split"><span>Gross sale <strong>${money(finance.travelerTotal)}</strong></span><span>Guide payout <strong>${money(finance.guideShare)}</strong></span><span>Platform gross <strong>${money(finance.platformShare)}</strong></span><span>Payment fee <strong>${money(finance.paymentFee)}</strong></span><span>Platform net <strong>${money(finance.platformNet)}</strong></span></div><p class="guide-finance-status"><strong>Payment: ${esc(status(request.paymentStatus))}</strong> · Payout: ${esc(status(request.payoutStatus))}</p>${actions ? `<div class="guide-card-actions">${actions}</div>` : ''}</article>`;
  };
  return mainLayout(`${header('Demo admin · finance')}<div class="page-pad guide-dashboard"><p class="guide-caption">Local financial ledger for testing only. It records the agreed price split and demo payment state; no real money is charged or transferred.</p><div class="guide-finance-grid"><div><strong>${money(summary.grossSales)}</strong><small>Paid sales</small></div><div><strong>${money(summary.platformGross)}</strong><small>Platform gross</small></div><div><strong>${money(summary.paymentFees)}</strong><small>Payment fees</small></div><div><strong>${money(summary.platformNet)}</strong><small>Platform net est.</small></div><div><strong>${money(summary.guidePayoutDue)}</strong><small>Guide payout due</small></div><div><strong>${money(summary.guidePayoutPaid)}</strong><small>Guide payout paid</small></div></div><div class="guide-finance-note"><strong>${summary.paidBookings} paid booking${summary.paidBookings === 1 ? '' : 's'}</strong><span>${summary.refunds ? `${money(summary.refunds)} refunded` : 'No refunds recorded'}</span></div><div class="guide-section-heading"><h2>Booking ledger</h2><a href="#/admin/prices">Price approvals →</a></div>${requests.length ? requests.map(card).join('') : '<div class="guide-empty">No booking records yet.</div>'}<a class="guide-admin-link" href="#/guide">← Back to guide workspace</a></div>`, 'Profile', { hideNavigation: true, className: 'guide-shell' });
}

export function financeDashboardView() {
  return baseFinanceDashboardView().replace('<div class="guide-section-heading"><h2>Booking ledger', '<a class="guide-admin-link" href="#/admin/safety">Open demo safety review queue →</a><div class="guide-section-heading"><h2>Booking ledger');
}

export function guideAvailabilityView() {
  const guide = activeGuide();
  return mainLayout(`${header('Availability')}<div class="page-pad guide-dashboard"><p class="guide-caption">Your available dates are open by default. Block dates when you cannot guide. Confirmed tours cannot be blocked.</p><form id="guide-date-form" class="guide-date-form"><label>Date<input name="date" type="date" min="${new Date().toISOString().slice(0, 10)}" required /></label><button class="primary-button" type="submit" ${guide.status !== 'verified' ? 'disabled' : ''}>Block / unblock</button></form><h2>Blocked dates</h2>${guide.blockedDates.length ? guide.blockedDates.map((date) => `<button class="guide-date-chip" data-action="guide-unblock-date" data-value="${esc(date)}">${esc(date)} ×</button>`).join('') : '<p class="guide-caption">No blocked dates.</p>'}<form id="guide-capacity-form" class="guide-date-form"><label>Maximum travelers per day<input name="capacity" type="number" inputmode="numeric" min="1" max="30" value="${guide.capacity}" required /></label><button class="primary-button" type="submit">Save capacity</button></form></div>`, 'Profile', { hideNavigation: true, className: 'guide-shell' });
}

export function guideProfileView() {
  const guide = activeGuide();
  return mainLayout(`${header('Guide profile')}<div class="page-pad guide-dashboard"><form id="guide-profile-form" class="guide-profile-form"><label>Name<input name="name" value="${esc(guide.name)}" maxlength="80" required /></label><label>Service area<input name="area" value="${esc(guide.area)}" maxlength="100" required /></label><label>Languages<input name="languages" value="${esc(guide.languages)}" maxlength="100" /></label><label>About you<textarea name="bio" maxlength="500">${esc(guide.bio)}</textarea></label><button class="primary-button full" type="submit">Save profile</button></form></div>`, 'Profile', { hideNavigation: true, className: 'guide-shell' });
}

export function guideDestinationResultsHtml(area, query) {
  const q = String(query || '').trim().toLowerCase();
  const selected = state.guideApply.experienceIds || [];
  const matches = destinationCatalog.filter((item) => cityToArea(item.city) === area && `${item.title} ${item.category || ''}`.toLowerCase().includes(q));
  if (!matches.length) return '<p class="gapply-dest-empty">No destinations match your search.</p>';
  return `<div class="gapply-dest-grid">${matches.map((item) => { const isChecked = selected.includes(item.id); return `<label class="gapply-dest-card${isChecked ? ' is-selected' : ''}"><input type="checkbox" name="experienceIds" value="${esc(item.id)}" ${isChecked ? 'checked' : ''} /><div class="gapply-dest-img"><img src="${item.image}" alt="${esc(item.title)}" loading="lazy" /></div><div class="gapply-dest-body"><div class="gapply-dest-title">${esc(item.title)}</div><div class="gapply-dest-meta">${esc(item.city)}${item.category ? ' \u00b7 ' + esc(item.category) : ''}</div></div><div class="gapply-dest-check">${icon('check', 14)}</div></label>`; }).join('')}</div>`;
}

export function guideDestinationSelectedHtml() {
  const selected = state.guideApply.experienceIds || [];
  if (!selected.length) return '';
  const chips = selected.map((id) => { const exp = getExperience(id); return exp ? `<span class="gapply-dest-chip">${esc(exp.title)}<button type="button" data-action="gapply-dest-remove" data-id="${esc(id)}" aria-label="Remove ${esc(exp.title)}">${icon('close', 14)}</button></span>` : ''; }).filter(Boolean).join('');
  return `<div class="gapply-dest-selected-head">Selected (${selected.length})</div><div class="gapply-dest-chips">${chips}</div>`;
}

export function guideApplyView() {
  const account = activeSocialUser();
  const application = account.guideApplicationId ? guideById(account.guideApplicationId) : null;
  const resubmitting = application?.status === 'rejected';

  if (account.role === 'guide') {
    return mainLayout(`${header('Become a guide')}<div class="page-pad guide-dashboard"><h1>You are a guide</h1><p class="guide-caption">Your traveler and guide features use this same account.</p><a class="primary-button full" href="#/guide">Open guide workspace</a></div>`, 'Profile', { hideNavigation: true, className: 'guide-shell' });
  }
  if (application && !resubmitting) {
    return mainLayout(`${header('Become a guide')}<div class="page-pad guide-dashboard"><h1>Guide application submitted</h1><p class="guide-caption">Status: <span class="guide-status guide-status-${esc(application.status)}">${esc(application.status === 'pending' ? 'Pending review' : application.status)}</span></p><p class="guide-caption">Your traveler account remains active while the team reviews your application.</p><a class="outline-button full" href="#/profile">Back to Profile</a></div>`, 'Profile', { hideNavigation: true, className: 'guide-shell' });
  }

  const g = state.guideApply || {};
  let step = Math.max(0, Math.min(3, Number(g.step) || 0));

  const stepLabels = ['Identity', 'Legal docs', 'Professional', 'Review'];
  const stepsNav = `<ol class="gapply-steps">${stepLabels.map((label, index) => {
    const cls = index < step ? 'done' : index === step ? 'active' : '';
    const bullet = index < step ? icon('check', 14) : String(index + 1);
    return `<li class="${cls}"><span class="gapply-step-bullet">${bullet}</span><span class="gapply-step-label">${esc(label)}</span></li>`;
  }).join('')}</ol>`;

  let body = '';

  if (step === 0) {
    body = `<div class="gapply-section-header"><h2>Personal identity</h2><p>We need your KTP details to verify your identity and keep travelers safe.</p></div>
    <form id="guide-apply-step-0" class="gapply-form">
      <label>Full name (as on KTP)<input type="text" name="fullName" value="${esc(g.fullName || account.displayName)}" placeholder="Nama lengkap sesuai KTP" maxlength="80" required /></label>
      <label>NIK (Nomor Induk Kependudukan)<input type="text" name="nik" value="${esc(g.nik || '')}" placeholder="16-digit KTP number" pattern="[0-9]{16}" maxlength="16" required /></label>
      <label>Phone number (WhatsApp)<input type="tel" name="phone" value="${esc(g.phone || '')}" placeholder="+62 812 3456 7890" maxlength="30" required /></label>
      <label>Address (domicile)<textarea name="address" placeholder="Alamat lengkap sesuai KTP" maxlength="300" required>${esc(g.address || '')}</textarea></label>
      <div class="gapply-upload-group">
        <div class="gapply-upload gapply-upload-camera"><div class="gapply-upload-row"><span class="gapply-upload-icon">${icon('image', 20)}</span><span class="gapply-upload-text"><strong>Foto KTP</strong><small>Sisi depan, jelas dan terbaca</small></span><span class="gapply-upload-status">${g.ktpFileId ? icon('check', 16) + ' Uploaded' : 'Required'}</span></div><div class="gapply-upload-actions"><button type="button" class="gapply-action-btn" data-action="ktp-open-camera">${icon('camera', 16)} Ambil foto</button><label class="gapply-action-btn">${icon('image', 16)} Galeri<input type="file" name="ktpFile" accept="image/*" hidden /></label></div>${g.ktpPhotoData ? '<div class="gapply-upload-preview"><img src="' + g.ktpPhotoData + '" alt="KTP" /></div>' : ''}</div>
        <div class="gapply-upload gapply-upload-camera"><div class="gapply-upload-row"><span class="gapply-upload-icon">${icon('camera', 20)}</span><span class="gapply-upload-text"><strong>Verifikasi selfie</strong><small>Deteksi wajah AI: depan, kiri & kanan</small></span><span class="gapply-upload-status">${g.selfieFileId ? icon('check', 16) + ' Verified' : 'Required'}</span></div><button type="button" class="gapply-action-btn gapply-liveness-start" data-action="selfie-start-liveness">${icon('camera', 16)} Mulai verifikasi</button>${g.livenessPhotos && g.livenessPhotos.length === 3 ? '<div class="gapply-liveness-previews">' + g.livenessPhotos.map(function(ph, i) { return '<img src="' + ph + '" alt="' + ['Depan','Kiri','Kanan'][i] + '" />'; }).join('') + '</div>' : ''}</div>
      </div>
      <button class="primary-button full" type="submit">Continue to legal documents</button>
    </form>`;
  }

  if (step === 1) {
    body = `<div class="gapply-section-header"><h2>Legal documents</h2><p>Upload your police clearance and any professional licenses you hold.</p></div>
    <form id="guide-apply-step-1" class="gapply-form">
      <div class="gapply-upload-group">
        <label class="gapply-upload"><span class="gapply-upload-icon">${icon('image', 20)}</span><span class="gapply-upload-text"><strong>SKCK (Police clearance)</strong><small>Surat Keterangan Catatan Kepolisian — must be current</small></span><input type="file" name="skckFile" accept="image/*,application/pdf" /><span class="gapply-upload-status">${g.skckFileId ? icon('check', 16) + ' Uploaded' : 'Required'}</span></label>
        <label class="gapply-upload"><span class="gapply-upload-icon">${icon('image', 20)}</span><span class="gapply-upload-text"><strong>KTPP — Guide license</strong><small>Kartu Tanda Pengenal Pramuwisata (optional)</small></span><input type="file" name="ktppFile" accept="image/*,application/pdf" /><span class="gapply-upload-status">${g.ktppFileId ? icon('check', 16) + ' Uploaded' : 'Optional'}</span></label>
      </div>
      <div class="gapply-upload-group">
        <label class="gapply-upload"><span class="gapply-upload-icon">${icon('image', 20)}</span><span class="gapply-upload-text"><strong>BNSP certification</strong><small>Badan Nasional Sertifikasi Profesi (optional)</small></span><input type="file" name="bnspFile" accept="image/*,application/pdf" /><span class="gapply-upload-status">${g.bnspFileId ? icon('check', 16) + ' Uploaded' : 'Optional'}</span></label>
      </div>
      <button class="primary-button full" type="submit">Continue to profile</button>
      <button class="outline-button full" type="button" data-action="guide-apply-back" data-step="0">Back</button>
    </form>`;
  }

  if (step === 2) {
    body = `<div class="gapply-section-header"><h2>Professional profile</h2><p>Tell us about your experience so travelers can find and trust you.</p></div>
    <form id="guide-apply-step-2" class="gapply-form">
      <div class="gapply-upload-group">
        <div class="gapply-upload gapply-upload-camera"><div class="gapply-upload-row"><span class="gapply-upload-icon">${icon('user', 20)}</span><span class="gapply-upload-text"><strong>Foto profil</strong><small>Wajah jelas, tanpa gestur tangan</small></span><span class="gapply-upload-status">${g.profilePhotoFileId ? icon('check', 16) + ' Valid' : 'Required'}</span></div><div class="gapply-upload-actions"><button type="button" class="gapply-action-btn" data-action="profile-open-camera">${icon('camera', 16)} Ambil foto</button><label class="gapply-action-btn">${icon('image', 16)} Galeri<input type="file" name="profilePhotoFile" accept="image/*" hidden /></label></div>${g.profilePhotoData ? '<div class="gapply-upload-preview"><img src="' + g.profilePhotoData + '" alt="Profile" /></div>' : ''}</div>
      </div>
      <label>Service area<select name="area" required><option value="">Select service area</option>${serviceCities.map((city) => `<option value="${esc(city)}" ${g.area === city ? 'selected' : ''}>${esc(city)}</option>`).join('')}</select></label>
      <fieldset class="gapply-lang-fieldset"><legend>Languages spoken</legend><div class="gapply-lang-grid">${GUIDE_LANGUAGES.map((lang) => { const checked = (g.languages || '').split(',').map((s) => s.trim()).includes(lang); return '<label class="gapply-lang-option' + (checked ? ' is-checked' : '') + '"><input type="checkbox" name="languages" value="' + esc(lang) + '"' + (checked ? ' checked' : '') + ' />' + esc(lang) + '</label>'; }).join('')}</div></fieldset>
      <label>Years of experience<input type="number" name="yearsExperience" value="${esc(g.yearsExperience || '')}" placeholder="e.g. 5" min="0" max="50" required /></label>
      <label>About you & your guiding style<textarea name="bio" placeholder="Describe your experience, specialties, and what makes your tours special" maxlength="500" required>${esc(g.bio || '')}</textarea></label>
      <fieldset class="gapply-dest-fieldset"><legend>Destinations you can guide</legend><div class="gapply-dest-search"><span class="gapply-dest-search-icon">${icon('search', 18)}</span><input id="gapply-dest-search" type="search" autocomplete="off" placeholder="${g.area ? 'Search destinations in ' + esc(g.area) : 'Select a service area first'}" ${!g.area ? 'disabled' : ''} /></div><p class="gapply-dest-empty" id="gapply-dest-hint">${g.area ? 'Type at least 2 characters to search destinations in ' + esc(g.area) + '.' : 'Select a service area first to search destinations.'}</p><div id="gapply-dest-results" hidden></div><div id="gapply-dest-selected">${guideDestinationSelectedHtml()}</div></fieldset>
      <fieldset><legend>Guide association (optional)</legend>
        <label>Association name<input name="associationName" value="${esc(g.associationName || '')}" placeholder="e.g. HPI Lombok" maxlength="100" /></label>
        <label>Membership number<input name="associationId" value="${esc(g.associationId || '')}" placeholder="Membership ID" maxlength="80" /></label>
      </fieldset>
      <button class="primary-button full" type="submit">Review application</button>
      <button class="outline-button full" type="button" data-action="guide-apply-back" data-step="1">Back</button>
    </form>`;
  }

  if (step === 3) {
    body = `<div class="gapply-section-header"><h2>Review your application</h2><p>Please review all information before submitting. Our team will verify your documents within 1–3 business days.</p></div>
    <div class="gapply-review">
      <div class="gapply-review-section"><h3>${icon('user', 16)} Identity</h3>
        <div class="gapply-review-row"><span>Name</span><strong>${esc(g.fullName)}</strong></div>
        <div class="gapply-review-row"><span>NIK</span><strong>${esc(g.nik?.slice(0, 4))}****${esc(g.nik?.slice(-4))}</strong></div>
        <div class="gapply-review-row"><span>Phone</span><strong>${esc(g.phone)}</strong></div>
        <div class="gapply-review-row"><span>Address</span><strong>${esc(g.address)}</strong></div>
        <div class="gapply-review-row"><span>KTP photo</span><strong>${g.ktpFileId ? '✓ Uploaded' : '✗ Missing'}</strong></div>
        <div class="gapply-review-row"><span>Verifikasi selfie</span><strong>${g.selfieFileId ? '✓ Verified (' + (g.livenessPhotos?.length || 0) + ' foto)' : '✗ Missing'}</strong></div>
      </div>
      <div class="gapply-review-section"><h3>${icon('info', 16)} Legal documents</h3>
        <div class="gapply-review-row"><span>SKCK</span><strong>${g.skckFileId ? '✓ Uploaded' : '✗ Missing'}</strong></div>
        <div class="gapply-review-row"><span>KTPP license</span><strong>${g.ktppFileId ? '✓ Uploaded' : '— Not provided'}</strong></div>
        <div class="gapply-review-row"><span>BNSP cert</span><strong>${g.bnspFileId ? '✓ Uploaded' : '— Not provided'}</strong></div>
      </div>
      <div class="gapply-review-section"><h3>${icon('star', 16)} Professional profile</h3>
        <div class="gapply-review-row"><span>Area</span><strong>${esc(g.area)}</strong></div>
        <div class="gapply-review-row"><span>Languages</span><strong>${esc(g.languages)}</strong></div>
        <div class="gapply-review-row"><span>Experience</span><strong>${esc(g.yearsExperience)} years</strong></div>
        <div class="gapply-review-row"><span>Destinations</span><strong>${(g.experienceIds || []).map((id) => { const exp = getExperience(id); return exp ? esc(exp.title) : ''; }).filter(Boolean).join(', ') || '—'}</strong></div>
        ${g.associationName ? `<div class="gapply-review-row"><span>Association</span><strong>${esc(g.associationName)}${g.associationId ? ' · ' + esc(g.associationId) : ''}</strong></div>` : ''}
        <div class="gapply-review-row"><span>Profile photo</span><strong>${g.profilePhotoFileId ? '✓ Uploaded' : '✗ Missing'}</strong></div>
      </div>
    </div>
    <div class="gapply-agreement">
      <label class="guide-check"><input type="checkbox" id="guide-apply-agree" /> I confirm all information is accurate. I understand that providing false documents may result in permanent account suspension.</label>
    </div>
    <button class="primary-button full" data-action="guide-apply-submit-click" id="guide-apply-submit" disabled>Submit application</button>
    <button class="outline-button full" type="button" data-action="guide-apply-back" data-step="2" style="margin-top:8px">Back to edit</button>`;
  }

  return mainLayout(`${header('Become a guide')}<div class="page-pad guide-dashboard">${stepsNav}${body}</div>`, 'Profile', { hideNavigation: true, className: 'guide-shell' });
}
