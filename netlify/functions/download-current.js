// netlify/functions/download-current.js
import { getStore } from '@netlify/blobs';
import { checkAuth, needAuth } from './_auth.js';

export async function handler(event) {
  if (needAuth()) {
    const auth = checkAuth(event);
    if (!auth.ok) return { statusCode: 401, body: 'Unauthorized' };
  }

  try {
    const store = getStore({
      name: 'binder-store',
      siteID: process.env.BLOBS_SITE_ID,
      token: process.env.BLOBS_TOKEN
    });

    const data = await store.get('data', { type: 'json' }) || {};
    const json = JSON.stringify(data, null, 2);
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `job-binder-backup-cloud-${ts}.json`;

    // If they did a HEAD request, just acknowledge availability
    if (event.httpMethod === 'HEAD') {
      return { statusCode: 200, headers: { 'Cache-Control': 'no-store' } };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store'
      },
      body: json
    };
  } catch (e) {
    return { statusCode: 500, body: String(e) };
  }
}
