export default async (request) => {
  const url = new URL(request.url);
  const store = await import('@netlify/blobs').then(m => m.getStore({ name: 'binder-store' }));
  if (request.method === 'GET') {
    const data = await store.getJSON('data');
    return new Response(JSON.stringify(data || {}), { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  }
  if (request.method === 'PUT') {
    const body = await request.json().catch(()=>({}));
    await store.setJSON('data', body || {});
    return new Response('OK', { status: 200, headers: { 'cache-control': 'no-store' } });
  }
  return new Response('Method Not Allowed', { status: 405 });
};
export const config = { path: '/api/binder' };
