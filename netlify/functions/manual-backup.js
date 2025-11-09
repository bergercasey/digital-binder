// netlify/functions/manual-backup.js
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

    // read current main data blob
    const data = await store.get('data', { type: 'json' });
    if (!data) {
      return { statusCode: 404, body: 'No data to back up' };
    }

    // write a fresh copy with timestamp
    const now = new Date().toISOString().replace(/[:.]/g, '-');
    const backupKey = `backups/manual-${now}.json`;
    await store.setJSON(backupKey, data);

    // update meta info for visibility
    await store.setJSON('meta/last-backup.json', {
      lastBackupAt: new Date().toISOString(),
      backupKey
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, backupKey })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
}
