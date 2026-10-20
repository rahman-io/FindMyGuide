let deferredPrompt = null;
let installStatus = '';
let onChange = () => {};

export function isInstalledApp() {
  return window.matchMedia('(display-mode: fullscreen)').matches
    || window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

export function detectInstallPlatform(ua, platform, maxTouchPoints) {
  if (/iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && maxTouchPoints > 1)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

export function installPlatform() {
  return detectInstallPlatform(navigator.userAgent, navigator.platform, navigator.maxTouchPoints);
}

export function getInstallState() {
  return { canPrompt: Boolean(deferredPrompt), status: installStatus, platform: installPlatform() };
}

export function watchInstallation(callback) {
  onChange = callback;
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    installStatus = '';
    onChange();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installStatus = 'installed';
    onChange();
  });
  for (const mode of ['fullscreen', 'standalone']) {
    window.matchMedia(`(display-mode: ${mode})`).addEventListener?.('change', onChange);
  }
}

export async function requestInstallation() {
  if (!deferredPrompt) return;
  const prompt = deferredPrompt;
  deferredPrompt = null;
  await prompt.prompt();
  const choice = await prompt.userChoice;
  installStatus = choice.outcome === 'accepted' ? 'accepted' : 'dismissed';
  onChange();
}
