import { getExperience, getExperienceGallery, experiences, getPackageOption } from '../experiences/data.js';
import { state } from '../../app/store.js';
import { icon } from '../../components/icons.js';
import { mainLayout } from '../../layouts/MainLayout.js';
import { header } from '../../components/Header.js';
import { experienceCard } from '../../components/cards.js';
import { escapeHtml } from '../../utils/html.js';
import { calculateDemoQuote, formatDemoPrice, formatListedPrice, getDemoBooking } from '../experiences/booking-demo.js';
import { tripOfferingPicker } from '../guides/view.js';
import { offeringById, publicStartingPackagePrice, publicTripOfferings, tripModeLabel, tripOfferingQuote } from '../guides/repository.js';
import { toExperienceDocument } from '../experiences/firebase-documents.js';
import { getDemoReviews } from '../experiences/demo-engagement.js';
import { socialImage } from '../social/media.js';
import { activeSocialUser, socialPostsForExperience, socialUser, visibleSocialPosts } from '../social/repository.js';
import { publicTravelGroup } from '../messaging/repository.js';
import { socialBookingSignals } from '../social/intelligence.js';
import { getBookingLikelihood, getPriceAvailabilityAlerts, getSmartBundle } from '../booking-intelligence/repository.js';
import { getSmartReviewIntelligence } from '../travel-intelligence/repository.js';
function neutralizeGuideClaims(text) {
  return String(text || '').replace(/Hear stories from a local guide/gi, 'Discover local stories').replace(/Enjoy the company of a local guide/gi, 'Enjoy the surrounding scenery').replace(/\s+with a local guide(?: based near [^.]+)?/gi, '').replace(/\s+with a guide/gi, '').replace(/\s+from a local guide/gi, '').replace(/\s{2,}/g, ' ').replace(/\s+([.,])/g, '$1').trim();
}
export function experienceView(id, opts = {}) {
  const item = getExperience(id);
  const isInquiryOnly = Boolean(item.isInquiryOnly);
  const availabilityReady = Boolean(!isInquiryOnly && state.availabilityChecked && state.date);
  const selectedPackage = availabilityReady ? getPackageOption(item, state.selectedPackageExperienceId === item.id ? state.selectedPackageOptionId : '') : null;
  const saved = state.wishlist.includes(item.id);
  const sameCity = experiences.filter((other) => other.id !== item.id && other.city === item.city);
  const similar = (sameCity.length ? sameCity : experiences.filter((other) => other.id !== item.id)).slice(0, 3);
  const photos = getExperienceGallery(item);
  const availableOffers = availabilityReady && selectedPackage ? publicTripOfferings(item.id, selectedPackage.id, state.date, state.adults + state.children) : [];
  const selectedOffer = availableOffers.find((offer) => offer.id === state.selectedOfferId);
  const booking = { ...getDemoBooking(item), timeOptions: selectedPackage ? selectedOffer ? [selectedOffer.time] : [] : getDemoBooking(item)?.timeOptions || ['9:00 AM'] };
  const effectiveTime = booking.timeOptions.includes(state.selectedTime) ? state.selectedTime : booking.timeOptions[0];
  const document = toExperienceDocument(item, booking);
  const cancellation = document.cancellation || { title: 'Policy pending confirmation', text: 'Check trip terms with the guide before sending a request.' };
  const reviews = getDemoReviews(item);
  const communityPosts = socialPostsForExperience(item.id).slice(0, 2);
  const communitySignal = socialBookingSignals(visibleSocialPosts()).find((signal) => signal.experienceId === item.id);
  const dateText = state.date ? new Date(state.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Select date';
  const quote = calculateDemoQuote(item, state);
  const bookingLikelihood = getBookingLikelihood(item, state);
  const smartBundle = getSmartBundle(item, experiences, state);
  const bookingAlerts = getPriceAvailabilityAlerts(item, booking);
  const reviewIntelligence = getSmartReviewIntelligence(item, reviews.featured);
  const publicGroup = publicTravelGroup(item.id);
  const joined = Boolean(publicGroup?.participantIds.includes(activeSocialUser().id));
  const publicGroupMembers = (publicGroup?.participantIds || []).map((userId) => socialUser(userId)).filter(Boolean);
  const startingPackageEntries = (item.packageOptions || []).map((option) => ({ option, amount: publicStartingPackagePrice(item.id, option) })).filter((entry) => entry.amount !== null).sort((a, b) => a.amount - b.amount);
  const startingPackageEntry = startingPackageEntries[0];
  const startingPriceAvailable = Boolean(startingPackageEntry);
  const guideAvailable = startingPriceAvailable;
  const informationOnly = Boolean(item.pricePending && !guideAvailable);
  const displayedLocation = informationOnly ? String(item.location || '').replace(/\s*·\s*exact departure point pending/gi, '') : item.location;
  const detailDuration = item.duration && item.duration !== 'Destination' ? item.duration : '—';
  const reviewCount = Number(String(item.reviews || '').replace(/,/g, ''));
  const detailReviews = reviewCount > 0 ? Intl.NumberFormat('en-US').format(reviewCount) : '0';
  const presentedDocument = { ...document, summary: neutralizeGuideClaims(document.summary), content: { ...document.content, fullDescription: neutralizeGuideClaims(document.content.fullDescription), highlights: document.content.highlights.map((text) => neutralizeGuideClaims(text)), includes: [] } };
  const meetingPoint = document.meetingPoint;
  const weatherPoint = item.id === 'sumbawa-open-trip-3d2n' ? { latitude: -8.4941, longitude: 117.4343 } : meetingPoint;
  const meetingMap = meetingPoint?.embedUrl ? `<div class="meeting-map"><iframe title="Suggested meeting area map" src="${escapeHtml(meetingPoint.embedUrl)}" loading="lazy" referrerpolicy="no-referrer"></iframe></div>` : `<div class="meeting-map meeting-map-fallback"><span>${icon('pin', 24)}</span></div>`;
  const meetingPointSection = `<details class="detail-section detail-accordion" data-detail-section="meeting" open><summary><h2>Meeting point</h2>${icon('down')}</summary>${meetingMap}<div class="meeting-point-copy"><strong>${escapeHtml(meetingPoint.name)}</strong><small>${escapeHtml(meetingPoint.address)}</small><p>${escapeHtml(meetingPoint.description)}</p><div class="meeting-point-actions"><button type="button" class="outline-button" data-action="copy-meeting-point" data-value="${escapeHtml(meetingPoint.address)}">Copy address</button><a class="primary-button" href="${escapeHtml(meetingPoint.googleMapUrl)}" target="_blank" rel="noopener noreferrer">Open in Google Maps</a></div></div></details>`;
  const startingPrice = startingPackageEntry ? formatListedPrice({ listedPrice: startingPackageEntry.amount, listedPriceCurrency: startingPackageEntry.option.currency || 'IDR' }) : '';
  const noGuideText = '-';
  const selectedPackagePrice = availabilityReady ? selectedPackage ? selectedOffer ? formatListedPrice({ listedPrice: selectedOffer.price, listedPriceCurrency: selectedPackage.currency }) : startingPriceAvailable ? 'Choose a departure' : noGuideText : noGuideText : startingPriceAvailable ? startingPrice : noGuideText;
  const selectedPackageTotal = selectedPackage ? selectedOffer ? formatListedPrice({ listedPrice: tripOfferingQuote(selectedOffer, state.adults + state.children), listedPriceCurrency: selectedPackage.currency }) : 'Choose a departure' : '';
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const photoCredits = [...(item.imageCredits || []), ...(item.imageCredit ? [item.imageCredit] : [])].filter((credit, index, credits) => credits.findIndex((entry) => entry.url === credit.url) === index);
  const photoCreditsSection = photoCredits.length ? `<p class="media-attribution">${photoCredits.map((credit) => `<a href="${escapeHtml(credit.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(credit.label)}</a>`).join(' · ')}</p>` : '';
  const bookingNotice = guideAvailable && item.demoBookingNotice && !item.packageOptions?.length ? `<section class="open-trip-status"><span>${icon('info', 20)}</span><div><strong>Open trip departure · operator confirmation pending</strong><p>${escapeHtml(item.demoBookingNotice)}</p></div></section>` : '';
  const itinerarySection = item.packageItinerary?.length ? `<details class="detail-section detail-accordion open-trip-itinerary" data-detail-section="itinerary"><summary><h2>Open trip itinerary</h2>${icon('down')}</summary><p class="open-trip-caption">Schedule transcribed from the supplied trip post. Confirm changes and local conditions with the operator.</p>${item.packageItinerary.map((day) => `<article class="open-trip-day"><div class="open-trip-day-heading"><strong>${escapeHtml(day.day)}</strong><h3>${escapeHtml(day.title)}</h3></div><ol>${day.items.map((entry) => `<li><time>${escapeHtml(entry.time)}</time><span>${escapeHtml(entry.text)}</span></li>`).join('')}</ol></article>`).join('')}${item.itineraryNote ? `<p class="open-trip-note">${escapeHtml(item.itineraryNote)}</p>` : ''}</details>` : '';
  const exclusionsSection = item.packageExcludes?.length ? `<details class="detail-section detail-accordion" data-detail-section="excludes"><summary><h2>Not included</h2>${icon('down')}</summary><ul class="bullet-list">${item.packageExcludes.map((entry) => `<li>${escapeHtml(entry)}</li>`).join('')}</ul></details>` : '';
  const inquiryNotice = isInquiryOnly ? `<section class="open-trip-status"><span>${icon('info', 20)}</span><div><strong>${item.packageItinerary ? 'Open trip preview — booking not open' : 'Destination preview — booking not open'}</strong><p>${escapeHtml(informationOnly ? 'Explore this destination for now. Booking appears when an approved guide departure is available.' : item.availabilityNote || 'Price and availability have not been confirmed by an operator yet.')}</p></div></section>` : '';
  const packageAvailability = availabilityReady && item.packageOptions?.length ? `<section class="package-builder" id="package-options"><div class="package-builder-heading"><div><small>BOOKABLE PACKAGE</small><h2>Choose your package</h2></div><span>${escapeHtml(item.packageType || 'Flexible options')}</span></div><p>Choose a package for ${escapeHtml(dateText)} and ${state.adults + state.children} traveler${state.adults + state.children === 1 ? '' : 's'}. Trip styles and final prices appear below.</p><div class="package-option-list">${item.packageOptions.map((option) => `<button class="package-option ${selectedPackage?.id === option.id ? 'selected' : ''}" data-action="select-package-option" data-id="${escapeHtml(item.id)}" data-value="${escapeHtml(option.id)}" aria-pressed="${selectedPackage?.id === option.id}"><span><strong>${escapeHtml(option.name)}</strong><small>${escapeHtml(option.duration)}</small></span><b>${selectedPackage?.id === option.id ? 'Selected' : 'Select package'}</b></button>`).join('')}</div>${selectedPackage ? `<div class="package-includes"><strong>Included in this package</strong><span>${selectedPackage.includes.map((entry) => escapeHtml(entry)).join(' · ')}</span></div>` : ''}</section>${tripOfferingPicker(item, selectedPackage, state.date, state.adults + state.children, selectedOffer?.id, { priceFilter: state.tripPriceFilter, showPriceFilters: true })}` : '';
  const packageResult = availabilityReady && selectedPackage && selectedOffer ? `<article class="option-card"><h3>${escapeHtml(selectedPackage.name)}</h3><div class="option-fact">${icon('tickets', 21)} ${escapeHtml(tripModeLabel(selectedOffer.mode))} · ${escapeHtml(selectedPackagePrice)}</div><div class="option-fact">${icon('clock', 21)} Duration: ${escapeHtml(selectedPackage.duration)}</div><div class="option-fact">${icon('calendar', 21)} ${dateText}</div><div class="option-fact">${icon('clock', 21)} Starts ${escapeHtml(selectedOffer.time)}</div><hr /><strong class="option-price">${escapeHtml(selectedPackageTotal)}</strong><small>${state.adults + state.children} traveler${state.adults + state.children === 1 ? '' : 's'} · No payment yet</small><a class="primary-button full" href="#/checkout/${encodeURIComponent(item.id)}">Request this departure</a></article>` : '';
  const standardResult = availabilityReady && !item.packageOptions?.length ? `<article class="option-card"><h3>${escapeHtml(item.title)}</h3><div class="option-fact">${icon('clock', 21)} Duration: ${escapeHtml(item.duration)}</div><div class="option-fact">${icon('calendar', 21)} ${dateText}</div><hr /><h3>Starting time</h3>${booking.timeOptions.map((time) => `<button class="time-button ${effectiveTime === time ? 'active' : ''}" data-action="select-time" data-value="${escapeHtml(time)}">${escapeHtml(time)}</button>`).join('')}<hr /><strong class="option-price">${formatDemoPrice(quote.total)}</strong><small>${state.adults} adult × ${formatDemoPrice(quote.adultPrice)}${state.children ? `<br/>${state.children} child × ${formatDemoPrice(quote.childPrice)}` : ''}<br/>Demo price · All taxes and fees included</small><a class="primary-button full" href="#/checkout/${encodeURIComponent(item.id)}">Continue</a></article>` : '';
  const marketplaceBlock = guideAvailable && !isInquiryOnly ? `<section class="detail-availability" id="detail-availability"><div class="package-builder-heading"><div><small>GUIDE MARKETPLACE</small><h2>Choose a guide departure</h2></div></div><div class="booking-selector"><h2>Select participants and date</h2>
        <button data-action="participants">${icon('user', 22)} Adult x${state.adults}${state.children ? `, Child x${state.children}` : ''}${icon('down', 20)}</button>
        <button data-action="open-dates">${icon('calendar', 22)} ${dateText}${icon('down', 20)}</button>
        <div class="demo-price-preview"><span>${availabilityReady && selectedPackage && selectedOffer ? 'Estimated total' : startingPriceAvailable ? 'Starting price' : 'From'} <small>${availabilityReady && selectedPackage && selectedOffer ? 'Approved departure · no payment yet' : startingPriceAvailable ? 'From an approved guide departure' : 'Booking is not available yet'}</small></span><strong>${availabilityReady && selectedPackage && selectedOffer ? escapeHtml(selectedPackageTotal) : startingPriceAvailable ? escapeHtml(startingPrice) : noGuideText}</strong><small>${availabilityReady && selectedPackage && selectedOffer ? `${state.adults + state.children} traveler${state.adults + state.children === 1 ? '' : 's'} · ${escapeHtml(tripModeLabel(selectedOffer.mode))}` : startingPriceAvailable ? 'per person' : ''}</small></div>
        <button class="primary-button full" data-action="check-availability">${item.demoBookingNotice ? 'Choose date & book' : 'Check availability'}</button>
      </div>${availabilityReady ? `${packageAvailability}<div class="detail-availability-results" id="detail-availability-results"><h2>${selectedPackage ? selectedOffer ? 'Selected departure' : 'Available trip styles' : '1 option available'}</h2>${selectedPackage ? packageResult : standardResult}</div>` : `<div class="marketplace-intro"><h3>How the guide marketplace works</h3><ul><li>${icon('calendar', 20)} Pick your party size and date, then check availability</li><li>${icon('star', 20)} Compare approved guide departures by price, rating and languages</li><li>${icon('user', 20)} Your guide is introduced after booking confirmation</li></ul></div>`}</section>` : '';
  if (opts.marketplace) return mainLayout(`${header('Guide marketplace')}<div class="page-pad">${marketplaceBlock}</div>`, 'Discover', {});
  const overlayHeader = `<header class="detail-sticky-header" data-detail-sticky-header>
      <button class="icon-button" data-action="back" aria-label="Back">${icon('arrow')}</button>
      <strong title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</strong>
      <button class="icon-button ${saved ? 'saved' : ''}" data-action="heart" data-id="${escapeHtml(item.id)}" aria-label="Wishlist">${icon('heart')}</button>
      <button class="icon-button" data-action="share" aria-label="Share">${icon('share')}</button>
    </header>`;
  const detail = `
    <div class="detail-top">
      <div class="detail-gallery"><div class="detail-gallery-track" data-gallery-track aria-label="Activity photos" tabindex="0">${photos.map((source, index) => `<img class="detail-main-image" src="${escapeHtml(source)}" alt="${escapeHtml(item.title)} — photo ${index + 1} of ${photos.length}" data-action="gallery" data-id="${escapeHtml(item.id)}" data-index="${index}" ${index ? 'loading="lazy"' : ''} draggable="false" />`).join('')}</div>
        <div class="detail-top-actions"><button class="round-white" data-action="back" aria-label="Back">${icon('arrow')}</button><span><button class="round-white ${saved ? 'saved' : ''}" data-action="heart" data-id="${escapeHtml(item.id)}" aria-label="Wishlist">${icon('heart')}</button><button class="round-white" data-action="share" aria-label="Share">${icon('share')}</button></span></div>
        <div class="detail-heading">
          <h1>${escapeHtml(item.title)}</h1>
          <p class="detail-location">${icon('pin', 16)}<span>${escapeHtml(displayedLocation || item.city)}</span></p>
        </div>
        ${Number(item.rating) ? `<button class="detail-image-rating" data-action="reviews" aria-label="Rating ${escapeHtml(item.rating)}, view reviews">${escapeHtml(item.rating)} <span>★</span></button>` : ''}
      </div>
      ${photos.length > 1 ? `<div class="gallery-count" role="group" aria-label="Choose photo">${photos.map((_, index) => `<button class="gallery-dot ${index === 0 ? 'active' : ''}" data-gallery-dot data-action="gallery-select" data-index="${index}" aria-label="Photo ${index + 1} of ${photos.length}" aria-current="${index === 0}"></button>`).join('')}</div>` : ''}
    </div>
    <div class="detail-body">
      <div class="detail-stat-card" aria-label="Experience overview">
        <div class="detail-stat-item"><span class="detail-stat-icon">${icon('clock', 20)}</span><span><strong>${escapeHtml(detailDuration)}</strong><small>Duration</small></span></div>
        <div class="detail-stat-item" data-current-weather data-weather-lat="${weatherPoint.latitude}" data-weather-lon="${weatherPoint.longitude}"><span class="detail-stat-icon">${icon('thermometer', 20)}</span><span><strong data-weather-value>—</strong><small>Now nearby</small></span></div>
        <button class="detail-stat-item" data-action="reviews" ${reviewCount > 0 ? '' : 'disabled'} aria-label="${reviewCount > 0 ? `${reviewCount} reviews` : '0 reviews'}"><span class="detail-stat-icon">${icon('star', 20)}</span><span><strong>${escapeHtml(detailReviews)}</strong><small>Reviews</small></span></button>
      </div>
      <a class="detail-weather-credit" href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Weather: Open-Meteo</a>
      <p class="detail-intro">${escapeHtml(presentedDocument.content.fullDescription)}</p>
      ${photoCreditsSection}
      ${inquiryNotice}
      <section class="detail-public-group" aria-label="Public traveler group"><span class="detail-public-group-label">PUBLIC GROUP</span><h2>Talk with other travelers</h2><p>Ask questions and share tips about this place before booking.</p><div class="detail-public-group-members">${publicGroupMembers.length ? `<div class="detail-traveler-stack">${publicGroupMembers.slice(0, 5).map((traveler) => `<span class="detail-traveler-avatar" style="--avatar-color:${escapeHtml(traveler.color || '#566d65')}">${escapeHtml(traveler.initials || '?')}</span>`).join('')}</div><strong>${publicGroupMembers.length} traveler${publicGroupMembers.length === 1 ? '' : 's'} joined</strong>` : '<strong>Be the first to join</strong>'}</div>${joined ? `<a class="detail-join-button" href="#/inbox/chat/${encodeURIComponent(publicGroup.id)}">${icon('community', 21)} Open public group <span aria-hidden="true">→</span></a>` : `<button class="detail-join-button" data-action="join-travelers" data-id="${escapeHtml(item.id)}">${icon('community', 21)} Join public group <span aria-hidden="true">→</span></button>`}</section>
      ${communitySignal ? `<a class="detail-social-proof" href="#/social/explore?topic=${encodeURIComponent(communitySignal.topics[0] || item.city.toLowerCase())}">${icon('sparkle', 17)} Shared by ${communitySignal.posts} traveler${communitySignal.posts === 1 ? '' : 's'} on Vibes · See why it is trending</a>` : ''}
      <a class="detail-vibes-button" href="#/social/create?experience=${encodeURIComponent(item.id)}"><span class="detail-vibes-icon">${icon('community', 21)}</span><span>Recommend this on Vibes</span><span class="detail-vibes-arrow" aria-hidden="true">→</span></a>
      ${item.openingHours ? `<div class="detail-facts"><div>${icon('clock', 27)}<span><strong>Opening hours</strong><small>${escapeHtml(item.openingHours)}</small></span></div></div>` : ''}
      <details class="detail-section detail-accordion" data-detail-section="highlights" open><summary><h2>Highlights</h2>${icon('down')}</summary><ul class="bullet-list">${presentedDocument.content.highlights.map((text) => `<li>${escapeHtml(text)}</li>`).join('')}</ul></details>
      <details class="detail-section detail-accordion" data-detail-section="description"><summary><h2>Full description</h2>${icon('down')}</summary><p>${escapeHtml(presentedDocument.content.fullDescription)}</p></details>
      ${itinerarySection}
      ${exclusionsSection}
      ${(isInquiryOnly || item.demoBookingNotice) && item.sourceNote ? `<details class="detail-section detail-accordion" data-detail-section="source-notes"><summary><h2>Source and planning notes</h2>${icon('down')}</summary><p>${escapeHtml(item.sourceNote)}</p></details>` : ''}
      ${guideAvailable && !isInquiryOnly ? `<a class="detail-marketplace-entry" href="#/experience/${encodeURIComponent(item.id)}/guides"><span class="detail-marketplace-icon">${icon('tickets', 21)}</span><span><strong>Guides & availability</strong><small>Compare guide departures, dates and prices</small></span><span class="detail-marketplace-arrow" aria-hidden="true">→</span></a>` : ''}
      ${communityPosts.length ? `<section class="detail-community-section"><div class="detail-community-heading"><h2>Travelers shared this</h2><a href="#/social/create?experience=${encodeURIComponent(item.id)}">Share yours</a></div><div class="detail-community-posts">${communityPosts.map((post) => { const author = socialUser(post.authorId); return `<a class="detail-community-post" href="#/social/post/${escapeHtml(post.id)}"><img src="${escapeHtml(socialImage(post))}" alt="" loading="lazy" /><span><strong>@${escapeHtml(author?.username || 'traveler')}</strong><small>${post.likedBy.length} likes · ${post.comments.length} comments</small><p>${escapeHtml(post.caption || 'Shared a travel moment')}</p></span></a>`; }).join('')}</div></section>` : ''}
      <section class="detail-section"><h2>${sameCity.length ? `Discover more for ${escapeHtml(item.city)}` : 'Discover more experiences'}</h2><div class="related-list">${similar.map((other) => experienceCard(other)).join('')}</div></section>
    </div>`;
  const footer = '';
  return mainLayout(detail, 'Discover', { className: 'detail-page', overlayHeader, footer });
}

export function guideOfferView(experienceId, offerId) {
  const item = getExperience(experienceId);
  const offer = offeringById(offerId);
  if (!item || !offer || offer.experienceId !== item.id) return mainLayout(`${header('Guide departure')}<div class="page-pad"><div class="guide-empty"><h2>Departure unavailable</h2><p>This departure is no longer available. Choose another from the marketplace.</p><a class="primary-button" href="#/experience/${encodeURIComponent(experienceId)}/guides">Back to marketplace</a></div></div>`, 'Discover', {});
  const option = getPackageOption(item, offer.packageId);
  const document = toExperienceDocument(item, getDemoBooking(item));
  const meetingPoint = document.meetingPoint;
  const travelers = state.adults + state.children;
  const currency = option?.currency || 'IDR';
  const unitPrice = formatListedPrice({ listedPrice: offer.price, listedPriceCurrency: currency });
  const total = formatListedPrice({ listedPrice: tripOfferingQuote(offer, travelers) || offer.price, listedPriceCurrency: currency });
  const dateText = offer.date ? new Date(offer.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date to be confirmed';
  const meetingMap = meetingPoint?.embedUrl ? `<div class="meeting-map"><iframe title="Suggested meeting area map" src="${escapeHtml(meetingPoint.embedUrl)}" loading="lazy" referrerpolicy="no-referrer"></iframe></div>` : `<div class="meeting-map meeting-map-fallback"><span>${icon('pin', 24)}</span></div>`;
  const meetingPointSection = offer.meetingPoint ? `<details class="detail-section detail-accordion" data-detail-section="meeting" open><summary><h2>Meeting point</h2>${icon('down')}</summary><div class="meeting-point-copy"><p>${escapeHtml(offer.meetingPoint)}</p></div></details>` : meetingPoint ? `<details class="detail-section detail-accordion" data-detail-section="meeting" open><summary><h2>Meeting point</h2>${icon('down')}</summary>${meetingMap}<div class="meeting-point-copy"><strong>${escapeHtml(meetingPoint.name)}</strong><small>${escapeHtml(meetingPoint.address)}</small><p>${escapeHtml(meetingPoint.description)}</p><div class="meeting-point-actions"><button type="button" class="outline-button" data-action="copy-meeting-point" data-value="${escapeHtml(meetingPoint.address)}">Copy address</button><a class="primary-button" href="${escapeHtml(meetingPoint.googleMapUrl)}" target="_blank" rel="noopener noreferrer">Open in Google Maps</a></div></div></details>` : '';
  const includesList = offer.includes?.length ? offer.includes : document.content.includes;
  const includesSection = includesList?.length ? `<details class="detail-section detail-accordion" data-detail-section="includes"><summary><h2>Includes</h2>${icon('down')}</summary><ul class="check-list">${includesList.map((entry) => `<li>${icon('check', 19)} ${escapeHtml(entry)}</li>`).join('')}</ul></details>` : '';
  const itinerarySection = offer.itinerary?.length ? `<details class="detail-section detail-accordion open-trip-itinerary" data-detail-section="itinerary"><summary><h2>Itinerary</h2>${icon('down')}</summary><ul class="bullet-list">${offer.itinerary.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul></details>` : item.packageItinerary?.length ? `<details class="detail-section detail-accordion open-trip-itinerary" data-detail-section="itinerary"><summary><h2>Itinerary</h2>${icon('down')}</summary>${item.packageItinerary.map((day) => `<article class="open-trip-day"><div class="open-trip-day-heading"><strong>${escapeHtml(day.day)}</strong><h3>${escapeHtml(day.title)}</h3></div><ol>${day.items.map((entry) => `<li><time>${escapeHtml(entry.time)}</time><span>${escapeHtml(entry.text)}</span></li>`).join('')}</ol></article>`).join('')}</details>` : '';
  const importantSection = `<details class="detail-section detail-accordion" data-detail-section="important" open><summary><h2>Important information</h2>${icon('down')}</summary><h3>What to bring</h3><ul class="bullet-list">${document.content.whatToBring.map((entry) => `<li>${escapeHtml(entry)}</li>`).join('')}</ul><h3>Not allowed</h3><ul class="bullet-list">${document.content.notAllowed.map((entry) => `<li>${escapeHtml(entry)}</li>`).join('')}</ul><h3>Know before you go</h3><p>${escapeHtml(document.content.knowBeforeYouGo)}</p></details>`;
  const summaryCard = `<article class="option-card"><h3>${escapeHtml(option?.name || item.title)}</h3><div class="option-fact">${icon('tickets', 21)} ${escapeHtml(tripModeLabel(offer.mode))} · ${escapeHtml(unitPrice)} ${offer.priceUnit === 'group' ? 'per group' : 'per person'}</div><div class="option-fact">${icon('calendar', 21)} ${escapeHtml(dateText)}</div><div class="option-fact">${icon('clock', 21)} Starts ${escapeHtml(offer.time)} · ${escapeHtml(option?.duration || item.duration)}</div><div class="option-fact">${icon('user', 21)} Your guide is introduced after booking confirmation</div></article>`;
  const ctaCard = `<article class="option-card"><strong class="option-price">${escapeHtml(total)}</strong><small>${travelers} traveler${travelers === 1 ? '' : 's'} · ${escapeHtml(tripModeLabel(offer.mode))} · No payment yet</small><a class="primary-button full" href="#/checkout/${encodeURIComponent(item.id)}">Request this departure</a></article>`;
  return mainLayout(`${header('Guide departure')}<div class="page-pad guide-offer-page"><div class="package-builder-heading"><div><small>GUIDE DEPARTURE</small><h2>Trip details</h2></div></div>${summaryCard}${meetingPointSection}${includesSection}${itinerarySection}${importantSection}${ctaCard}</div>`, 'Discover', {});
}
