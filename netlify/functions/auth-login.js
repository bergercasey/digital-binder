// netlify/functions/auth-login.js (ESM)
import { parseUsers, signToken, needAuth } from './_auth.js';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  if (!needAuth()) {
    return { statusCode: 200, headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ok:true, user:'anon' }) };
  }
  const { username, password, remember } = JSON.parse(event.body || '{}');
  const users = parseUsers(process.env.AUTH_USERS);
  const secret = process.env.AUTH_SECRET || 'change-me';
  const valid = username && password && users.get(username) === password;
  if (!valid) return { statusCode: 401, headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ok:false }) };

  const token = signToken(username, password, secret);
  const cookie = [
    `binder_auth=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Secure',
    `Max-Age=${remember ? '1209600' : '0'}`
  ].join('; ');

  return { statusCode: 200, headers: { 'Set-Cookie': cookie, 'Content-Type':'application/json', 'Cache-Control':'no-store' }, body: JSON.stringify({ ok:true, user: username }) };
}
