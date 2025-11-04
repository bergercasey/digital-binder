import { getStore } from '@netlify/blobs';
export async function handler() {
  try {
    const store = getStore({ name: 'binder-store' }); // <-- no env
    const data = await store.get('data', { type: 'json' });
    return { statusCode: 200, headers:{'Content-Type':'application/json','Cache-Control':'no-store'}, body: JSON.stringify(data || null) };
  } catch (e) { return { statusCode: 500, body: JSON.stringify({ error: String(e) }) }; }
}
