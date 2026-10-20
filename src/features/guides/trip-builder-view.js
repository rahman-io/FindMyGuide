import { mainLayout } from '../../layouts/MainLayout.js';
import { header } from '../../components/Header.js';
import { icon } from '../../components/icons.js';
import { escapeHtml } from '../../utils/html.js';
import { experiences, getExperience } from '../experiences/data.js';
import { state } from '../../app/store.js';
import { activeGuide, guideTripsByGuide, guideTripById, tripModeLabel } from './repository.js';
import { formatCurrency } from '../../services/currency.js';

const esc = escapeHtml;
const money = (amount) => formatCurrency(Number(amount) || 0, 'IDR');
const AREA_GROUPS = { Lombok: ['Lombok', 'Mataram', 'Sembalun'], Sumbawa: ['Sumbawa'] };
const cityToArea = (city) => Object.keys(AREA_GROUPS).find((area) => AREA_GROUPS[area].includes(city)) || city;
const serviceCities = [...new Set(experiences.map((e) => cityToArea(e.city)).filter(Boolean))].sort();
const TRIP_STEPS = ['Trip basics', 'Trip story', 'Travel methods', 'Review'];
export function tripDestinationResultsHtml(query) {
  const q = String(query || '').trim().toLowerCase();
  const guide = activeGuide();
  const selected = state.tripBuilder.experienceIds || [];
  
  const registeredIds = guide.experienceIds || [];
  const registeredItems = registeredIds.map((id) => getExperience(id)).filter(Boolean);
  
  let matches = [];
  if (!q) {
    matches = registeredItems.length ? registeredItems : experiences.slice(0, 6);
  } else {
    matches = experiences.filter((item) => {
      const searchable = `${item.title} ${item.category || ''} ${item.city || ''} ${item.description || ''} ${item.highlights || ''} ${item.itinerary || ''}`.toLowerCase();
      return searchable.includes(q);
    });
  }

  if (!matches.length) return '<p class="gapply-dest-empty">No destinations match your search.</p>';
  
  return `<div class="gapply-dest-grid">${matches.map((item) => { const isChecked = selected.includes(item.id); return `<label class="gapply-dest-card${isChecked ? ' is-selected' : ''}"><input type="checkbox" name="experienceIds" value="${esc(item.id)}" ${isChecked ? 'checked' : ''} /><div class="gapply-dest-img"><img src="${item.image}" alt="${esc(item.title)}" loading="lazy" /></div><div class="gapply-dest-body"><div class="gapply-dest-title">${esc(item.title)}</div><div class="gapply-dest-meta">${esc(item.city)}${item.category ? ' \u00b7 ' + esc(item.category) : ''}</div></div><div class="gapply-dest-check">${icon('check', 14)}</div></label>`; }).join('')}</div>`;
}

export function tripDestinationSelectedHtml() {
  const selected = state.tripBuilder.experienceIds || [];
  if (!selected.length) return '';
  const chips = selected.map((id) => { const exp = getExperience(id); return exp ? `<span class="gapply-dest-chip">${esc(exp.title)}<button type="button" data-action="gtrip-dest-remove" data-id="${esc(id)}" aria-label="Remove ${esc(exp.title)}">${icon('close', 14)}</button></span>` : ''; }).filter(Boolean).join('');
  return `<div class="gapply-dest-selected-head">Selected (${selected.length})</div><div class="gapply-dest-chips">${chips}</div>`;
}
export const TRIP_METHODS = [
  { mode: 'solo', unit: 'per person', hint: 'One traveler, just them and you. Priced per person.', ico: 'user' },
  { mode: 'private', unit: 'per group', hint: 'A private party books the whole trip at one group price.', ico: 'community' },
  { mode: 'shared', unit: 'per person', hint: 'An open departure where separate travelers join and share the day — like the Sumbawa open trip. Priced per person.', ico: 'community' },
  { mode: 'group', unit: 'per group', hint: 'A larger private group at one all-in group price.', ico: 'community' },
];

const statusChip = (status) => {
  const map = { pending_review: ['Pending review', 'pending'], draft: ['Draft', 'pending'], published: ['Published', 'verified'] };
  const [label, tone] = map[status] || [status, 'pending'];
  return `<span class="guide-status guide-status-${tone}">${esc(label)}</span>`;
};

function progressHtml(step) {
  return `<ol class="transport-steps" aria-label="Form progress">${TRIP_STEPS.map((label, index) => {
    const n = index + 1;
    const stateClass = n < step ? 'done' : n === step ? 'active' : '';
    const bullet = n < step ? icon('check', 14) : String(n);
    return `<li class="${stateClass}"><span class="transport-step-bullet">${bullet}</span><span class="transport-step-label">${esc(label)}</span></li>`;
  }).join('')}</ol>`;
}

function stepBasics(tb) {
  const guide = activeGuide();
  const areaValue = tb.city || guide.area || '';
  const areaOptions = [...new Set([...serviceCities, ...(guide.area ? [guide.area] : [])])];
  const hasDest = (guide.experienceIds || []).length > 0;
  return `<div class="gtrip-step">
    <div class="gtrip-step-head"><h2>Trip basics</h2><p>Set the essential details for your trip.</p></div>
    <label class="gtrip-field">Trip title<input name="title" value="${esc(tb.title || '')}" maxlength="120" placeholder="e.g. Sumbawa Open Trip: Kenawa, Moyo & Whale Sharks" required /></label>
    <label class="gtrip-field">Service area<select name="city" required><option value="">Select area</option>${areaOptions.map((c) => `<option value="${esc(c)}" ${areaValue === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
    <fieldset class="gapply-dest-fieldset gtrip-dest-fieldset"><legend>Destinations for this trip</legend><p class="gtrip-dest-sub">Pick from the destinations you chose when you registered as a guide.</p><div class="gapply-dest-search"><span class="gapply-dest-search-icon">${icon('search', 18)}</span><input id="gtrip-dest-search" type="search" autocomplete="off" placeholder="${hasDest ? 'Search your destinations' : 'No registered destinations yet'}" ${hasDest ? '' : 'disabled'} /></div><p class="gapply-dest-empty" id="gtrip-dest-hint">${hasDest ? 'Type at least 2 characters to search your destinations.' : 'You have not selected any destinations yet. Add them from your guide registration.'}</p><div id="gtrip-dest-results"></div><div id="gtrip-dest-selected">${tripDestinationSelectedHtml()}</div></fieldset>
    <div class="gtrip-row gtrip-row-2">
      <label class="gtrip-field">Start date<input id="gtrip-start-date" name="startDate" type="text" value="${esc(tb.startDate || '')}" placeholder="Select start date" required readonly /></label>
      <label class="gtrip-field">End date<input id="gtrip-end-date" name="endDate" type="text" value="${esc(tb.endDate || '')}" placeholder="Select end date" required readonly /></label>
    </div>
    <label class="gtrip-field">Meeting point<input id="gtrip-meeting-point" name="meetingPoint" value="${esc(tb.meetingPoint || '')}" placeholder="Search for a location..." required autocomplete="off" /><div id="gtrip-location-results" class="gtrip-location-dropdown" hidden></div></label>
    <div id="gtrip-map" class="gtrip-map"></div>
    <label class="gtrip-field">Meeting time<input name="meetingTime" type="time" value="${esc(tb.meetingTime || '')}" required /></label>
  </div>`;
}

function stepStory(tb) {
  return `<div class="gtrip-step">
    <div class="gtrip-step-head"><h2>Trip story</h2><p>Describe the experience and what makes it special. One item per line for the lists.</p></div>
    <label class="gtrip-field">Description<textarea name="description" maxlength="1200" placeholder="Describe the trip, the route, and the vibe." required>${esc(tb.description || '')}</textarea></label>
    <label class="gtrip-field">Highlights<textarea name="highlights" maxlength="800" placeholder="One highlight per line, e.g.&#10;Snorkel at Pulau Kenawa&#10;Sunset at Mata Jitu Waterfall">${esc(tb.highlights || '')}</textarea></label>
    <label class="gtrip-field">Itinerary<textarea name="itinerary" maxlength="1500" placeholder="One step per line, e.g.&#10;Day 1 · Pickup & boat to Kenawa&#10;Day 2 · Moyo island & waterfall">${esc(tb.itinerary || '')}</textarea></label>
    <label class="gtrip-field">What's included<textarea name="includes" maxlength="1000" placeholder="One item per line, e.g.&#10;Hotel pickup & drop-off&#10;Private boat&#10;Meals & snorkeling gear">${esc(tb.includes || '')}</textarea></label>
  </div>`;
}

function methodCard(tb, meta) {
  const m = tb.methods[meta.mode];
  const on = !!m.enabled;
  return `<div class="gtrip-method${on ? ' is-on' : ''}">
    <label class="gtrip-method-head">
      <span class="gtrip-method-ico">${icon(meta.ico, 18)}</span>
      <span class="gtrip-method-title"><strong>${esc(tripModeLabel(meta.mode))}</strong><small>${esc(meta.hint)}</small></span>
      <span class="gtrip-method-switch"><input type="checkbox" name="method_${meta.mode}" ${on ? 'checked' : ''} /><span class="gtrip-switch-track"></span></span>
    </label>
    ${on ? `<div class="gtrip-method-body">
      <label class="gtrip-field">Price (IDR, ${meta.unit})<input name="price_${meta.mode}" type="number" min="1000" step="1" value="${esc(String(m.price || ''))}" placeholder="e.g. 3500000" /></label>
      ${meta.mode === 'solo' ? '' : `<div class="gtrip-row"><label class="gtrip-field">Min travelers<input name="min_${meta.mode}" type="number" min="1" max="60" value="${esc(String(m.minGuests || 1))}" /></label><label class="gtrip-field">Max travelers<input name="max_${meta.mode}" type="number" min="1" max="60" value="${esc(String(m.maxGuests || 1))}" /></label></div>`}
    </div>` : ''}
  </div>`;
}

function stepMethods(tb) {
  return `<div class="gtrip-step">
    <div class="gtrip-step-head"><h2>Travel method</h2><p>Choose one way travelers can book this trip, and set its price.</p></div>
    <div class="gtrip-methods">${TRIP_METHODS.map((meta) => methodCard(tb, meta)).join('')}</div>
    <p class="gtrip-note">${icon('info', 14)} Private and group prices cover the whole party. Solo and shared prices are per person. You schedule dates for each method after the trip is approved.</p>
  </div>`;
}

function reviewList(title, items) {
  if (!items.length) return '';
  return `<div class="gtrip-review-block"><h4>${esc(title)}</h4><ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></div>`;
}

function stepReview(tb) {
  const lines = (value) => String(value || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const chosen = TRIP_METHODS.filter((meta) => tb.methods[meta.mode].enabled && Number(tb.methods[meta.mode].price) >= 1000);
  const startDate = tb.startDate || '';
  const endDate = tb.endDate || '';
  const days = startDate && endDate ? Math.ceil((new Date(endDate) - new Date(startDate)) / 86400000) + 1 : 1;
  const nights = Math.max(0, days - 1);
  const duration = nights > 0 ? `${days} day${days === 1 ? '' : 's'} · ${nights} night${nights === 1 ? '' : 's'}` : `${days} day${days === 1 ? '' : 's'}`;
  return `<div class="gtrip-step">
    <div class="gtrip-step-head"><h2>Review & publish</h2><p>Check everything, then send your trip for review. It goes live after a quick approval.</p></div>
    <div class="gtrip-review-card">
      <div class="gtrip-review-head"><h3>${esc(tb.title || 'Untitled trip')}</h3><p>${esc(tb.city || 'Area not set')} · ${esc(duration)}</p><p>${startDate ? `${startDate} to ${endDate}` : 'Dates not set'} · ${esc(tb.meetingTime || 'Time not set')}</p><p>Meeting: ${esc(tb.meetingPoint || 'Location not set')}</p></div>
      ${tb.description ? `<p class="gtrip-review-desc">${esc(tb.description)}</p>` : ''}
      ${reviewList('Highlights', lines(tb.highlights))}
      ${reviewList('Itinerary', lines(tb.itinerary))}
      ${reviewList("What's included", lines(tb.includes))}
      ${reviewList('Destinations', (tb.experienceIds || []).map((id) => getExperience(id)).filter(Boolean).map((d) => d.title))}
      <div class="gtrip-review-block"><h4>Travel methods</h4>${chosen.length ? `<div class="gtrip-review-methods">${chosen.map((meta) => { const m = tb.methods[meta.mode]; return `<div class="gtrip-review-method"><strong>${esc(tripModeLabel(meta.mode))}</strong><span>${money(m.price)} ${meta.unit}${meta.mode === 'solo' ? '' : ` · ${m.minGuests}–${m.maxGuests} travelers`}</span></div>`; }).join('')}</div>` : '<p class="gtrip-review-warn">No travel method with a valid price yet — go back to step 3.</p>'}</div>
    </div>
  </div>`;
}

function myTripsHtml(guide) {
  const trips = guideTripsByGuide(guide.id);
  if (!trips.length) return '';
  return `<div class="gtrip-mytrips"><div class="guide-section-heading"><h2>Your trips</h2></div>${trips.map((trip) => {
    const destNames = (trip.experienceIds || []).map((id) => getExperience(id)).filter(Boolean).map((d) => d.title);
    return `<article class="gtrip-listing">
    <div class="gtrip-listing-cover"><span>${icon('image', 20)}</span></div>
    <div class="gtrip-listing-body">
      <div class="gtrip-listing-top">${statusChip(trip.status)}</div>
        <div class="gtrip-listing-meta">
          <h3>${esc(trip.title)}</h3>
          <small>${esc(trip.city)} · ${esc(trip.duration)}</small>
        </div>
      ${destNames.length ? `<div class="gtrip-listing-dests" style="font-size: 13px; color: #64748b; margin-top: 4px;">📍 ${esc(destNames.join(' · '))}</div>` : ''}
      <div class="gtrip-listing-methods">${(trip.methods || []).map((m) => `<span class="gtrip-tag">${esc(tripModeLabel(m.mode))} · ${money(m.price)}</span>`).join('')}</div>
    </div>
  </article>`;
  }).join('')}</div>`;
}

export function guideTripDetailView(tripId) {
  const guide = activeGuide();
  const trip = guideTripById(tripId);
  if (!trip || trip.guideId !== guide.id) {
    return mainLayout(`${header('Trip not found')}<div class="page-pad guide-dashboard"><div class="guide-empty"><h2>Trip not found</h2><p>This trip doesn't exist or you don't have access to it.</p><a href="#/guide" class="primary-button">Back to dashboard</a></div></div>`, 'Profile', { hideNavigation: true, className: 'guide-shell' });
  }
  
  const lines = (value) => Array.isArray(value) ? value : [];
  const startDate = trip.startDate || '';
  const endDate = trip.endDate || '';
  const days = startDate && endDate ? Math.ceil((new Date(endDate) - new Date(startDate)) / 86400000) + 1 : 1;
  const nights = Math.max(0, days - 1);
  const duration = nights > 0 ? `${days} day${days === 1 ? '' : 's'} · ${nights} night${nights === 1 ? '' : 's'}` : `${days} day${days === 1 ? '' : 's'}`;
  
  const reviewList = (title, items) => {
    if (!items || items.length === 0) return '';
    return `<div class="gtrip-review-block"><h4>${esc(title)}</h4><ul>${items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></div>`;
  };
  
  return mainLayout(`${header('Trip details')}<div class="page-pad guide-dashboard gtrip-page gtrip-detail-page">
    ${trip.adminNotes ? `<div class="gtrip-admin-notes-banner"><strong>${icon('alert', 16)} Admin feedback:</strong><p>${esc(trip.adminNotes)}</p></div>` : ''}
    <div class="gtrip-review-card">
      <div class="gtrip-review-head">
        <div class="gtrip-detail-title-row">
          <div>
            <h3>${esc(trip.title)}</h3>
            <p>${esc(trip.city)} · ${esc(duration)}</p>
            <p><small>${startDate} to ${endDate} · ${esc(trip.meetingTime || '')}</small></p>
            <p><small>Meeting: ${esc(trip.meetingPoint || '')}</small></p>
          </div>
          ${statusChip(trip.status)}
        </div>
      </div>
      ${trip.description ? `<p class="gtrip-review-desc">${esc(trip.description)}</p>` : ''}
      ${reviewList('Highlights', lines(trip.highlights))}
      ${reviewList('Itinerary', lines(trip.itinerary))}
      ${reviewList("What's included", lines(trip.includes))}
      ${reviewList('Destinations', (trip.experienceIds || []).map((id) => getExperience(id)).filter(Boolean).map((d) => d.title))}
      <div class="gtrip-review-block"><h4>Travel methods</h4>${(trip.methods || []).length ? `<div class="gtrip-review-methods">${(trip.methods || []).map((m) => `<div class="gtrip-review-method"><strong>${esc(tripModeLabel(m.mode))}</strong><span>${money(m.price)} per ${m.pricingUnit}${m.mode === 'solo' ? '' : ` · ${m.minGuests}–${m.maxGuests} travelers`}</span></div>`).join('')}</div>` : '<p class="gtrip-review-warn">No travel methods configured.</p>'}</div>
    </div>
    <div class="gtrip-detail-actions">
      <button type="button" class="outline-button" onclick="window.history.back()">Back</button>
      <button type="button" class="primary-button" data-action="gtrip-edit" data-id="${esc(trip.id)}">Edit trip</button>
    </div>
  </div>`, 'Profile', { hideNavigation: true, className: 'guide-shell' });
}

export function guideCreateTripView(fromEdit = false) {
  const guide = activeGuide();
  
  // Reset state hanya jika:
  // 1. Tidak ada state sama sekali, ATAU
  // 2. Bukan dari handler edit DAN bukan sedang navigasi antar step
  const hasExistingState = state.tripBuilder && state.tripBuilder.step;
  const isNavigatingSteps = hasExistingState && state.tripBuilder.step > 1 && state.tripBuilder.step <= 4;
  const shouldReset = !hasExistingState || (!state.tripBuilder.editingTripId && !isNavigatingSteps);
  
  if (shouldReset) {
    state.tripBuilder = {
      step: 1,
      editingTripId: null,
      title: '',
      city: '',
      startDate: '',
      endDate: '',
      meetingPoint: '',
      meetingLat: null,
      meetingLng: null,
      meetingTime: '',
      description: '',
      highlights: '',
      itinerary: '',
      includes: '',
      experienceIds: [],
      methods: {
        solo: { enabled: false, price: '', minGuests: 1, maxGuests: 1 },
        private: { enabled: false, price: '', minGuests: 1, maxGuests: 6 },
        shared: { enabled: false, price: '', minGuests: 2, maxGuests: 12 },
        group: { enabled: false, price: '', minGuests: 4, maxGuests: 20 }
      }
    };
  }
  
  const tb = state.tripBuilder;
  const editingTripId = tb.editingTripId || null;
  const step = Math.min(4, Math.max(1, Number(tb.step) || 1));
  const body = [stepBasics, stepStory, stepMethods, stepReview][step - 1](tb);
  const nav = `<div class="gtrip-nav">
    ${step > 1 ? `<button type="button" class="outline-button" data-action="gtrip-back">Back</button>` : ''}
    ${step < 4 ? `<button type="button" class="primary-button" data-action="gtrip-next">Continue</button>` : `<button type="submit" class="primary-button">${editingTripId ? 'Update trip' : 'Submit for review'}</button>`}
  </div>`;
  const wizard = guide.status !== 'verified'
    ? `<div class="guide-empty"><h2>Verification needed</h2><p>Your guide account is still pending review. You can create your own trips once you are verified.</p></div>`
    : `${progressHtml(step)}<form id="guide-trip-builder-form" class="gtrip-form">${body}${nav}</form>`;
  const title = editingTripId ? 'Edit trip' : 'Create a trip';
  return mainLayout(`${header(title)}<div class="page-pad guide-dashboard gtrip-page"><p class="guide-caption">${editingTripId ? 'Update your trip details and travel methods.' : 'Build your own open trip or package. Choose a travel method and set your own price — the way the Sumbawa open trip is set up.'}</p>${wizard}</div>`, 'Profile', { hideNavigation: true, className: 'guide-shell' });
}
