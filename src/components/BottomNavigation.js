import { icon } from './icons.js';
import { chatBadge } from '../features/inbox/repository.js';
export function bottomNavigation(active = 'Discover') {
  const items = [['Discover', '/', 'navHome'], ['Bookings', '/bookings', 'navBookings'], ['Vibes', '/social', 'navVibes'], ['Chat', '/chat', 'navChat'], ['Profile', '/profile', 'navProfile']];
  const current = active === 'Community' ? 'Vibes' : active;
  return `<nav class="bottom-nav" aria-label="Main navigation">
    <svg class="bottom-nav-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <defs><linearGradient id="bottom-nav-gradient" x1="0" y1="0" x2="1" y2="0.35"><stop stop-color="var(--brand-gradient-start)"/><stop offset="0.62" stop-color="var(--brand-gradient-middle)"/><stop offset="1" stop-color="var(--brand-gradient-end)"/></linearGradient></defs>
    </svg>
    <div class="bottom-nav-items">${items.map(([label, path, glyph]) =>
      `<a class="nav-item ${current === label ? 'active' : ''}" href="#${path}" aria-label="${label}" ${current === label ? 'aria-current="page"' : ''}><span class="nav-icon">${icon(glyph, 26)}${label === 'Chat' ? chatBadge() : ''}</span><span class="nav-label">${label}</span></a>`).join('')}</div>
  </nav>`;
}
