// /.netlify/functions/save-force
import { getStore } from '@netlify/blobs';

function cfg() {
  return {
    siteID: process.env.BLOBS_SITE_ID || process.env.NETLIFY_SITE_ID,
    token:  process.env.BLOBS_TOKEN   || process.env.NETLIFY_API_TOKEN
  };
}

export async function handler() {
  try {
    const { siteID, token } = cfg();
    const store = getStore({ name:'binder-store', siteID, token });

    const current = (await store.get('data', { type:'json' })) || {};
    const next = {
      ...current,
      _forcedWriteAt: new Date().toISOString(),
      _note: 'save-force wrote successfully',
      serverVersion: (current.serverVersion ?? 0) + 1
    };
    await store.setJSON('data', next);

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
      body: JSON.stringify({ ok:true, serverVersion: next.serverVersion })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok:false, error:String(e) }) };
  }
}
