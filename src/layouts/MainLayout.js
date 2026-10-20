import { bottomNavigation } from '../components/BottomNavigation.js';
export function mainLayout(content, active = 'Discover', options = {}) {
  const shellClass = options.hideNavigation ? options.className === 'inbox-shell' ? 'chat-app-shell' : 'no-navigation-shell' : '';
  return `<div class="app-shell ${shellClass}"><main class="main-content ${options.className || ''}">${content}</main>${options.overlayHeader || ''}${options.footer || ''}${options.hideNavigation ? '' : bottomNavigation(active)}</div>`;
}
