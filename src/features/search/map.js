import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { escapeHtml } from '../../utils/html.js';
import { distanceMeters, filterMapActivities, formatDistance, inBounds, locationErrorMessage, validCoordinates } from './map-data.js';
import { fetchMapPlaces } from './map-service.js';
import { formatListedPrice } from '../experiences/booking-demo.js';

const nearbyCache = new Map();

export function createDiscoverMap(root) {
  const surface = root.querySelector('[data-map-surface]');
  const config = JSON.parse(surface.dataset.mapConfig);
  const map = L.map(surface, { zoomControl: false, scrollWheelZoom: false }).setView(config.center, config.zoom);
  const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  });
  L.control.zoom({ position: 'topright' }).addTo(map);
  L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);
  const activityLayer = L.layerGroup().addTo(map);
  const placesLayer = L.layerGroup().addTo(map);
  const cache = nearbyCache;
  let area = 'all', mode = 'all', category = 'all', placeLimit = 12;
  let places = [], position = null, accuracy = null, userMarker = null, accuracyCircle = null;
  let watchId = null, watchGeneration = 0, locating = false, disposed = false;
  let nearbyRequest = null, requestId = 0, moveTimer, tileTimer, resizeFrame;
  let nearbyState = 'loading', locationNotice = '', tileNotice = 'Loading map…', tileFailed = false;
  let programmaticMove = false, popupMove = false, loadedKey = '';
  const query = (selector) => root.querySelector(selector);
  const boundsArray = () => { const b = map.getBounds(); return [b.getSouth(), b.getWest(), b.getNorth(), b.getEast()]; };
  const distance = (point) => formatDistance(position, point);
  const selectedArea = () => config.areas.find((entry) => entry.id === area);
  const popup = (item) => `<div class="map-popup"><strong>${escapeHtml(item.title || item.name)}</strong><small>${item.type ? (item.type === 'hotel' ? 'Hotel' : 'Restaurant') : `${escapeHtml(item.city)} · From ${escapeHtml(item.displayPrice || formatListedPrice(item))}`}</small><small>${distance(item.coordinates) || 'Use My location to see distance'}${position ? ' · straight-line estimate' : ''}</small>${item.type ? '' : `<a href="#/experience/${encodeURIComponent(item.id)}">View activity</a>`}</div>`;
  const markerIcon = (type, text) => {
    if (type === 'activity') {
      return L.divIcon({ className: 'map-pin map-pin-activity', html: `<span class="map-pin-badge">${escapeHtml(text)}</span>`, iconSize: [0, 0], iconAnchor: [0, 0], popupAnchor: [0, -38] });
    }
    const size = type === 'cluster' ? [30, 30] : [24, 24];
    return L.divIcon({ className: `map-pin map-pin-${type}`, html: `<span>${escapeHtml(text)}</span>`, iconSize: size, iconAnchor: [size[0] / 2, size[1]], popupAnchor: [0, -size[1]] });
  };

  function visibleActivities() {
    return filterMapActivities(config.points, { area, mode, category, bounds: area === 'view' ? boundsArray() : undefined });
  }

  function visiblePlaces() {
    if (mode === 'activity') return [];
    const bounds = boundsArray();
    return places.filter((place) => (mode === 'all' || place.type === mode) && inBounds(place.coordinates, bounds)
      && (!selectedArea() || inBounds(place.coordinates, selectedArea().bounds)))
      .sort((a, b) => (distanceMeters(position || [map.getCenter().lat, map.getCenter().lng], a.coordinates) ?? 0) - (distanceMeters(position || [map.getCenter().lat, map.getCenter().lng], b.coordinates) ?? 0));
  }

  function drawMarkers() {
    activityLayer.clearLayers();
    placesLayer.clearLayers();
    const groups = new Map();
    visibleActivities().forEach((point) => {
      const key = point.coordinates.join(',');
      groups.set(key, [...(groups.get(key) || []), point]);
    });
    groups.forEach((points) => {
      const marker = L.marker(points[0].coordinates, { icon: markerIcon('activity', points[0].displayPrice || formatListedPrice(points[0])), zIndexOffset: 1000, title: points.map((p) => p.title).join(' / '), alt: 'Activity' }).addTo(activityLayer);
      marker.mapItems = points;
      marker.bindPopup(points.map(popup).join(''), { maxHeight: 180, maxWidth: 260 });
    });
    const clusters = new Map();
    visiblePlaces().forEach((place) => {
      const pixel = map.project(place.coordinates);
      const key = map.getZoom() >= 17 ? place.id : `${Math.floor(pixel.x / 40)},${Math.floor(pixel.y / 40)}`;
      clusters.set(key, [...(clusters.get(key) || []), place]);
    });
    clusters.forEach((items) => {
      const grouped = items.length > 1;
      const center = L.latLngBounds(items.map((item) => item.coordinates)).getCenter();
      const marker = L.marker(center, { icon: markerIcon(grouped ? 'cluster' : items[0].type, grouped ? String(items.length) : items[0].type === 'hotel' ? 'H' : 'R'), title: grouped ? `${items.length} nearby places — zoom in` : items[0].name, alt: grouped ? 'Nearby places' : items[0].type }).addTo(placesLayer);
      marker.mapItems = items;
      if (grouped) marker.on('click', () => map.fitBounds(items.map((item) => item.coordinates), { padding: [40, 40], maxZoom: Math.min(17, map.getZoom() + 2) }));
      else marker.bindPopup(popup(items[0]), { maxWidth: 260 });
    });
  }

  function refresh() {
    if (disposed) return;
    const select = query('[data-map-area]');
    if (select) select.value = area;
    const activitySelect = query('[data-map-category]');
    if (activitySelect) { activitySelect.value = category; activitySelect.disabled = mode === 'restaurant' || mode === 'hotel'; }
    root.querySelectorAll('[data-action="map-place-filter"]').forEach((button) => {
      button.classList.toggle('selected', button.dataset.value === mode);
      button.setAttribute('aria-pressed', String(button.dataset.value === mode));
    });
    const track = query('[data-action="map-track-location"]');
    track?.setAttribute('aria-pressed', String(watchId !== null));
    if (track) track.textContent = watchId !== null ? 'Stop live location' : 'Live location';
    const locate = query('[data-action="map-locate"]');
    if (locate) { locate.disabled = locating; locate.textContent = locating ? 'Locating…' : 'My location'; }
    const note = query('[data-map-distance-note]');
    if (note) note.textContent = locationNotice || (position ? `Distances are straight-line estimates from your ${watchId !== null ? 'live' : 'last recorded'} location (accuracy ±${Math.round(accuracy || 0)} m).` : 'Use My location or Live location to see distances.');
    const tileStatus = query('[data-map-tile-status]');
    if (tileStatus) {
      tileStatus.hidden = !tileNotice;
      tileStatus.innerHTML = `${escapeHtml(tileNotice)}${tileFailed ? ' <button data-action="map-retry-tiles">Retry map</button>' : ''}`;
    }
    const visible = visibleActivities();
    root.querySelectorAll('[data-map-result]').forEach((element) => {
      const point = config.points.find((p) => p.id === element.dataset.mapResult);
      element.hidden = !visible.some((p) => p.id === point.id);
      element.querySelector('[data-map-result-distance]').textContent = distance(point.coordinates);
    });
    const activitiesHeading = query('[data-map-activities-heading]');
    if (activitiesHeading) { activitiesHeading.hidden = mode === 'restaurant' || mode === 'hotel'; activitiesHeading.textContent = `Activities · ${visible.length}`; }
    const empty = query('[data-map-empty]');
    if (empty) empty.hidden = visible.length > 0 || mode === 'restaurant' || mode === 'hotel';
    const list = query('[data-map-nearby-list]');
    const shown = visiblePlaces();
    if (list) {
      list.hidden = mode === 'activity';
      const message = nearbyState === 'loading' ? 'Loading restaurants and hotels in this map area…'
        : nearbyState === 'fallback' ? 'The places service is slow. Trying another source…'
        : nearbyState === 'error' ? 'Nearby places could not be loaded. Please try again.'
        : nearbyState === 'zoom' ? 'Zoom in to see restaurants and hotels.'
        : shown.length ? `${shown.length} places in this map area · OpenStreetMap` : 'No matching restaurants or hotels were returned in this map area.';
      list.innerHTML = `<div class="map-nearby-heading"><h2>Nearby places</h2>${nearbyState === 'error' ? '<button data-action="map-retry-places" class="text-button">Retry</button>' : ''}</div><p role="status">${message}</p>${shown.slice(0, placeLimit).map((place) => `<button class="map-nearby-item" data-action="map-place-open" data-value="${escapeHtml(place.id)}"><span class="map-place-symbol map-place-symbol-${place.type}" aria-hidden="true">${place.type === 'hotel' ? 'H' : 'R'}</span><span><strong>${escapeHtml(place.name)}</strong><small>${place.type === 'hotel' ? 'Hotel' : 'Restaurant'}${position ? ` · ${distance(place.coordinates)}` : ''}</small></span></button>`).join('')}${shown.length > placeLimit ? '<button class="outline-button" data-action="map-more-places">Show more places</button>' : ''}${shown.length >= 60 ? '<p>Results are limited to 60 per category. Zoom in to explore more places.</p>' : ''}`;
    }
  }

  function draw() { drawMarkers(); refresh(); }

  function moveToArea() {
    programmaticMove = true;
    const selected = selectedArea();
    if (selected) map.fitBounds([[selected.bounds[0], selected.bounds[1]], [selected.bounds[2], selected.bounds[3]]], { padding: [32, 32], maxZoom: 15, animate: false });
    else if (config.points.length) map.fitBounds(config.points.map((point) => point.coordinates), { padding: [48, 48], maxZoom: 14, animate: false });
    else map.setView(config.center, config.zoom, { animate: false });
    programmaticMove = false;
  }

  function requestBounds() {
    const bounds = boundsArray();
    const selected = selectedArea();
    return selected ? [Math.max(bounds[0], selected.bounds[0]), Math.max(bounds[1], selected.bounds[1]), Math.min(bounds[2], selected.bounds[2]), Math.min(bounds[3], selected.bounds[3])] : bounds;
  }

  async function loadPlaces(force = false) {
    clearTimeout(moveTimer);
    nearbyRequest?.abort();
    const generation = ++requestId;
    if (disposed) return;
    if (map.getZoom() < 12) { places = []; nearbyState = 'zoom'; draw(); return; }
    const bounds = requestBounds().map((value) => Number(value.toFixed(5)));
    const key = bounds.join(',');
    const cached = cache.get(key);
    if (!force && cached && Date.now() - cached.at < 300000) { places = cached.places; loadedKey = key; nearbyState = 'ready'; draw(); return; }
    if (key !== loadedKey) places = [];
    nearbyState = 'loading';
    draw();
    const controller = new AbortController();
    nearbyRequest = controller;
    const statement = `[out:json][timeout:8];nwr["amenity"="restaurant"]["name"](${key});out center 60;nwr["tourism"="hotel"]["name"](${key});out center 60;`;
    try {
      const result = await fetchMapPlaces(statement, {
        signal: controller.signal,
        endpoints: import.meta.env.VITE_MAP_PLACES_ENDPOINT ? [import.meta.env.VITE_MAP_PLACES_ENDPOINT] : undefined,
        onFallback: () => { if (!disposed && generation === requestId) { nearbyState = 'fallback'; refresh(); } },
      });
      if (disposed || generation !== requestId) return;
      places = result;
      loadedKey = key;
      cache.set(key, { at: Date.now(), places });
      if (cache.size > 12) cache.delete(cache.keys().next().value);
      nearbyState = 'ready';
    } catch {
      if (disposed || generation !== requestId) return;
      nearbyState = 'error';
    } finally {
      if (!disposed && generation === requestId) { nearbyRequest = null; draw(); }
    }
  }

  function schedulePlaces() {
    if (disposed) return;
    // Invalidate responses immediately; do not let an old request populate a new area.
    ++requestId;
    nearbyRequest?.abort();
    clearTimeout(moveTimer);
    nearbyState = 'loading';
    draw();
    moveTimer = setTimeout(() => loadPlaces(), 700);
  }

  function updateLocation(result, center) {
    if (disposed) return;
    const next = [result.coords.latitude, result.coords.longitude];
    if (!validCoordinates(next)) { locationNotice = locationErrorMessage({ code: 2 }); refresh(); return; }
    position = next;
    accuracy = Number.isFinite(result.coords.accuracy) ? result.coords.accuracy : 0;
    locationNotice = '';
    if (!userMarker) {
      accuracyCircle = L.circle(position, { radius: accuracy, color: '#1684e8', weight: 1, fillOpacity: 0.08, interactive: false }).addTo(map);
      userMarker = L.circleMarker(position, { radius: 8, color: '#fff', weight: 3, fillColor: '#156ee8', fillOpacity: 1 }).addTo(map).bindPopup('Your location');
    } else { userMarker.setLatLng(position); accuracyCircle.setLatLng(position).setRadius(accuracy); }
    // Keep open popups and the user's map position while live distances change.
    [activityLayer, placesLayer].forEach((layer) => layer.eachLayer((marker) => { if (marker.getPopup()) marker.setPopupContent(marker.mapItems.map(popup).join('')); }));
    if (center) { area = 'view'; map.setView(position, 15, { animate: false }); schedulePlaces(); }
    refresh();
  }

  function stopTracking() {
    ++watchGeneration;
    if (watchId !== null) navigator.geolocation?.clearWatch(watchId);
    watchId = null;
  }

  function locationAvailable() {
    if (navigator.geolocation && window.isSecureContext) return true;
    locationNotice = 'Location is unavailable. Open the app over HTTPS on a device with location services.';
    refresh();
    return false;
  }

  function action(name, value) {
    if (disposed) return;
    if (name === 'map-area-filter') { area = value; if (area !== 'view') moveToArea(); loadPlaces(); }
    if (name === 'map-category-filter') { category = value; draw(); }
    if (name === 'map-place-filter') { mode = value; placeLimit = 12; draw(); }
    if (name === 'map-more-places') { placeLimit += 12; refresh(); }
    if (name === 'map-retry-places') loadPlaces(true);
    if (name === 'map-retry-tiles') tiles.redraw();
    if (name === 'map-place-open') {
      const place = places.find((entry) => entry.id === value);
      if (!place) return;
      programmaticMove = true;
      map.setView(place.coordinates, Math.max(17, map.getZoom()), { animate: false });
      programmaticMove = false;
      draw();
      const marker = placesLayer.getLayers().find((entry) => entry.mapItems[0].id === value);
      if (marker) { surface.scrollIntoView({ block: 'center', behavior: 'smooth' }); marker.openPopup(); }
    }
    if (name === 'map-locate' && !locating && locationAvailable()) {
      locating = true; locationNotice = 'Finding your location…'; refresh();
      navigator.geolocation.getCurrentPosition((result) => { locating = false; updateLocation(result, true); }, (error) => {
        if (disposed) return;
        locating = false; locationNotice = locationErrorMessage(error); refresh();
      }, { enableHighAccuracy: true, maximumAge: 15000, timeout: 12000 });
    }
    if (name === 'map-track-location' && locationAvailable()) {
      if (watchId !== null) { stopTracking(); locationNotice = ''; }
      else {
        locationNotice = 'Finding your live location…';
        const generation = ++watchGeneration;
        watchId = navigator.geolocation.watchPosition((result) => {
          if (!disposed && generation === watchGeneration) updateLocation(result, false);
        }, (error) => {
          if (disposed || generation !== watchGeneration) return;
          stopTracking(); locationNotice = locationErrorMessage(error); refresh();
        }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 });
      }
      refresh();
    }
  }

  const onChange = (event) => {
    if (event.target.matches('[data-map-area]')) action('map-area-filter', event.target.value);
    if (event.target.matches('[data-map-category]')) action('map-category-filter', event.target.value);
  };
  root.addEventListener('change', onChange);
  map.on('dragstart', () => { area = 'view'; refresh(); });
  map.on('autopanstart', () => { popupMove = true; });
  map.on('moveend', () => { if (popupMove) { popupMove = false; return; } if (!programmaticMove) schedulePlaces(); });
  tiles.on('loading', () => {
    tileFailed = false; tileNotice = 'Loading map…'; clearTimeout(tileTimer);
    tileTimer = setTimeout(() => { tileFailed = true; tileNotice = 'Map tiles are taking too long to load.'; refresh(); }, 15000);
    refresh();
  });
  tiles.on('tileerror', () => { tileFailed = true; tileNotice = 'Some map tiles could not load.'; refresh(); });
  tiles.on('load', () => { clearTimeout(tileTimer); tileNotice = tileFailed ? 'Some map tiles could not load.' : ''; refresh(); });
  moveToArea();
  tiles.addTo(map);
  const observer = new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => { if (!disposed && surface.isConnected) map.invalidateSize({ pan: false, debounceMoveend: true }); });
  });
  observer.observe(surface);
  loadPlaces();

  return {
    surface,
    key: location.hash,
    action,
    refresh,
    destroy() {
      disposed = true; ++requestId;
      stopTracking(); nearbyRequest?.abort();
      clearTimeout(moveTimer); clearTimeout(tileTimer); cancelAnimationFrame(resizeFrame);
      observer.disconnect(); root.removeEventListener('change', onChange); map.remove();
    },
  };
}
