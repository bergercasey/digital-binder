// /.netlify/functions/save
import { getStore } from '@netlify/blobs';

function cfg() {
  return {
    siteID: process.env.BLOBS_SITE_ID || process.env.NETLIFY_SITE_ID,
    token:  process.env.BLOBS_TOKEN   || process.env.NETLIFY_API_TOKEN
  };
}

export async function handler(event) {
  if (event.httpMethod !== 'POST')
    return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { siteID, token } = cfg();
    const store = getStore({ name: 'binder-store', siteID, token });

    const incoming = JSON.parse(event.body || '{}');

    // ---- TEMP: disable "suspicious-empty" guard during rescue ----
    // (We'll turn this back on once your data is restored.)

    // optimistic concurrency (kept)
    const current = await store.get('data', { type: 'json' }) || null;
    const currVer = current?.serverVersion ?? 0;
    const incVer  = incoming?.serverVersion ?? 0;

    if (incVer < currVer) {
      return {
        statusCode: 409,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        body: JSON.stringify({ ok:false, reason:'stale', serverVersion: currVer, serverData: current })
      };
    }

    const next = {
      ...incoming,
      serverVersion: Math.max(currVer, incVer) + 1,
      serverUpdatedAt: new Date().toISOString()
    };

    await store.setJSON('data', next);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ ok:true, serverVersion: next.serverVersion, serverUpdatedAt: next.serverUpdatedAt })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ error: String(e) })
    };
  }
}

