// /.netlify/functions/load
// Reads the binder state from Netlify Blobs.
// If no data exists yet, returns null (the frontend falls back to defaults).
import { getStore } from '@netlify/blobs';

export async function handler() {
  try {
    const store = getStore({ name: 'binder-store' });
    const data = await store.get('data', { type: 'json' });
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify(data || null)
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
}
