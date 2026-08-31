// Admin authentication: bcrypt password check + JWT in an httpOnly cookie.
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { one, q } from './db.js';

const COOKIE = 'inov_admin';
const IS_PROD = process.env.NODE_ENV === 'production';
// Fail closed, mas SEM derrubar o site: em produção sem JWT_SECRET, o painel
// admin fica desactivado (login e sessões recusados) em vez de a app assinar
// sessões com uma constante do repositório. O site público não é afectado.
const ADMIN_DISABLED = IS_PROD && !process.env.JWT_SECRET;
if (ADMIN_DISABLED) {
  console.warn('[inov] painel admin DESACTIVADO: defina JWT_SECRET nas variáveis de ambiente para o activar.');
}
export function adminDisabled() { return ADMIN_DISABLED; }
const SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me';
const MAX_AGE = 1000 * 60 * 60 * 8; // 8 hours

export async function login(email, password) {
  if (ADMIN_DISABLED) return null;
  const row = await one('SELECT * FROM admins WHERE email = ?', [String(email || '').toLowerCase()]);
  if (!row) return null;
  if (!bcrypt.compareSync(String(password || ''), row.password_hash)) return null;
  return jwt.sign({ id: row.id, email: row.email }, SECRET, { expiresIn: '8h' });
}

export function setAuthCookie(res, token) {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PROD,
    maxAge: MAX_AGE,
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE);
}

// Express middleware — rejects unauthenticated requests.
export function requireAuth(req, res, next) {
  if (ADMIN_DISABLED) return res.status(503).json({ error: 'admin_unconfigured', detail: 'Defina JWT_SECRET para activar o painel.' });
  const token = req.cookies?.[COOKIE];
  if (!token) return res.status(401).json({ error: 'unauthorized' });
  try {
    req.admin = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized' });
  }
}

export async function changePassword(adminId, currentPassword, newPassword) {
  const row = await one('SELECT * FROM admins WHERE id = ?', [adminId]);
  if (!row) return { ok: false, error: 'not_found' };
  if (!bcrypt.compareSync(String(currentPassword || ''), row.password_hash)) {
    return { ok: false, error: 'wrong_password' };
  }
  if (String(newPassword || '').length < 8) {
    return { ok: false, error: 'weak_password' };
  }
  const hash = bcrypt.hashSync(String(newPassword), 10);
  await q('UPDATE admins SET password_hash = ? WHERE id = ?', [hash, adminId]);
  return { ok: true };
}
