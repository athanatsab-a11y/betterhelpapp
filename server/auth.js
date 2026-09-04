import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { sql } from './db/index.js';

const LEGACY_SECRET = process.env.JWT_SECRET || 'mindbridge-dev-secret-change-me';
const COOKIE = 'mb_token';

// Two authentication modes:
//  - Supabase (SUPABASE_URL set): the client signs in with Supabase Auth and
//    sends its access token; we verify the signature and map the token's
//    subject to a row in `users` via users.auth_id.
//  - Legacy (default): our own bcrypt + JWT cookie, so the app runs locally and
//    in tests with no external service.
export const SUPABASE_URL = process.env.SUPABASE_URL || '';
export const supabaseAuthEnabled = Boolean(SUPABASE_URL);

const jwks = supabaseAuthEnabled
  ? createRemoteJWKSet(new URL(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/.well-known/jwks.json`))
  : null;
const supabaseSecret = process.env.SUPABASE_JWT_SECRET
  ? new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET)
  : null;

export const hashPassword = (pw) => bcrypt.hashSync(pw, 10);
export const checkPassword = (pw, hash) => (hash ? bcrypt.compareSync(pw, hash) : false);

export function issueToken(res, user) {
  const token = jwt.sign({ uid: user.id, role: user.role }, LEGACY_SECRET, { expiresIn: '30d' });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 3600 * 1000,
  });
  return token;
}

export const clearToken = (res) => res.clearCookie(COOKIE);

function bearer(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

// Verifies a Supabase access token. Projects using asymmetric keys are checked
// against the published JWKS; legacy HS256 projects against the shared secret.
export async function verifySupabaseToken(token) {
  try {
    if (supabaseSecret) {
      const { payload } = await jwtVerify(token, supabaseSecret, { algorithms: ['HS256'] });
      return payload;
    }
    const { payload } = await jwtVerify(token, jwks);
    return payload;
  } catch {
    return null;
  }
}

export async function currentUser(req) {
  if (supabaseAuthEnabled) {
    const token = bearer(req);
    if (token) {
      const payload = await verifySupabaseToken(token);
      if (payload?.sub) {
        const user = await sql.get('SELECT * FROM users WHERE auth_id = ?', [payload.sub]);
        if (user) return user;
        // Signed in with Supabase but no profile yet: the registration
        // endpoints create it, and req.authUser carries the verified identity.
        req.authUser = { id: payload.sub, email: payload.email };
        return null;
      }
    }
    return null;
  }

  const raw = req.cookies?.[COOKIE] || bearer(req);
  if (!raw) return null;
  let payload;
  try { payload = jwt.verify(raw, LEGACY_SECRET); } catch { return null; }
  return (await sql.get('SELECT * FROM users WHERE id = ?', [payload.uid])) || null;
}

export async function attachUser(req, _res, next) {
  try {
    req.user = await currentUser(req);
    next();
  } catch (err) { next(err); }
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Απαιτείται σύνδεση' });
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Απαιτείται σύνδεση' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Δεν επιτρέπεται' });
    next();
  };
}

// WebSocket upgrades cannot carry an Authorization header from the browser, so
// the Supabase access token arrives as a query parameter; legacy mode keeps
// using the httpOnly cookie.
export async function userIdFromUpgrade(req) {
  if (supabaseAuthEnabled) {
    const token = new URL(req.url, 'http://localhost').searchParams.get('access_token');
    if (!token) return null;
    const payload = await verifySupabaseToken(token);
    if (!payload?.sub) return null;
    const user = await sql.get('SELECT id FROM users WHERE auth_id = ?', [payload.sub]);
    return user?.id ?? null;
  }

  const raw = /mb_token=([^;]+)/.exec(req.headers.cookie || '')?.[1];
  if (!raw) return null;
  try {
    return jwt.verify(decodeURIComponent(raw), LEGACY_SECRET).uid;
  } catch {
    return null;
  }
}

export function publicUser(u) {
  if (!u) return null;
  const { password_hash, ...rest } = u;
  return rest;
}
