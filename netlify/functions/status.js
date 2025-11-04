// /.netlify/functions/status
import { getStore } from '@netlify/blobs';

export async function handler() {
  try {
    // Use automatic Netlify Blobs binding (no env vars needed)
    const store = getStore({ name: 'binder-store' });

    // Try reading your main "data" blob
    const data = await store.get('data', { type: 'json' });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      },
      body: JSON.stringify({
        ok: true,
        message: 'Blobs environment connected successfully.',
        hasData: !!data,
        dataPreview: data ? Object.keys(data).slice(0, 5) : null
      })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      },
      body: JSON.stringify({
        ok: false,
        error: String(e),
        hint: 'Make sure this function is deployed on the same Netlify site that has the binder-store enabled.'
      })
    };
  }
}
