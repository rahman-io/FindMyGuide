import { state } from '../app/store.js';

const cacheKey = 'findmyguide-exchange-rates-v1';
const cacheTtl = 30 * 60 * 1000;
const fallbackRates = { IDR: 1, USD: 0.000061, EUR: 0.000056, PLN: 0.00024, GBP: 0.000048 };
const currencyMeta = {
  IDR: { locale: 'id-ID', maximumFractionDigits: 0 },
  USD: { locale: 'en-US', maximumFractionDigits: 2 },
  EUR: { locale: 'de-DE', maximumFractionDigits: 2 },
  PLN: { locale: 'pl-PL', maximumFractionDigits: 2 },
  GBP: { locale: 'en-GB', maximumFractionDigits: 2 },
};
let rates = { ...fallbackRates };
let lastUpdated = 0;
let request = null;

try {
  const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
  if (cached?.rates && cached.updatedAt) { rates = { ...fallbackRates, ...cached.rates }; lastUpdated = Number(cached.updatedAt) || 0; }
} catch {}

export function currencyCode(value = state.currency) {
  return { 'IDR (Rp)': 'IDR', 'USD ($)': 'USD', 'EUR (€)': 'EUR', 'PLN (zł)': 'PLN', 'GBP (£)': 'GBP' }[value] || 'IDR';
}

export function convertCurrency(amount, from = 'IDR', to = currencyCode()) {
  const value = Number(amount) || 0;
  const sourceRate = rates[from] || 1;
  const targetRate = rates[to] || fallbackRates[to] || 1;
  return value / sourceRate * targetRate;
}

export function formatCurrency(amount, from = 'IDR', to = currencyCode()) {
  const code = to || currencyCode();
  const meta = currencyMeta[code] || currencyMeta.USD;
  return new Intl.NumberFormat(meta.locale, { style: 'currency', currency: code, currencyDisplay: 'symbol', maximumFractionDigits: meta.maximumFractionDigits }).format(convertCurrency(amount, from, code));
}

export function exchangeRateStatus() {
  return lastUpdated ? `Updated ${new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Using latest available rate';
}

export async function refreshExchangeRates() {
  if (request) return request;
  if (lastUpdated && Date.now() - lastUpdated < cacheTtl) return rates;
  request = fetch('https://open.er-api.com/v6/latest/IDR', { headers: { Accept: 'application/json' } })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error('Exchange rate request failed')))
    .then((data) => {
      const nextRates = Object.fromEntries(Object.keys(fallbackRates).map((code) => [code, Number(data?.rates?.[code]) || fallbackRates[code]]));
      rates = { ...fallbackRates, ...nextRates };
      lastUpdated = Date.now();
      try { localStorage.setItem(cacheKey, JSON.stringify({ rates, updatedAt: lastUpdated })); } catch {}
      return rates;
    })
    .catch(() => rates)
    .finally(() => { request = null; });
  return request;
}
