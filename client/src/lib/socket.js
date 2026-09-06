import { accessToken, supabaseEnabled } from './supabase.js';
import { API_BASE, storedToken } from './api.js';

// Single shared websocket with auto-reconnect; components subscribe to events.
let ws = null;
let retry = 0;
const listeners = new Set();

export async function connectSocket() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return ws;
  // Ο socket ακολουθεί το API: στο web είναι ο ίδιος host, στο native app ο
  // απομακρυσμένος server. Ο browser δεν στέλνει headers στο handshake, οπότε
  // το token ταξιδεύει ως παράμετρος (πάνω από TLS σε production).
  const base = API_BASE
    ? API_BASE.replace(/^http/, 'ws')
    : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;
  const token = (supabaseEnabled ? await accessToken() : null) || storedToken();
  ws = new WebSocket(`${base}/ws${token ? `?access_token=${encodeURIComponent(token)}` : ''}`);
  ws.onmessage = (e) => {
    let msg; try { msg = JSON.parse(e.data); } catch { return; }
    listeners.forEach((fn) => fn(msg));
  };
  ws.onopen = () => {
    const wasDown = retry > 0;
    retry = 0;
    listeners.forEach((fn) => fn({ type: 'socket:open', reconnected: wasDown }));
  };
  ws.onclose = () => {
    ws = null;
    listeners.forEach((fn) => fn({ type: 'socket:close' }));
    retry = Math.min(retry + 1, 6);
    setTimeout(connectSocket, 500 * 2 ** retry);
  };
  ws.onerror = () => ws?.close();
  return ws;
}

export function onSocket(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function sendSocket(payload) {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
}
export function closeSocket() { const s = ws; ws = null; s?.close(); }
