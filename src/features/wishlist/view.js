import { state } from '../../app/store.js';
import { experiences, images } from '../experiences/data.js';
import { icon } from '../../components/icons.js';
import { header } from '../../components/Header.js';
import { mainLayout } from '../../layouts/MainLayout.js';
import { experienceCard } from '../../components/cards.js';
export function wishlistView() {
  const cover = state.wishlist.map((id) => experiences.find((item) => item.id === id)).find(Boolean);
  return mainLayout(`
    ${header('Wishlist', `<button class="icon-button" data-action="new-list" aria-label="Create a list">${icon('plus')}</button>`)}
    <div class="page-pad wishlist-overview">
    <a href="#/wishlist/favourites" class="wishlist-album"><img src="${cover?.cardImage || cover?.image || images.wishlist}" alt="" /><div><span><strong>${state.listName}</strong><small>${state.wishlist.length} ${state.wishlist.length === 1 ? 'activity' : 'activities'}</small></span>${icon('chevron', 21)}</div></a></div>
  `, 'Profile');
}
export function favouritesView() {
  const saved = state.wishlist.map((id) => experiences.find((item) => item.id === id)).filter(Boolean);
  return mainLayout(`
    ${header(state.listName, `<button class="icon-button" data-action="list-menu">${icon('more')}</button>`)}
    <div class="page-pad favourites-page">
      <div class="align-right"><button class="soft-button" data-action="open-dates">${icon('calendar', 20)} Add dates</button></div>
      <div class="info-banner">Add dates to check the price and availability of your wishlisted activities.<button data-action="dismiss-banner" aria-label="Dismiss">${icon('close', 17)}</button></div>
      ${saved.length ? saved.map((item) => experienceCard(item)).join('') : `<div class="empty-state">${icon('heart', 45)}<h2>Your list is empty</h2><p>Save activities you love and find them here.</p><a class="primary-button" href="#/">Explore activities</a></div>`}
    </div>
  `, 'Profile');
}
