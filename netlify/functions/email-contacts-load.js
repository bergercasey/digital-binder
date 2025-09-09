// /.netlify/functions/email-contacts-load (ESM)
import { getStore } from '@netlify/blobs';
import { checkAuth } from './auth-check.js'; // use existing function to get user
export async function handler(event){
  let who = { user: 'anon' };
  try { const r = await checkAuth.handler(event); const body = JSON.parse(r.body||'{}'); if (r.statusCode===200) who.user = body.user || 'anon'; } catch {}
  const store = getStore({ name:'binder-store', siteID: process.env.BLOBS_SITE_ID, token: process.env.BLOBS_TOKEN });
  const all = await store.getJSON('email-contacts') || {};
  const list = all[who.user] || [];
  return { statusCode:200, headers:{'content-type':'application/json','cache-control':'no-store'}, body: JSON.stringify({ user: who.user, contacts: list }) };
}