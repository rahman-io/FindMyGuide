import { getExperience, getPackageOption } from '../experiences/data.js';
import { state } from '../../app/store.js';
import { icon } from '../../components/icons.js';
import { mainLayout } from '../../layouts/MainLayout.js';
import { header } from '../../components/Header.js';
import { formatDate, escapeHtml } from '../../utils/html.js';
import { calculateDemoQuote, formatDemoPrice, getDemoBooking } from '../experiences/booking-demo.js';
import { publicTripOfferings, tripModeLabel, tripOfferingQuote } from '../guides/repository.js';
import { tripOfferingPicker } from '../guides/view.js';
import { formatCurrency } from '../../services/currency.js';
const money = (amount) => formatCurrency(amount, 'IDR');
const selectedTripOffer = (item, option) => option ? publicTripOfferings(item.id, option.id, state.date, state.adults + state.children).find((offer) => offer.id === state.selectedOfferId) : null;
export function bookingView(id) {
  const item = getExperience(id);
  const selectedPackage = getPackageOption(item, state.selectedPackageExperienceId === item.id ? state.selectedPackageOptionId : '');
  const selectedOffer = selectedTripOffer(item, selectedPackage);
  const packageTotal = selectedOffer ? money(tripOfferingQuote(selectedOffer, state.adults + state.children)) : 'Choose a departure';
  const timeOptions = selectedPackage ? selectedOffer ? [selectedOffer.time] : [] : getDemoBooking(item)?.timeOptions || ['9:00 AM'];
  const effectiveTime = timeOptions.includes(state.selectedTime) ? state.selectedTime : timeOptions[0];
  const dateText = state.date ? formatDate(state.date) : 'Select a date';
  const quote = calculateDemoQuote(item, state);
  const total = quote.total.toFixed(2);
  return mainLayout(`
    ${header(item.title, `<button class="icon-button" data-action="heart" data-id="${item.id}">${icon('heart')}</button><button class="icon-button" data-action="share">${icon('share')}</button>`, 'truncated')}
    <div class="page-pad booking-page">
      <div class="booking-selector"><h1>Select participants, date, and language</h1>
        <button data-action="participants">${icon('user', 22)} Adult x${state.adults}${state.children ? `, Child x${state.children}` : ''}${icon('down', 20)}</button>
        <button data-action="open-dates">${icon('calendar', 22)} ${state.date ? new Date(state.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Select date'}${icon('down', 20)}</button>
        <button data-action="language">${icon('user', 22)} English${icon('down', 20)}</button>
      </div>
      ${selectedPackage ? tripOfferingPicker(item, selectedPackage, state.date, state.adults + state.children, selectedOffer?.id) : ''}
      <h2>${selectedPackage ? 'Package request' : '1 option available'}</h2>
      <article class="option-card"><h3>${selectedPackage?.name || item.title}</h3>${selectedPackage ? `<div class="option-fact">${icon('tickets', 21)} Approved ${escapeHtml(selectedOffer ? tripModeLabel(selectedOffer.mode) : 'departure')} price: ${selectedOffer ? money(selectedOffer.price) : 'choose above'} ${selectedOffer?.priceUnit === 'group' ? 'per group' : 'per person'}</div>` : ''}<div class="option-fact">${icon('clock', 21)} Duration: ${selectedPackage?.duration || item.duration}</div>${selectedPackage ? `<div class="option-fact">${icon('user', 21)} Your qualified guide is assigned after confirmation</div>` : `<div class="option-fact">${icon('user', 21)} Instructor: English</div><div class="option-fact">${icon('calendar', 21)} Cancel for free until Oct 14</div>`}<button class="text-link option-fact" data-action="meeting">${icon('pin', 21)} Meeting point</button>
        <hr /><h3>Starting time</h3><p>${dateText}</p>${timeOptions.map((time) => `<button class="time-button ${effectiveTime === time ? 'active' : ''}" data-action="select-time" data-value="${escapeHtml(time)}">${escapeHtml(time)}</button>`).join('')}
        ${selectedPackage ? '' : `<p class="urgency">${icon('info', 17)} Only 21 hours left to book</p>`}<hr /><strong class="option-price">${selectedPackage ? packageTotal : `$${total}`}</strong><small>${selectedPackage ? `${state.adults + state.children} travelers · ${escapeHtml(selectedOffer ? tripModeLabel(selectedOffer.mode) : 'Choose a departure above')} · No payment yet` : `${state.adults} Adult × ${formatDemoPrice(quote.adultPrice)}${state.children ? `<br/>${state.children} Child × ${formatDemoPrice(quote.childPrice)}` : ''}<br/>Demo price · All taxes and fees included`}</small><a class="primary-button full" href="#/checkout/${item.id}">${selectedPackage ? 'Request this package' : 'Continue'}</a>
      </article>
      <details><summary>Meeting point</summary><p>Your exact meeting point will be confirmed after booking.</p></details>
      <details><summary>Important information</summary><p>Bring your booking confirmation and arrive before the selected time.</p></details>
    </div>
  `, 'Discover', { className: 'booking-shell' });
}
function progress(step) {
  return `<div class="checkout-progress"><div class="${step === 1 ? 'active' : 'done'}">${step === 1 ? '1' : icon('check', 15)}<small>Contact</small></div><span></span><div class="${step === 2 ? 'active' : ''}">2<small>Payment</small></div></div>`;
}
export function checkoutView(id) {
  const item = getExperience(id);
  const selectedPackage = getPackageOption(item, state.selectedPackageExperienceId === item.id ? state.selectedPackageOptionId : '');
  const selectedOffer = selectedTripOffer(item, selectedPackage);
  const times = selectedPackage ? selectedOffer ? [selectedOffer.time] : [] : getDemoBooking(item)?.timeOptions || ['9:00 AM'];
  const effectiveTime = times.includes(state.selectedTime) ? state.selectedTime : times[0];
  const packageTotal = selectedOffer ? tripOfferingQuote(selectedOffer, state.adults + state.children) : null;
  const idr = (amount) => formatCurrency(amount, 'IDR');
  const step = state.checkoutStep;
  const total = calculateDemoQuote(item, state).total.toFixed(2);
  const summary = `<div class="checkout-summary"><strong>${selectedPackage?.name || item.title}</strong><img src="${item.image}" alt="" /><small>${state.adults} adult${state.children ? ` · ${state.children} child` : ''} · ${formatDate(state.date)} · ${effectiveTime || 'Choose departure'} · ${selectedPackage ? `${escapeHtml(selectedOffer ? tripModeLabel(selectedOffer.mode) : 'Choose a departure')} · ${packageTotal === null ? 'No price selected' : `${idr(packageTotal)} total`}` : 'Instructor: English · Demo price'}</small></div>`;
  const contact = `
    <h1>Enter your personal details</h1>
    <label class="form-label"><span>Full name</span><input id="checkout-name" autocomplete="name" placeholder="Full name" value="${escapeHtml(state.guestName)}" required /></label>
    <label class="form-label"><span>Email address</span><input id="checkout-email" autocomplete="email" type="email" value="${escapeHtml(state.email)}" required /></label>
    <label class="form-label"><span>Country</span><select id="checkout-country"><option>Poland (+48)</option><option>Indonesia (+62)</option><option>United States (+1)</option><option>United Kingdom (+44)</option></select></label>
    <label class="form-label"><span>Mobile phone number</span><input id="checkout-phone" type="tel" autocomplete="tel" placeholder="Mobile phone number" required /></label>
    ${selectedPackage ? `<label class="form-label"><span>Notes for your guide (optional)</span><textarea id="checkout-notes" maxlength="1000" rows="4" placeholder="Tell the guide about your pace, interests, or special requests">${escapeHtml(state.bookingNotes || '')}</textarea>` : ''}
    <p class="muted">We'll only contact you with essential updates or changes to your booking</p>
    ${summary}
    <div class="checkout-total"><strong>${selectedPackage ? packageTotal === null ? 'Awaiting approved price' : idr(packageTotal) : `$${total}`}</strong><small>${selectedPackage ? 'Approved package estimate · no payment yet' : 'Total'}</small></div><button class="primary-button full" data-action="go-payment">${selectedPackage ? 'Review request' : 'Go to payment'}</button>`;
  const packageReview = `<h1>Review your booking request</h1><p class="guide-caption">This request uses the approved departure price. The assigned guide may accept or decline. No payment is recorded until acceptance and, for shared trips, the minimum group size is met.</p>${summary}${packageTotal !== null ? `<div class="checkout-total"><strong>${idr(packageTotal)}</strong><small>Total for ${state.adults + state.children} traveler${state.adults + state.children === 1 ? '' : 's'}</small></div>` : ''}<button class="primary-button full" data-action="send-guide-request" data-id="${escapeHtml(item.id)}" data-total="${packageTotal ?? ''}" ${selectedOffer && state.date && packageTotal !== null ? '' : 'disabled'}>Send booking request</button>${!selectedOffer ? '<p class="guide-caption">Choose an approved departure with enough seats to continue.</p>' : ''}`;
  const payment = `
    <h2>Choose your currency</h2><p class="muted">Pay in your usual currency to avoid possible exchange rate fees from your bank.</p>
    <div class="radio-group"><label><input type="radio" name="currency" checked /> ${formatDemoPrice(Number(total))}</label><label><input type="radio" name="currency" /> ${formatCurrency(Number(total), 'USD', 'PLN')} (demo)</label></div>
    <h2>Payment method</h2><div class="radio-group">
      <label><input type="radio" name="payment" value="card" ${state.paymentMethod === 'card' ? 'checked' : ''} /> Debit or credit card ${icon('credit', 22)}</label>
      <label><input type="radio" name="payment" value="paypal" ${state.paymentMethod === 'paypal' ? 'checked' : ''} /> PayPal</label>
      <label><input type="radio" name="payment" value="googlepay" ${state.paymentMethod === 'googlepay' ? 'checked' : ''} /> Google Pay</label>
    </div>
    <label class="save-card"><input type="checkbox" checked /> Save card for future bookings ${icon('credit', 19)}</label>
    <h2>Review details</h2><div class="review-details"><strong>${escapeHtml(state.guestName)}</strong><span>${escapeHtml(state.email)}</span><button data-action="edit-contact">Edit</button></div>${summary}
    <button class="promo-row" data-action="promo">${icon('tickets', 21)} Enter promo or gift code ${icon('chevron', 19)}</button>
    <div class="payment-total"><strong>Total</strong><strong>${formatDemoPrice(Number(total))}</strong></div><small class="tax-note">All taxes and fees included</small>
    <p class="muted terms">By continuing, you agree to FindMyGuide's general terms and conditions and your activity provider's terms and conditions.</p>
    <button class="primary-button full" data-action="card-details">${state.paymentMethod === 'card' ? 'Enter card details' : 'Continue'}</button>`;
  return mainLayout(`
    ${header(selectedPackage ? 'Booking request' : 'Checkout')}<div class="page-pad checkout-page">${selectedPackage ? '' : progress(step)}
    ${selectedPackage ? '' : '<div class="hold-banner">⏱ We\'ll hold your spot for 19:53 minutes</div>'}${step === 1 ? contact : selectedPackage ? packageReview : payment}</div>
  `, 'Discover', { className: 'checkout-shell' });
}
export function cardDetailsView(id) {
  const item = getExperience(id);
  const total = calculateDemoQuote(item, state).total.toFixed(2);
  return mainLayout(`
    ${header('Card details')}<div class="page-pad card-details-page">
      <h1>Enter card details</h1>
      <div class="accepted-cards">▰ VISA &nbsp; ◉ Mastercard &nbsp; American Express</div>
      <label class="form-label">Card number<input inputmode="numeric" autocomplete="cc-number" placeholder="Card number" maxlength="23" /></label>
      <div class="card-fields"><label class="form-label">Expiry date<input inputmode="numeric" autocomplete="cc-exp" placeholder="MM / YY" maxlength="7" /></label><label class="form-label">Security code<input inputmode="numeric" autocomplete="cc-csc" placeholder="CVC" maxlength="4" /></label></div>
      <label class="form-label">Name on card<input autocomplete="cc-name" placeholder="Name on card" /></label>
      <p class="muted">Your payment details are entered only for this preview and are not saved or charged.</p>
      <div class="payment-total"><strong>Total</strong><strong>${formatDemoPrice(Number(total))}</strong></div><small class="tax-note">All taxes and fees included</small>
      <button class="primary-button full" data-action="payment-unavailable">Pay ${formatDemoPrice(Number(total))}</button>
    </div>
  `, 'Discover', { className: 'checkout-shell' });
}
