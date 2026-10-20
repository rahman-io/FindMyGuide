import { mainLayout } from '../../layouts/MainLayout.js';
import { header } from '../../components/Header.js';
import { escapeHtml } from '../../utils/html.js';
import { getExperience } from '../experiences/data.js';
import { activeGuide, financeBreakdown, guideDemoData, tripModeLabel, tripOfferingAvailability } from './repository.js';
import { formatCurrency } from '../../services/currency.js';

const money = (value) => formatCurrency(value, 'IDR');
const label = (offer) => getExperience(offer.experienceId)?.packageOptions?.find((option) => option.id === offer.packageId)?.name || 'Guided trip';
function offerCard(offer, admin = false) {
  const guide = guideDemoData().guides.find((item) => item.id === offer.guideId);
  const availability = tripOfferingAvailability(offer.id);
  const split = financeBreakdown(offer.price);
  return `<article class="guide-request-card trip-offer-card"><div class="guide-request-top"><span class="guide-status guide-status-${escapeHtml(offer.status)}">${escapeHtml(offer.status)}</span><small>${escapeHtml(offer.date)} · ${escapeHtml(offer.time)}</small></div><h3>${escapeHtml(label(offer))}</h3><p>${escapeHtml(tripModeLabel(offer.mode))} · ${offer.minGuests}–${offer.maxGuests} travelers · ${money(offer.price)} ${offer.priceUnit === 'group' ? 'per group' : 'per person'}</p><p class="guide-caption">${admin ? `Lead guide: ${escapeHtml(guide?.name || 'Guide')} · ` : ''}${offer.teamGuideIds.length} guide${offer.teamGuideIds.length === 1 ? '' : 's'} · ${offer.status === 'published' ? `${availability.seatsLeft} seats available` : 'Not public yet'} · Guide share ${money(split.guideShare)} ${offer.priceUnit === 'group' ? 'per group' : 'per person'}</p>${admin && offer.status === 'pending' ? `<div class="guide-card-actions"><button data-action="admin-approve-trip-offer" data-id="${escapeHtml(offer.id)}">Approve offer</button><button data-action="admin-reject-trip-offer" data-id="${escapeHtml(offer.id)}">Reject</button></div>` : ''}${!admin && offer.status === 'published' ? `<div class="guide-card-actions"><button data-action="guide-close-trip-offer" data-id="${escapeHtml(offer.id)}">Close this offering</button></div>` : ''}</article>`;
}

export function guideOfferingsView() {
  const data = guideDemoData();
  const guide = activeGuide();
  const packages = guide.experienceIds.flatMap((experienceId) => (getExperience(experienceId)?.packageOptions || []).map((option) => ({ experienceId, option })));
  const teammates = data.guides.filter((item) => item.id !== guide.id && item.status === 'verified' && item.experienceIds.some((id) => guide.experienceIds.includes(id)));
  const offers = data.offerings.filter((offer) => offer.guideId === guide.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return mainLayout(`${header('Your trip offerings')}<div class="page-pad guide-dashboard"><p class="guide-caption">Set a date, trip style, capacity and price. Each offering is reviewed by the demo admin before travelers can book it. A private or group price covers the whole party; solo and shared prices are per person.</p><form id="guide-trip-offer-form" class="guide-price-form trip-offer-form"><h2>Create a departure</h2><label>Package<select name="package" required>${packages.map(({ experienceId, option }) => `<option value="${escapeHtml(`${experienceId}:${option.id}`)}">${escapeHtml(option.name)}</option>`).join('')}</select></label><div class="trip-offer-fields"><label>Departure date<input name="date" type="date" min="${new Date().toISOString().slice(0, 10)}" required /></label><label>Start time<input name="time" type="time" value="05:00" required /></label><label>Trip style<select name="mode"><option value="solo">Solo with a guide</option><option value="private">Private trip</option><option value="shared">Shared departure</option><option value="group">Private group</option></select></label><label>Minimum travelers<input name="minGuests" type="number" min="1" max="60" value="1" required /></label><label>Maximum travelers<input name="maxGuests" type="number" min="1" max="60" value="1" required /></label><label>Traveler price (IDR)<input name="price" type="number" min="1000" step="1" required /></label></div><label>Meeting point (optional)<textarea name="meetingPoint" maxlength="300" placeholder="Where travelers meet you — leave blank to use the destination default"></textarea></label><label>What's included (optional, one per line)<textarea name="includes" maxlength="800" placeholder="One item per line"></textarea></label><label>Itinerary (optional, one step per line)<textarea name="itinerary" maxlength="1500" placeholder="One step per line, e.g. 05:00 Pickup"></textarea></label>${teammates.length ? `<fieldset><legend>Additional guides for larger groups (optional)</legend>${teammates.map((item) => `<label class="guide-check"><input type="checkbox" name="coGuideIds" value="${escapeHtml(item.id)}" /> ${escapeHtml(item.name)} · ${item.capacity} traveler capacity</label>`).join('')}</fieldset>` : ''}<p class="guide-caption">Your capacity: ${guide.capacity}. Add qualified guides when the group exceeds it. One guide cannot lead overlapping confirmed trips.</p><button class="primary-button" type="submit" ${guide.status !== 'verified' || !packages.length ? 'disabled' : ''}>Submit for approval</button></form><div class="guide-section-heading"><h2>Your departures</h2><a href="#/admin/offers">Demo review →</a></div>${offers.length ? offers.map((offer) => offerCard(offer)).join('') : '<div class="guide-empty">Create your first dated trip offering above.</div>'}</div>`, 'Profile', { hideNavigation: true, className: 'guide-shell' });
}

export function tripOfferingApprovalsView() {
  const offers = guideDemoData().offerings;
  const pending = offers.filter((offer) => offer.status === 'pending');
  const reviewed = offers.filter((offer) => offer.status !== 'pending').slice(0, 20);
  return mainLayout(`${header('Demo admin · trips')}<div class="page-pad guide-dashboard"><p class="guide-caption">Review each guide's departure, trip style, team capacity and exact price. Approval publishes the offering on Discover. This is a local demo review queue.</p><h2>Awaiting approval · ${pending.length}</h2>${pending.length ? pending.map((offer) => offerCard(offer, true)).join('') : '<div class="guide-empty">No departures are waiting.</div>'}<h2>Published and reviewed</h2>${reviewed.map((offer) => offerCard(offer, true)).join('')}<a class="guide-admin-link" href="#/guide/offers">← Back to your departures</a></div>`, 'Profile', { hideNavigation: true, className: 'guide-shell' });
}

export function guideTeamAssignmentsView() {
  const guide = activeGuide();
  const data = guideDemoData();
  const assignments = data.requests.filter((request) => request.guideId !== guide.id && request.teamGuideIds?.includes(guide.id) && ['accepted', 'completed'].includes(request.status));
  return mainLayout(`${header('Team assignments')}<div class="page-pad guide-dashboard"><p class="guide-caption">These departures are led by another guide, but include you in the approved team. The lead guide manages booking requests and traveler verification.</p>${assignments.length ? assignments.map((request) => {
    const item = getExperience(request.experienceId);
    const lead = data.guides.find((entry) => entry.id === request.guideId);
    return `<article class="guide-request-card"><div class="guide-request-top"><span class="guide-status guide-status-${escapeHtml(request.status)}">${escapeHtml(request.paymentStatus === 'paid' ? 'Confirmed' : 'Awaiting payment')}</span><small>${escapeHtml(request.date)} · ${escapeHtml(request.time)}</small></div><h3>${escapeHtml(item?.title || 'Guided trip')}</h3><p>${escapeHtml(tripModeLabel(request.tripMode))} · ${request.travelers} travelers · Led by ${escapeHtml(lead?.name || 'Lead guide')}</p>${request.tripMode === 'shared' && request.paymentStatus === 'paid' ? `<button class="outline-button full guardian-entry" data-action="booking-shared-chat" data-id="${escapeHtml(request.id)}">Open shared trip chat</button>` : ''}</article>`;
  }).join('') : '<div class="guide-empty">No team assignments yet. Your confirmed co-guide trips will appear here.</div>'}<a class="guide-admin-link" href="#/guide/offers">← Your departures</a></div>`, 'Profile', { hideNavigation: true, className: 'guide-shell' });
}
