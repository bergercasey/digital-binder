// netlify/functions/next-auto-backup.js
import { getStore } from '@netlify/blobs';
import { checkAuth, needAuth } from './_auth.js';

export async function handler(event) {
  if (needAuth()) {
    const auth = checkAuth(event);
    if (!auth.ok) return { statusCode: 401, body: 'Unauthorized' };
  }
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'HEAD') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const store = getStore({
      name: 'binder-store',
      siteID: process.env.BLOBS_SITE_ID,
      token: process.env.BLOBS_TOKEN
    });

    // This is written by your weekly scheduled function (manual-backup-schedule.js)
    const meta = await store.get('meta/last-auto-backup.json', { type: 'json' });

    const last = meta?.lastAutoBackupAt ? new Date(meta.lastAutoBackupAt) : null;
    let nextAt = null;
    if (last && !isNaN(last.getTime())) {
      const n = new Date(last.getTime());
      n.setDate(n.getDate() + 7); // @weekly → +7 days from last run
      nextAt = n.toISOString();
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({
        ok: true,
        lastAutoBackupAt: meta?.lastAutoBackupAt ?? null,
        nextAutoBackupAt: nextAt
      })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: String(e) })
    };
  }
}
