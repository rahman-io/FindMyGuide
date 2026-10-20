export function route() {
  const raw = location.hash.replace(/^#\/?/, '') || '';
  const [path, query] = raw.split('?');
  return { path: '/' + path.replace(/^\//, ''), params: new URLSearchParams(query || '') };
}

const navigationEntries = [];
let navigationReady = false;
let pendingBack = false;
let pendingScrollRestore = null;

function currentHash() {
  return location.hash || '#/';
}

export function initializeNavigation() {
  if (navigationReady) return;
  navigationEntries.push({ hash: currentHash(), scrollY: 0 });
  navigationReady = true;
}

export function rememberNavigationScroll(scrollY = window.scrollY) {
  initializeNavigation();
  const current = navigationEntries[navigationEntries.length - 1];
  if (current) current.scrollY = Math.max(0, Number(scrollY) || 0);
}

export function syncNavigation() {
  initializeNavigation();
  const hash = currentHash();
  const current = navigationEntries[navigationEntries.length - 1];
  if (pendingBack) {
    pendingBack = false;
    if (current?.hash === hash) pendingScrollRestore = current.scrollY;
    return;
  }
  if (current?.hash === hash) return;

  const existingIndex = navigationEntries.findIndex((entry) => entry.hash === hash);
  if (existingIndex >= 0 && existingIndex < navigationEntries.length - 1) {
    navigationEntries.splice(existingIndex + 1);
    pendingScrollRestore = navigationEntries[navigationEntries.length - 1]?.scrollY || 0;
    return;
  }

  rememberNavigationScroll();
  navigationEntries.push({ hash, scrollY: 0 });
}

export function consumeScrollRestore() {
  const scrollY = pendingScrollRestore;
  pendingScrollRestore = null;
  return scrollY;
}

export function navigate(path) {
  initializeNavigation();
  const hash = '#' + path;
  if (location.hash === hash) return;
  location.hash = hash;
}
export function back() {
  initializeNavigation();
  rememberNavigationScroll();
  if (navigationEntries.length > 1) {
    navigationEntries.pop();
    pendingBack = true;
    location.hash = navigationEntries[navigationEntries.length - 1].hash;
    return;
  }
  if (location.hash !== '#/') navigate('/');
}
