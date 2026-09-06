import { accessToken, supabaseEnabled } from './supabase.js';

// Μέσα στο native κέλυφος (Capacitor) η εφαρμογή σερβίρεται τοπικά, οπότε το
// «/api» δεν οδηγεί πουθενά: χρειάζεται η πλήρης διεύθυνση του server. Στο web
// μένει κενό και όλα δουλεύουν σχετικά, όπως πριν.
export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export const isNative = Boolean(window.Capacitor?.isNativePlatform?.());

// Χωρίς Supabase, το native app δεν μπορεί να στηριχτεί σε cookie άλλου origin,
// οπότε κρατά το δικό μας token και το στέλνει ως Bearer.
const TOKEN_KEY = 'mb_token';
export const storedToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
export const rememberToken = (token) => {
  try { token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY); } catch { /* ιδιωτική περιήγηση */ }
};

const json = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Σφάλμα δικτύου');
  return data;
};

// Every call carries the Supabase access token when the project is configured;
// otherwise the API falls back to its own httpOnly cookie.
export async function authHeader() {
  const supabaseToken = supabaseEnabled ? await accessToken() : null;
  const token = supabaseToken || storedToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(method, path, body) {
  const headers = { ...(await authHeader()) };
  if (body) headers['Content-Type'] = 'application/json';
  return fetch(`${API_BASE}/api${path}`, {
    method,
    credentials: 'include',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  }).then(json);
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  patch: (path, body) => request('PATCH', path, body),
  del: (path, body) => request('DELETE', path, body),
};

export const euro = (cents) =>
  new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format((cents || 0) / 100);

export const dt = (iso, opts = {}) =>
  new Date(iso?.includes?.('T') ? iso : `${iso}Z`).toLocaleString('el-GR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', ...opts,
  });

export const day = (iso) =>
  new Date(iso?.includes?.('T') ? iso : `${iso}Z`).toLocaleDateString('el-GR', { weekday: 'long', day: 'numeric', month: 'long' });

export const firstName = (name = '') =>
  name.replace(/^(Δρ\.|Dr\.)\s*/, '').split(' ')[0];

export const initials = (name = '') =>
  name.replace(/^(Δρ\.|Dr\.)\s*/, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

const AVATAR_COLORS = ['#125c5e', '#1a8a86', '#8a5216', '#4b5d8f', '#7a4a72', '#2f6b4f'];
export const avatarColor = (name = '') =>
  AVATAR_COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

export const PLAN = { standard: 'Standard', plus: 'Plus', premium: 'Premium' };
export const PERIOD = { weekly: 'εβδομάδα', monthly: 'μήνα', quarterly: 'τρίμηνο' };
export const SUB_STATUS = { trialing: 'Δωρεάν δοκιμή', active: 'Ενεργή', paused: 'Σε παύση', cancelled: 'Ακυρωμένη' };

export const MODALITY = { video: 'Βιντεοκλήση', phone: 'Τηλέφωνο', live_chat: 'Live chat', messaging: 'Μηνύματα' };
export const STATUS = { scheduled: 'Προγραμματισμένη', completed: 'Ολοκληρώθηκε', cancelled: 'Ακυρώθηκε', no_show: 'Δεν προσήλθε' };
