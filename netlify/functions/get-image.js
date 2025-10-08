// /.netlify/functions/get-image
import { getStore } from '@netlify/blobs';

export async function handler(event){
  try{
    const key = event.queryStringParameters && event.queryStringParameters.key;
    if (!key) return { statusCode: 400, body: 'Missing key' };

    const name = process.env.BLOBS_STORE || 'binder-store';
    const opts = { name };
    if (process.env.BLOBS_SITE_ID && process.env.BLOBS_TOKEN) {
      opts.siteID = process.env.BLOBS_SITE_ID;
      opts.token = process.env.BLOBS_TOKEN;
    }
    const store = getStore(opts);

    const blob = await store.get(key, { type: 'stream' });
    if (!blob) return { statusCode: 404, body: 'Not found' };

    const headers = { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable' };
    return { statusCode: 200, headers, body: blob };
  }catch(err){
    return { statusCode: 500, body: String(err && err.message || err) };
  }
}
