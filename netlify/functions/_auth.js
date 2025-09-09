// netlify/functions/_auth.js (ESM)
import { createHmac, timingSafeEqual } from 'crypto';

export function needAuth() {
  return !!process.env.AUTH_USERS;
}
export function parseUsers(envStr) {
  const list = (envStr || '').split(',').map(s=>s.trim()).filter(Boolean);
  const map = new Map();
  for (const item of list) {
    const [u,p] = item.split(':',2);
    if (u && p) map.set(u, p);
  }
  return map;
}
export function signToken(username, password, secret) {
  const msg = `${username}:${password}`;
  const h = createHmac('sha256', secret).update(msg).digest('hex');
  return `${Buffer.from(username).toString('base64')}.${h}`;
}
export function verifyToken(cookieVal, usersMap, secret) {
  if (!cookieVal) return null;
  const [b64u, hmac] = cookieVal.split('.', 2);
  if (!b64u || !hmac) return null;
  let username;
  try { username = Buffer.from(b64u, 'base64').toString('utf8'); } catch { return null; }
  const password = usersMap.get(username);
  if (!password) return null;
  const expected = signToken(username, password, secret).split('.')[1];
  try {
    const ok = timingSafeEqual(Buffer.from(hmac), Buffer.from(expected));
    return ok ? { username } : null;
  } catch { return null; }
}
export function checkAuth(event) {
  if (!needAuth()) return { ok:true, username:'anon' };
  const users = parseUsers(process.env.AUTH_USERS);
  const secret = process.env.AUTH_SECRET || 'change-me';
  const cookie = event.headers?.cookie || event.headers?.Cookie || '';
  const m = /binder_auth=([^;]+)/.exec(cookie);
  const token = m ? m[1] : '';
  const res = verifyToken(token, users, secret);
  return res ? { ok:true, username: res.username } : { ok:false };
}
