// /.netlify/functions/save (robust)
import { getStore } from '@netlify/blobs';
import { checkAuth, needAuth } from './_auth.js';

export async function handler(event){
  if (needAuth()) { const auth = checkAuth(event); if (!auth.ok) return { statusCode: 401, body: 'Unauthorized' }; }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const name = process.env.BLOBS_STORE || 'binder-store';
    const opts = { name };
    if (process.env.BLOBS_SITE_ID && process.env.BLOBS_TOKEN) {
      opts.siteID = process.env.BLOBS_SITE_ID;
      opts.token = process.env.BLOBS_TOKEN;
    }
    const store = getStore(opts);
    const body = event.body || '{}';
    const data = JSON.parse(body);
    data._serverSavedAt = new Date().toISOString();
    await store.setJSON('data', data);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ ok: true })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
}
