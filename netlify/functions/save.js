// netlify/functions/save.js
import { getStore } from '@netlify/blobs';
import { checkAuth, needAuth } from './_auth.js';

export async function handler(event) {
  if (needAuth()) {
    const auth = checkAuth(event);
    if (!auth.ok) return { statusCode: 401, body: 'Unauthorized' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const store = getStore({
      name: 'binder-store',
      siteID: process.env.BLOBS_SITE_ID,
      token: process.env.BLOBS_TOKEN
    });

    const body = JSON.parse(event.body || '{}');

    // 1) Primary write (main current state)
    await store.setJSON('data', body);

    // 2) Meta: last-saved timestamp (for /last-saved and admin status)
    const nowIso = new Date().toISOString();
    await store.setJSON('meta/last.json', { lastSavedAt: nowIso });

    // NOTE: No per-save backup here. Weekly and manual backups handle snapshots.

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ ok: true, key: 'data', lastSavedAt: nowIso })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
}
