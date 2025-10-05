
// netlify/functions/favs-get.js
import { getStore } from '@netlify/blobs';
export const handler = async (event) => {
  try {
    const user = (event.queryStringParameters && event.queryStringParameters.user || '').trim();
    if (!user) return { statusCode: 400, body: JSON.stringify({ error: 'Missing user' }) };
    const store = getStore({ name: 'email-favorites' });
    const key = `user:${user}`;
    const favs = await store.get(key, { type: 'json' }) || [];
    return { statusCode: 200, body: JSON.stringify({ ok: true, user, favs }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error', details: String(err && err.message || err) }) };
  }
};
