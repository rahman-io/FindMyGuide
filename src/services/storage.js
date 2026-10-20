const key = 'travel-experiences-state-v1';
export function readSavedState() {
  try { return JSON.parse(localStorage.getItem(key) || '{}'); }
  catch { return {}; }
}
export function writeSavedState(state) {
  localStorage.setItem(key, JSON.stringify(state));
}
