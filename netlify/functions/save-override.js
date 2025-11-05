// /.netlify/functions/save-override
// One-time restore endpoint: always writes and bumps version safely.
import { getStore } from '@netlify/blobs';

function cfg() {
  return {
    siteID: process.env.BLOBS_SITE_ID || process.env.NETLIFY_SITE_ID,
    token:  process.env.BLOBS_TOKEN   || process.env.NETLIFY_API_TOKEN
  };
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { siteID, token } = cfg();
    const store   = getStore({ name: 'binder-store', siteID, token });
    const current = (await store.get('data', { type: 'json' })) || {};
    const incoming = JSON.parse(event.body || '{}');

    // Merge (incoming wins) and bump version above whichever is higher
    const currVer = current?.serverVersion ?? 0;
    const incVer  = incoming?.serverVersion ?? 0;
    const next = {
      ...current,
      ...incoming,
      serverVersion: Math.max(currVer, incVer) + 1,
      serverUpdatedAt: new Date().toISOString()
    };

    await store.setJSON('data', next);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ ok: true, serverVersion: next.serverVersion, serverUpdatedAt: next.serverUpdatedAt })
    };
  } catch (e) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify({ error: String(e) }) };
  }
}
