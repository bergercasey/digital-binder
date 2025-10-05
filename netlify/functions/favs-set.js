
// netlify/functions/favs-set.js
import { getStore } from '@netlify/blobs';
export const handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    const body = JSON.parse(event.body || '{}');
    const user = (body.user || '').trim();
    let favs = Array.isArray(body.favs) ? body.favs : [];
    if (!user) return { statusCode: 400, body: JSON.stringify({ error: 'Missing user' }) };
    favs = favs.map(x => String(x || '').trim().toLowerCase()).filter(Boolean);
    const unique = Array.from(new Set(favs));
    const store = getStore({ name: 'email-favorites' });
    const key = `user:${user}`;
    await store.set(key, unique, { ttl: 0 });
    return { statusCode: 200, body: JSON.stringify({ ok: true, user, favs: unique }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error', details: String(err && err.message || err) }) };
  }
};
