// /.netlify/functions/load
import { getStore } from '@netlify/blobs';
import { checkAuth, needAuth } from './_auth.js';

export async function handler(){
  if (needAuth()) { const auth = checkAuth(event); if (!auth.ok) return { statusCode: 401, body: 'Unauthorized' }; }
  try {
    const store = getStore({ name: 'binder-store', siteID: process.env.BLOBS_SITE_ID, token: process.env.BLOBS_TOKEN });
    const data = await store.get('data', { type: 'json' });
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify(data || null)
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
}
