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

    const meta = await store.get('meta/last.json', { type: 'json' });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      },
      body: JSON.stringify({
        ok: true,
        lastSavedAt: meta?.lastSavedAt ?? null
      })
    };
  } catch (err) {
    // If meta/last.json doesn't exist yet, return ok:true with null
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      },
      body: JSON.stringify({
        ok: true,
        lastSavedAt: null,
        note: 'No meta/last.json yet'
      })
    };
  }
}
