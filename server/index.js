import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

import { attachUser } from './auth.js';
import { setupRealtime } from './realtime.js';
import authRoutes from './routes/auth.js';
import intakeRoutes from './routes/intake.js';
import therapyRoutes from './routes/therapy.js';
import toolsRoutes from './routes/tools.js';
import billingRoutes from './routes/billing.js';
import assessmentRoutes from './routes/assessment.js';
import analyticsRoutes from './routes/analytics.js';
import { ensureSeed } from './seed.js';
import { initDb, sql } from './db/index.js';
import { supabaseAuthEnabled } from './auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Το native app τρέχει σε δικά του origins· σε production δηλώνεις τα δικά σου
// domains στο ALLOWED_ORIGINS και τίποτα άλλο δεν περνά.
const NATIVE_ORIGINS = ['capacitor://localhost', 'ionic://localhost', 'http://localhost', 'https://localhost'];
const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin) return callback(null, true);                    // ίδιο origin ή curl
    if (NATIVE_ORIGINS.includes(origin)) return callback(null, true);
    if (!allowed.length || allowed.includes(origin)) return callback(null, true);
    callback(new Error('Origin δεν επιτρέπεται'));
  },
}));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(attachUser);

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api', intakeRoutes);
app.use('/api', therapyRoutes);
app.use('/api', toolsRoutes);
app.use('/api', billingRoutes);
app.use('/api', assessmentRoutes);
app.use('/api', analyticsRoutes);

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Κάτι πήγε στραβά στον server' });
});

// Serve the built SPA in production.
const dist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

const port = Number(process.env.PORT || 3000);
const server = http.createServer(app);
setupRealtime(server);

await initDb();
await ensureSeed();

server.listen(port, () => {
  console.log(`MindBridge API → http://localhost:${port}`);
  console.log(`  βάση: ${sql.kind === 'postgres' ? 'Supabase Postgres' : 'SQLite (τοπικά)'}`);
  console.log(`  auth: ${supabaseAuthEnabled ? 'Supabase Auth' : 'τοπικό JWT cookie'}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => { await sql.close(); process.exit(0); });
}
