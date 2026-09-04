import { accessToken } from './supabase.js';

// Single shared websocket with auto-reconnect; components subscribe to events.
let ws = null;
let retry = 0;
const listeners = new Set();

export async function connectSocket() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return ws;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  // A browser cannot set headers on a WebSocket handshake, so the Supabase
  // access token travels as a query parameter (over TLS in production).
  const token = await accessToken();
  ws = new WebSocket(`${proto}://${location.host}/ws${token ? `?access_token=${encodeURIComponent(token)}` : ''}`);
  ws.onmessage = (e) => {
    let msg; try { msg = JSON.parse(e.data); } catch { return; }
    listeners.forEach((fn) => fn(msg));
  };
  ws.onopen = () => { retry = 0; };
  ws.onclose = () => {
    ws = null;
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
