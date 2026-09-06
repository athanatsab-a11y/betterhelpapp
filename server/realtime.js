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
      handleMessage(ws, msg).catch(() => { /* ένα κακό μήνυμα δεν ρίχνει τη σύνδεση */ });
    });

    ws.on('close', () => {
      clients.get(ws.userId)?.delete(ws);
      if (!clients.get(ws.userId)?.size) {
        clients.delete(ws.userId);
        announcePresence(ws.userId, false);
      }
    });

    ws.send(JSON.stringify({ type: 'ready' }));
    announcePresence(ws.userId, true);
  });
}

// Τα μηνύματα σηματοδοσίας του WebRTC ταξιδεύουν από τον έναν συμμετέχοντα στον
// άλλον χωρίς να τα αγγίζει ο server: μόνο η προσφορά, η απάντηση και οι
// υποψήφιες διαδρομές δικτύου. Ο ήχος και η εικόνα πάνε απευθείας μεταξύ των δύο.
const SIGNALS = new Set(['call:invite', 'call:offer', 'call:answer', 'call:ice', 'call:hangup', 'call:decline', 'call:busy']);

async function handleMessage(ws, msg) {
  if (msg.type === 'ping') { ws.send(JSON.stringify({ type: 'pong' })); return; }

  if (msg.type === 'typing' && msg.room_id) {
    for (const uid of await roomMembers(msg.room_id)) {
      if (uid !== ws.userId) send(uid, { type: 'typing', room_id: msg.room_id, user_id: ws.userId });
    }
    return;
  }

  if (msg.type === 'read' && msg.room_id) {
    // Ο αποστολέας βλέπει ζωντανά ότι διαβάστηκε το μήνυμά του.
    for (const uid of await roomMembers(msg.room_id)) {
      if (uid !== ws.userId) send(uid, { type: 'read', room_id: msg.room_id, by: ws.userId, at: new Date().toISOString() });
    }
    return;
  }

  if (SIGNALS.has(msg.type) && msg.room_id) {
    const members = await roomMembers(msg.room_id);
    if (!members.includes(ws.userId)) return;   // μόνο οι δύο του δωματίου
    for (const uid of members) {
      if (uid !== ws.userId) send(uid, { ...msg, from: ws.userId });
    }
  }
}

function announcePresence(userId, online) {
  // Ενημερώνει όποιον μοιράζεται δωμάτιο μαζί του ότι μπήκε ή βγήκε.
  sql.all(`
    SELECT r.id AS room_id, m.client_id, t.user_id AS therapist_user_id
    FROM rooms r JOIN matches m ON m.id = r.match_id
    JOIN therapists t ON t.id = m.therapist_id
    WHERE m.status = 'active' AND (m.client_id = ? OR t.user_id = ?)
  `, [userId, userId]).then((rows) => {
    for (const row of rows) {
      const other = row.client_id === userId ? row.therapist_user_id : row.client_id;
      send(other, { type: 'presence', room_id: row.room_id, user_id: userId, online });
    }
  }).catch(() => {});
}

export const isOnline = (userId) => clients.has(userId);

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
