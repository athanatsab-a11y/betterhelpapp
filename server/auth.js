import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './db.js';

const SECRET = process.env.JWT_SECRET || 'mindbridge-dev-secret-change-me';
const COOKIE = 'mb_token';

export const hashPassword = (pw) => bcrypt.hashSync(pw, 10);
export const checkPassword = (pw, hash) => bcrypt.compareSync(pw, hash);

export function issueToken(res, user) {
  const token = jwt.sign({ uid: user.id, role: user.role }, SECRET, { expiresIn: '30d' });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 3600 * 1000,
  });
  return token;
}

export const clearToken = (res) => res.clearCookie(COOKIE);

export function readToken(raw) {
  try { return jwt.verify(raw, SECRET); } catch { return null; }
}

export function currentUser(req) {
  const raw = req.cookies?.[COOKIE] || (req.headers.authorization || '').replace(/^Bearer /, '');
  if (!raw) return null;
  const payload = readToken(raw);
  if (!payload) return null;
  return db.prepare('SELECT * FROM users WHERE id = ?').get(payload.uid) || null;
}

export function attachUser(req, _res, next) {
  req.user = currentUser(req);
  next();
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

export function publicUser(u) {
  if (!u) return null;
  const { password_hash, ...rest } = u;
  return rest;
}
