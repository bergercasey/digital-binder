import { getStore } from '@netlify/blobs';
export async function handler(event){
  if(event.httpMethod!=='POST') return { statusCode:405, body:'Method Not Allowed' };
  try{
    const store = getStore({ name:'binder-store' }); // <-- no env
    const incoming = JSON.parse(event.body || '{}');
    // (keep your empty-guard + version checks)
    const current = await store.get('data', { type:'json' }) || null;
    const currVer = current?.serverVersion ?? 0;
    const incVer  = incoming?.serverVersion ?? 0;
    if(incVer < currVer) return { statusCode:409, headers:{'Content-Type':'application/json','Cache-Control':'no-store'}, body: JSON.stringify({ ok:false, reason:'stale', serverVersion: currVer }) };
    const next = { ...incoming, serverVersion: Math.max(currVer,incVer)+1, serverUpdatedAt: new Date().toISOString() };
    await store.setJSON('data', next);
    return { statusCode:200, headers:{'Content-Type':'application/json','Cache-Control':'no-store'}, body: JSON.stringify({ ok:true, serverVersion: next.serverVersion }) };
  }catch(e){ return { statusCode:500, headers:{'Content-Type':'application/json','Cache-Control':'no-store'}, body: JSON.stringify({ error: String(e) }) }; }
}
