// /.netlify/functions/load (robust)
import { getStore } from '@netlify/blobs';
import { checkAuth, needAuth } from './_auth.js';

export async function handler(event){
  if (needAuth()) { const auth = checkAuth(event); if (!auth.ok) return { statusCode: 401, body: 'Unauthorized' }; }
  try {
    const name = process.env.BLOBS_STORE || 'binder-store';
    const opts = { name };
    if (process.env.BLOBS_SITE_ID && process.env.BLOBS_TOKEN) {
      opts.siteID = process.env.BLOBS_SITE_ID;
      opts.token = process.env.BLOBS_TOKEN;
    }
    const store = getStore(opts);
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
