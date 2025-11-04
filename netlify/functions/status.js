// /.netlify/functions/status
import { getStore } from '@netlify/blobs';

function mask(v, keep = 4) {
  if (!v) return null;
  const s = String(v);
  return `${s.slice(0, 3)}…${s.slice(-keep)}`;
}

export async function handler() {
  const envSeen = {
    NETLIFY_SITE_ID: !!process.env.NETLIFY_SITE_ID,
    NETLIFY_API_TOKEN: !!process.env.NETLIFY_API_TOKEN,
    NODE_VERSION: process.version
  };

  try {
    const store = getStore({
      name: 'binder-store',
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_API_TOKEN
    });

    const data = await store.get('data', { type: 'json' });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({
        ok: true,
        env: envSeen,
        details: {
          siteIdSample: mask(process.env.NETLIFY_SITE_ID),
          tokenLength: process.env.NETLIFY_API_TOKEN ? process.env.NETLIFY_API_TOKEN.length : 0,
          store: 'binder-store'
        },
        hasData: !!data,
        dataKeysPreview: data ? Object.keys(data).slice(0, 8) : null
      })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({
        ok: false,
        env: envSeen,
        error: String(e),
        hint: 'Verify site-level env vars (NETLIFY_SITE_ID, NETLIFY_API_TOKEN) and redeploy.'
      })
    };
  }
}
