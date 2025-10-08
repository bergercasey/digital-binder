// /.netlify/functions/get-image
import { getStore } from '@netlify/blobs';
import { checkAuth, needAuth } from './_auth.js';

export async function handler(event){
  if (needAuth()) { const auth = checkAuth(event); if (!auth.ok) return { statusCode: 401, body: 'Unauthorized' }; }
  try{
    const key = event.queryStringParameters && event.queryStringParameters.key;
    if (!key) return { statusCode: 400, body: 'Missing key' };
    const store = getStore({ name: 'binder-store', siteID: process.env.BLOBS_SITE_ID, token: process.env.BLOBS_TOKEN });
    const blob = await store.get(key, { type: 'stream' });
    if (!blob) return { statusCode: 404, body: 'Not found' };
    const headers = { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable' };
    return { statusCode: 200, headers, body: blob };
  }catch(err){
    return { statusCode: 500, body: String(err && err.message || err) };
  }
}
