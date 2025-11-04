// /.netlify/functions/status
import { getStore } from '@netlify/blobs';
export async function handler() {
  const env = {
    NETLIFY_SITE_ID: !!process.env.NETLIFY_SITE_ID,
    NETLIFY_API_TOKEN: !!process.env.NETLIFY_API_TOKEN,
    NODE_VERSION: process.version,
  };
  try {
    const store = getStore({ name:'binder-store', siteID: process.env.NETLIFY_SITE_ID, token: process.env.NETLIFY_API_TOKEN });
    const probe = await store.get('data', { type: 'json' });
    return { statusCode: 200, headers:{'Content-Type':'application/json','Cache-Control':'no-store'}, body: JSON.stringify({ ok:true, env, hasData: !!probe }) };
  } catch (e) {
    return { statusCode: 500, headers:{'Content-Type':'application/json','Cache-Control':'no-store'}, body: JSON.stringify({ ok:false, env, error: String(e) }) };
  }
}
