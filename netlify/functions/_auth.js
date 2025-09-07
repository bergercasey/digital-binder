
// netlify/functions/_auth.js
const crypto = require('crypto');

function parseUsers(envStr) {
  // AUTH_USERS: "user1:pass1,user2:pass2"
  const list = (envStr || '').split(',').map(s => s.trim()).filter(Boolean);
  const map = new Map();
  for (const item of list) {
    const [u, p] = item.split(':', 2);
    if (u && p) map.set(u, p);
  }
  return map;
}

function signToken(username, password, secret) {
  const msg = `${username}:${password}`;
  const h = crypto.createHmac('sha256', secret).update(msg).digest('hex');
  return `${Buffer.from(username).toString('base64')}.${h}`;
}

function verifyToken(cookieVal, usersMap, secret) {
  if (!cookieVal) return null;
  const [b64u, hmac] = cookieVal.split('.', 2);
  if (!b64u || !hmac) return null;
  let username;
  try { username = Buffer.from(b64u, 'base64').toString('utf8'); } catch { return null; }
  const password = usersMap.get(username);
  if (!password) return null;
  const expected = signToken(username, password, secret).split('.')[1];
  const ok = crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expected));
  return ok ? { username } : null;
}

function needAuth() {
  return !!process.env.AUTH_USERS;
}

function checkAuth(event) {
  if (!needAuth()) return { ok: true, username: 'anon' };
  const users = parseUsers(process.env.AUTH_USERS);
  const secret = process.env.AUTH_SECRET || 'change-me';
  const cookie = (event.headers['cookie'] || event.headers['Cookie'] || '');
  const m = /binder_auth=([^;]+)/.exec(cookie);
  const token = m ? m[1] : '';
  const res = verifyToken(token, users, secret);
  if (res) return { ok: true, username: res.username };
  return { ok: false };
}

module.exports = { parseUsers, signToken, verifyToken, checkAuth, needAuth };
