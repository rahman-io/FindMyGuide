import { icon } from './icons.js';
import { state } from '../app/store.js';
import { escapeHtml } from '../utils/html.js';
import { formatListedPrice } from '../features/experiences/booking-demo.js';
import { publicStartingPackagePrice } from '../features/guides/repository.js';
export function experienceCard(item, type = 'list') {
  const saved = state.wishlist.includes(item.id);
  const id = encodeURIComponent(item.id);
  const approvedPrices = item.packageOptions?.map((option) => publicStartingPackagePrice(item.id, option)).filter((amount) => amount !== null);
  const priceAvailable = Boolean(approvedPrices?.length);
  const informationOnly = Boolean(item.pricePending && !priceAvailable);
  const displayBadge = informationOnly && /pending/i.test(item.badge || '') ? '' : item.badge;
  const displayDuration = informationOnly ? 'Destination' : item.duration;
  const displayedPrice = priceAvailable ? formatListedPrice({ listedPrice: Math.min(...approvedPrices), listedPriceCurrency: 'IDR' }) : '-';
  return `<article class="experience-card ${type}">
    <a class="card-link" href="#/experience/${id}" aria-label="${escapeHtml(item.title)}"></a>
    <img src="${escapeHtml(item.cardImage || item.image)}" alt="" loading="lazy" />
    <div class="card-copy">
      <div class="eyebrow">${escapeHtml(item.city.toUpperCase())} · ${escapeHtml(displayDuration.toUpperCase())}</div>
      <h3>${escapeHtml(item.title)}</h3>
      ${type === 'list' ? `<div class="card-feature">${displayBadge ? `<span class="card-badge">${escapeHtml(displayBadge)}</span>` : ''} ${escapeHtml(item.label)}</div>` : `<p class="card-duration">${escapeHtml(displayDuration)}</p>`}
      ${item.recommendationReason ? `<div class="recommendation-reason">${escapeHtml(item.recommendationReason)}</div>` : ''}
      ${item.communityReason ? `<div class="community-reason">${escapeHtml(item.communityReason)}</div>` : ''}
      <div class="card-bottom"><span>${priceAvailable && item.demoBookingNotice ? '<span class="muted">Open trip · no reviews yet</span>' : informationOnly ? '<span class="muted">Information only</span>' : `<b>${escapeHtml(item.rating)} ★</b> <span class="muted">(${escapeHtml(item.reviews)})</span>`}</span><span class="price"><small>${priceAvailable ? item.demoBookingNotice ? 'Open trip offer' : 'From' : 'From'}</small> <b>${escapeHtml(displayedPrice)}</b></span></div>
    </div>
    <button class="heart-button ${saved ? 'saved' : ''}" data-action="heart" data-id="${escapeHtml(item.id)}" aria-label="${saved ? 'Remove from wishlist' : 'Save to wishlist'}">${icon('heart', 22)}</button>
  </article>`;
}
export function horizontalTile(item, route, kind = 'attraction') {
  return `<div class="tile place-tile"><a class="tile-link" href="#${escapeHtml(route)}"><img src="${escapeHtml(item.image)}" alt="" loading="lazy" /><strong>${escapeHtml(item.name)}</strong>${item.count ? `<small>${escapeHtml(item.count)}</small>` : ''}</a>${item.imageCredit ? `<a class="place-photo-credit" href="${escapeHtml(item.imageCredit.url)}" target="_blank" rel="noopener noreferrer">Photo: ${escapeHtml(item.imageCredit.label)}</a>` : ''}<button class="place-share-button" data-action="share-destination" data-kind="${escapeHtml(kind)}" data-id="${escapeHtml(item.name)}" aria-label="Share ${escapeHtml(item.name)}">${icon('send', 18)}</button></div>`;
}
