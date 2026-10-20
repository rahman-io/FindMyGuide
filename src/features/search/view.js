import { activityFilters, attractions, destinations, getExperiencesByCity, getExperiencesMatchingQuery, getPopularExperiences } from '../experiences/data.js';
import { inBounds, mapActivities, mapDestinations } from './map-data.js';
import { experienceMapCoordinates } from '../experiences/firebase-documents.js';
import { experienceCard } from '../../components/cards.js';
import { icon } from '../../components/icons.js';
import { mainLayout } from '../../layouts/MainLayout.js';
import { header } from '../../components/Header.js';
import { escapeHtml } from '../../utils/html.js';
import { state } from '../../app/store.js';
import { approvedExperienceLabel, publicStartingPackagePrice } from '../guides/repository.js';

function matchesActivityFilter(item, filter) {
  if (!filter || filter === 'All') return true;
  const text = [item.title, item.label, item.category, ...(item.categories || []), ...(item.activityTypes || []), ...(item.includes || []), ...(item.packageIncludes || []), ...(item.packageOptions || []).flatMap((option) => option.includes || [])].filter(Boolean).join(' ').toLocaleLowerCase();
  if (filter === 'Guided tours') return Boolean((item.packageOptions || []).some((option) => publicStartingPackagePrice(item.id, option) !== null));
  if (filter === 'Entry tickets') return /ticket|entrance|entry|admission|skip the line|park fee/.test(text);
  if (filter === 'Outdoor activities') return /nature|beach|island|waterfall|volcano|marine|outdoor|surf|kayak|trek|hiking|open trip|snorkel|boat|wildlife|viewpoint/.test(text);
  if (filter === 'Food & drink') return /food|dinner|lunch|breakfast|drink|cooking|culinary|restaurant|meal|coffee|tasting/.test(text);
  return true;
}
export function searchView() {
  return mainLayout(`
    ${header('Search')}
    <div class="page-pad search-entry">
      <label class="search-field">${icon('search', 21)}<input id="place-search" type="search" placeholder="Find places and things to do" autocomplete="off" value="${escapeHtml(state.search)}" autofocus /></label>
      <div id="search-suggestions">
        <h2>Top destinations</h2>
        ${destinations.map((item) => `<a class="suggestion" href="#/results?city=${encodeURIComponent(item.name)}"><img src="${escapeHtml(item.image)}" alt="" /><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.count)}</small></span>${icon('chevron', 20)}</a>`).join('')}
        <h2>Attractions</h2>
        ${attractions.map((item) => `<a class="suggestion" href="${item.experienceId ? `#/experience/${encodeURIComponent(item.experienceId)}` : item.name === 'Mount Rinjani' ? '#/experience/arena' : `#/results?city=${encodeURIComponent(item.city)}`}" data-search-text="${escapeHtml(`${item.name} ${item.city}`)}"><img src="${escapeHtml(item.image)}" alt="" /><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.city)}</small></span>${icon('chevron', 20)}</a>`).join('')}
        <h2>Popular experiences</h2>
        ${getPopularExperiences().map((item) => `<a class="suggestion" href="#/experience/${encodeURIComponent(item.id)}"><img src="${escapeHtml(item.image)}" alt="" /><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.city)}</small></span>${icon('chevron', 20)}</a>`).join('')}
      </div>
      <div id="search-live-results" class="result-list" hidden></div>
    </div>
  `, 'Discover');
}
export function resultsView(city = 'Lombok', category = '', query = '') {
  const searchQuery = query.trim();
  const destinationLabel = city.toLocaleLowerCase() === 'all' ? 'All destinations' : city;
  const baseItems = searchQuery
    ? getExperiencesMatchingQuery(searchQuery).filter((item) => !category || item.category === category || item.categories?.includes(category))
    : getExperiencesByCity(city, category);
  const resultItems = baseItems.filter((item) => matchesActivityFilter(item, state.filter));
  return mainLayout(`
    <div class="results-top"><div class="results-search"><a href="#/search" aria-label="Change search">${icon('arrow', 22)} <span>${escapeHtml(searchQuery ? `Search · ${searchQuery}` : category ? `${category} · ${destinationLabel}` : destinationLabel)}</span></a><button data-action="open-dates" class="text-button">${icon('calendar', 20)} Add dates</button></div>
      <div class="chip-row"><button class="chip round" data-action="filter-sheet">${icon('sliders', 20)}</button>${activityFilters.map((filter) => `<button class="chip ${state.filter === filter ? 'selected' : ''}" data-action="set-filter" data-value="${filter}">${filter}</button>`).join('')}</div>
    </div>
    <div class="result-count">${resultItems.length} ${resultItems.length === 1 ? 'result' : 'results'} ${icon('info', 16)}</div>
    <div class="result-list">${resultItems.length ? resultItems.map((item) => experienceCard(item)).join('') : `<div class="empty-state"><h2>${searchQuery ? `No results for “${escapeHtml(searchQuery)}”` : `No ${escapeHtml(category || 'activities')} in ${escapeHtml(destinationLabel)} yet`}</h2><p>Try another destination while we add more experiences.</p><a class="outline-button" href="#/search">Explore destinations</a></div>`}</div>
    ${Object.keys(mapDestinations).some((name) => name.toLocaleLowerCase() === city.toLocaleLowerCase()) && resultItems.length ? `<button class="floating-map" data-action="show-map">${icon('map', 21)} Open map</button>` : ''}
  `, 'Discover', { className: 'results-page' });
}
export function mapView(city = 'Lombok') {
  const destination = Object.keys(mapDestinations).find((name) => name.toLowerCase() === city.toLowerCase());
  if (!destination) return mainLayout(`${header('Map')}<div class="empty-state"><h2>Map unavailable for this destination</h2><p>Choose a supported destination to explore its map.</p><a class="outline-button" href="#/search">Choose destination</a></div>`, 'Discover');
  const config = mapDestinations[destination];
  const mapItems = getExperiencesByCity(destination).filter((item) => mapActivities[item.id] || experienceMapCoordinates(item));
  const points = mapItems.map((item) => {
    const curated = mapActivities[item.id];
    const coordinates = curated?.coordinates || experienceMapCoordinates(item);
    const area = curated?.area || config.areas.find((entry) => inBounds(coordinates, entry.bounds))?.id;
    const category = curated?.category || (item.packageOptions?.length ? 'tour' : 'ticket');
    return { id: item.id, title: item.title, city: item.city, price: item.price, listedPrice: item.listedPrice, listedPriceCurrency: item.listedPriceCurrency, displayPrice: item.packageOptions?.length ? approvedExperienceLabel(item) : null, coordinates, area, category };
  });
  return mainLayout(`
    <div class="map-controls">
      <div class="map-toolbar"><button class="round-white" data-action="back" aria-label="Close map">${icon('close', 22)}</button><a href="#/search" class="map-search">${icon('search', 19)}<span><strong>${escapeHtml(destination)}</strong><small>Change destination</small></span></a></div>
      <div class="map-filter-fields">
        <label>Area<select data-map-area aria-label="Filter map by area"><option value="all">All of ${escapeHtml(destination)}</option>${config.areas.map((area) => `<option value="${area.id}">${escapeHtml(area.name)}</option>`).join('')}<option value="view">Current map view</option></select></label>
        <label>Activities<select data-map-category aria-label="Filter activity type"><option value="all">All activities</option><option value="tour">Guided tours</option><option value="ticket">Entry tickets</option></select></label>
      </div>
      <div class="chip-row map-place-chips" aria-label="Places to display">${[['all', 'All'], ['activity', 'Activities'], ['restaurant', 'Restaurants'], ['hotel', 'Hotels']].map(([value, label]) => `<button class="chip ${value === 'all' ? 'selected' : ''}" data-action="map-place-filter" data-value="${value}" aria-pressed="${value === 'all'}">${label}</button>`).join('')}</div>
    </div>
    <div class="map-canvas">
      <div class="map-surface" data-map-surface data-map-config="${escapeHtml(JSON.stringify({ ...config, points }))}" role="region" aria-label="Interactive map of ${escapeHtml(destination)}"></div>
      <div class="map-tile-status" data-map-tile-status role="status">Loading map…</div>
    </div>
    <div class="map-location-bar"><button data-action="map-locate">My location</button><button data-action="map-track-location" aria-pressed="false">Live location</button></div>
    <div class="map-results">
      <p class="map-distance-note" data-map-distance-note role="status">Use My location or Live location to see distances.</p>
      <h2 data-map-activities-heading>Activities · ${mapItems.length}</h2>
      ${mapItems.map((item) => `<div class="map-result-item" data-map-result="${item.id}"><small class="map-result-distance" data-map-result-distance></small>${experienceCard(item)}</div>`).join('')}
      <p class="map-empty" data-map-empty ${mapItems.length ? 'hidden' : ''}>No catalog activities match this map area and filter.</p>
      <section class="map-nearby-list" data-map-nearby-list aria-label="Nearby restaurants and hotels"></section>
      <a href="#/results?city=${encodeURIComponent(destination)}" class="outline-button">View activity list</a>
    </div>
  `, 'Discover', { className: 'map-page' });
}
