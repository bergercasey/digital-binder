// /.netlify/functions/save
import { getStore } from '@netlify/blobs';
import { checkAuth, needAuth } from './_auth.js';

export async function handler(event) {
  if (needAuth()) {
    const auth = checkAuth(event);
    if (!auth.ok) return { statusCode: 401, body: 'Unauthorized' };
  }
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const store = getStore({ name: 'binder-store' }); // use Netlify defaults
    const incoming = JSON.parse(event.body || '{}');

    const allowEmpty = !!incoming?.__allowEmpty;
    if (!allowEmpty) {
      const keys = Object.keys(incoming || {});
      if (keys.length < 2) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
          body: JSON.stringify({ ok:false, reason: 'suspicious-empty', note: 'Payload has too few keys; set __allowEmpty:true to bypass.' })
        };
      }
    }
    delete incoming.__allowEmpty;

    const current = await store.get('data', { type: 'json' }) || null;
    const currVer = current?.serverVersion ?? 0;
    const incVer  = incoming?.serverVersion ?? 0;

    if (incVer < currVer) {
      return {
        statusCode: 409,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        body: JSON.stringify({ ok: false, reason: 'stale', serverVersion: currVer, serverData: current })
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
      body: JSON.stringify({ ok: true, serverVersion: next.serverVersion, serverUpdatedAt: next.serverUpdatedAt })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
}
