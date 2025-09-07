
import { getStore } from '@netlify/blobs';

export default async (request, context) => {
  const url = new URL(request.url);
  const ws = url.searchParams.get('ws');
  if (!ws) return new Response('Missing ws', { status: 400 });
  const store = getStore('binder'); // store name
  if (request.method === 'GET') {
    const data = await store.get(ws, { type: 'json' });
    return new Response(JSON.stringify(data || null), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  }
  if (request.method === 'PUT') {
    const body = await request.json().catch(() => ({}));
    await store.set(ws, body);
    return new Response('OK', { status: 200, headers: { 'cache-control': 'no-store' } });
  }
  if (request.method === 'DELETE') {
    await store.delete(ws);
    return new Response('OK', { status: 200 });
  }
  return new Response('Method Not Allowed', { status: 405 });
};

export const config = { path: '/api/binder' };
