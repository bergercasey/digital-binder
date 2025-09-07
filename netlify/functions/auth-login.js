
// netlify/functions/auth-login.js
const { parseUsers, signToken, needAuth } = require('./_auth');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  if (!needAuth()) {
    // If auth not enabled, succeed without cookie
    return { statusCode: 200, body: JSON.stringify({ ok: true, user: 'anon' }) };
  }
  const { username, password, remember } = JSON.parse(event.body || '{}');
  const users = parseUsers(process.env.AUTH_USERS);
  const secret = process.env.AUTH_SECRET || 'change-me';
  const valid = username && password && users.get(username) === password;
  if (!valid) return { statusCode: 401, body: JSON.stringify({ ok: false }) };

  const token = signToken(username, password, secret);
  const cookie = [
    `binder_auth=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    // 'Secure', // uncomment if your site is https only (Netlify is usually https)
    'Max-Age=' + (remember ? '1209600' : '0') // 14 days if remember, else session
  ].join('; ');

  return {
    statusCode: 200,
    headers: { 'Set-Cookie': cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true, user: username })
  };
};
