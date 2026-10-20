const weatherCache = new Map();
const cacheDuration = 10 * 60 * 1000;

export async function refreshDetailWeather(root) {
  const container = root.querySelector('[data-current-weather]');
  if (!container) return;
  const latitude = Number(container.dataset.weatherLat);
  const longitude = Number(container.dataset.weatherLon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
  const key = `${latitude},${longitude}`;
  const cached = weatherCache.get(key);
  if (cached && Date.now() - cached.time < cacheDuration) {
    container.querySelector('[data-weather-value]').textContent = cached.value;
    return;
  }
  try {
    const query = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude), current: 'temperature_2m', timezone: 'auto' });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`);
    if (!response.ok) return;
    const data = await response.json();
    const temperature = data.current?.temperature_2m;
    if (!Number.isFinite(temperature)) return;
    const value = `${Math.round(temperature)}°C`;
    weatherCache.set(key, { value, time: Date.now() });
    if (container.isConnected) container.querySelector('[data-weather-value]').textContent = value;
  } catch {
    // Keep the unavailable placeholder when the weather service cannot be reached.
  }
}
