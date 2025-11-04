// /.netlify/functions/status
import { getStore } from '@netlify/blobs';

function cfg() {
  // Prefer your names, fall back to Netlify’s
  const siteID = process.env.BLOBS_SITE_ID || process.env.NETLIFY_SITE_ID;
  const token  = process.env.BLOBS_TOKEN   || process.env.NETLIFY_API_TOKEN;
  return { siteID, token };
}
function mask(v, keep = 4) { if (!v) return null; const s = String(v); return s.slice(0,3) + '…' + s.slice(-keep); }

export async function handler() {
  const { siteID, token } = cfg();
  const envSeen = {
    BLOBS_SITE_ID: !!process.env.BLOBS_SITE_ID,
    BLOBS_TOKEN:   !!process.env.BLOBS_TOKEN,
    NETLIFY_SITE_ID: !!process.env.NETLIFY_SITE_ID,
    NETLIFY_API_TOKEN: !!process.env.NETLIFY_API_TOKEN,
    NODE_VERSION: process.version
  };

  try {
    const store = getStore({ name: 'binder-store', siteID, token });
    const data = await store.get('data', { type: 'json' });
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({
        ok: true,
        env: envSeen,
        details: { siteIdSample: mask(siteID), tokenLen: token ? token.length : 0 },
        hasData: !!data,
        dataKeysPreview: data ? Object.keys(data).slice(0, 8) : null
      })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ ok: false, env: envSeen, error: String(e) })
    };
  }
}
