import { createSocialAccount, socialUser, switchSocialUser } from '../social/repository.js';

const accountsKey = 'lombok-demo-auth-accounts-v1';
const sessionKey = 'lombok-demo-auth-session-v1';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function accounts() {
  try {
    const stored = JSON.parse(localStorage.getItem(accountsKey) || '[]');
    return Array.isArray(stored) ? stored : [];
  } catch { return []; }
}

function saveAccounts(value) {
  try { localStorage.setItem(accountsKey, JSON.stringify(value)); return true; }
  catch { return false; }
}

function randomId(prefix = 'traveler') {
  const value = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${value}`;
}

function randomSalt() {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function passwordHash(password, salt) {
  if (!globalThis.crypto?.subtle) throw new Error('Secure password storage is unavailable in this browser.');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 120000, hash: 'SHA-256' }, key, 256);
  return [...new Uint8Array(bits)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function sameHash(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string' || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

function activate(userId, provider) {
  const user = socialUser(userId);
  if (!user || !switchSocialUser(userId)) return null;
  try { localStorage.setItem(sessionKey, JSON.stringify({ userId, provider, signedInAt: new Date().toISOString() })); }
  catch { return null; }
  return user;
}

export function hasDemoAccounts() { return accounts().length > 0; }
export function demoAuthMode() { return 'login'; }
export function demoSession() {
  try {
    const session = JSON.parse(localStorage.getItem(sessionKey) || 'null');
    return session?.userId && socialUser(session.userId) ? session : null;
  } catch { return null; }
}

export async function registerTraveler({ name, email, password }) {
  const cleanName = String(name || '').trim().replace(/\s+/g, ' ');
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (cleanName.length < 2 || cleanName.length > 80) return { error: 'Enter your name (2–80 characters).' };
  if (cleanEmail.length > 254 || !emailPattern.test(cleanEmail)) return { error: 'Enter a valid email address. Demo email addresses are accepted.' };
  if (String(password || '').length < 8) return { error: 'Choose a password with at least 8 characters.' };
  const savedAccounts = accounts();
  if (savedAccounts.some((account) => account.email === cleanEmail)) return { error: 'An account with this email already exists. Sign in instead.' };

  const id = randomId();
  const salt = randomSalt();
  let hash;
  try { hash = await passwordHash(String(password), salt); }
  catch (error) { return { error: error.message || 'Could not securely save this demo account.' }; }
  const user = createSocialAccount({ id, displayName: cleanName, email: cleanEmail });
  if (!user) return { error: 'Could not create your traveler profile on this device.' };
  const record = { id, email: cleanEmail, salt, passwordHash: hash, provider: 'email' };
  if (!saveAccounts([...savedAccounts, record])) return { error: 'Could not save this demo account on this device.' };
  const activeUser = activate(id, 'email');
  return activeUser ? { user: activeUser } : { error: 'Could not start your demo session.' };
}

export async function loginTraveler({ email, password }) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const account = accounts().find((entry) => entry.email === cleanEmail && entry.provider === 'email');
  if (!account) return { error: 'No traveler account was found for this email. Create an account first.' };
  let hash;
  try { hash = await passwordHash(String(password || ''), account.salt); }
  catch (error) { return { error: error.message || 'Could not verify this demo account.' }; }
  if (!sameHash(hash, account.passwordHash)) return { error: 'The email or password is incorrect.' };
  const user = activate(account.id, 'email');
  return user ? { user } : { error: 'Could not start your demo session.' };
}

export function continueWithDemoProvider(provider) {
  if (!['google', 'facebook'].includes(provider)) return { error: 'This demo sign-in option is unavailable.' };
  let savedAccounts = accounts();
  let account = savedAccounts.find((entry) => entry.provider === provider);
  if (!account) {
    const id = randomId(`demo-${provider}`);
    const email = `${provider}.${id.slice(-8)}@demo.example.com`;
    const displayName = provider === 'google' ? 'Google Demo Traveler' : 'Facebook Demo Traveler';
    const user = createSocialAccount({ id, displayName, email });
    if (!user) return { error: 'Could not create a demo traveler profile.' };
    account = { id, email, provider };
    savedAccounts = [...savedAccounts, account];
    if (!saveAccounts(savedAccounts)) return { error: 'Could not save this demo account on this device.' };
  }
  const user = activate(account.id, provider);
  return user ? { user } : { error: 'Could not start your demo session.' };
}

export function setDemoSessionUser(userId) {
  const session = demoSession();
  if (!session || !socialUser(userId)) return false;
  try { localStorage.setItem(sessionKey, JSON.stringify({ ...session, userId, demoPersona: true })); return true; }
  catch { return false; }
}

export function signOutDemoAccount() {
  try { localStorage.removeItem(sessionKey); return true; }
  catch { return false; }
}
