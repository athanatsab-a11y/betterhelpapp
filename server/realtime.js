import { WebSocketServer } from 'ws';
import { userIdFromUpgrade } from './auth.js';
import { sql } from './db/index.js';

const clients = new Map(); // userId -> Set<ws>

export function setupRealtime(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', async (ws, req) => {
    const userId = await userIdFromUpgrade(req).catch(() => null);
    if (!userId) { ws.close(4001, 'unauthorized'); return; }
    ws.userId = userId;
    if (!clients.has(ws.userId)) clients.set(ws.userId, new Set());
    clients.get(ws.userId).add(ws);

    ws.on('message', (buf) => {
      let msg; try { msg = JSON.parse(buf.toString()); } catch { return; }
      if (msg.type === 'typing' && msg.room_id) {
        roomMembers(msg.room_id).then((members) => {
          for (const uid of members) {
            if (uid !== ws.userId) send(uid, { type: 'typing', room_id: msg.room_id, user_id: ws.userId });
          }
        }).catch(() => {});
      }
      if (msg.type === 'ping') ws.send(JSON.stringify({ type: 'pong' }));
    });

    ws.on('close', () => {
      clients.get(ws.userId)?.delete(ws);
      if (!clients.get(ws.userId)?.size) clients.delete(ws.userId);
    });

    ws.send(JSON.stringify({ type: 'ready' }));
  });
}

export async function roomMembers(roomId) {
  const row = await sql.get(`
    SELECT m.client_id, t.user_id AS therapist_user_id
    FROM rooms r JOIN matches m ON m.id = r.match_id
    JOIN therapists t ON t.id = m.therapist_id
    WHERE r.id = ?
  `, [roomId]);
  return row ? [row.client_id, row.therapist_user_id] : [];
}

export function send(userId, payload) {
  const set = clients.get(userId);
  if (!set) return;
  const data = JSON.stringify(payload);
  for (const ws of set) { try { ws.send(data); } catch { /* dropped */ } }
}

export async function broadcastToRoom(roomId, payload, exceptUserId) {
  for (const uid of await roomMembers(roomId)) if (uid !== exceptUserId) send(uid, payload);
}

export const onlineUsers = () => [...clients.keys()];
