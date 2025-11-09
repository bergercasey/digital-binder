import { getStore } from '@netlify/blobs';
import { checkAuth, needAuth } from './_auth.js';

export async function handler(event) {
  if (needAuth()) { const auth = checkAuth(event); if (!auth.ok) return { statusCode: 401, body: 'Unauthorized' }; }
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const store = getStore({ name: 'binder-store', siteID: process.env.BLOBS_SITE_ID, token: process.env.BLOBS_TOKEN });
    // list newest-first backups (they’re named backups/ISO.json)
    const { objects } = await store.list({ prefix: 'backups/' });
    if (!objects?.length) return { statusCode: 404, body: 'No backups found' };

    // newest key is last if list is lexicographic; sort just in case
    const latest = objects.map(o => o.key).sort().pop();
    const snap = await store.get(latest, { type: 'json' });
    if (!snap) return { statusCode: 404, body: 'Latest backup is empty' };

    await store.setJSON('data', snap); // restore
    await store.setJSON('meta/last.json', { lastSavedAt: new Date().toISOString(), restoredFrom: latest });

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true, restoredFrom: latest }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
}
