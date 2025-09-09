// /.netlify/functions/email-contacts-save (ESM)
import { getStore } from '@netlify/blobs';
import { checkAuth } from './auth-check.js';
export async function handler(event){
  if (event.httpMethod !== 'POST') return { statusCode:405, body:'Method Not Allowed' };
  let who = { user: 'anon' };
  try { const r = await checkAuth.handler(event); const body = JSON.parse(r.body||'{}'); if (r.statusCode===200) who.user = body.user || 'anon'; } catch {}
  const payload = JSON.parse(event.body||'{}');
  const contacts = Array.isArray(payload.contacts) ? payload.contacts.filter(x=>x && x.email) : [];
  const store = getStore({ name:'binder-store', siteID: process.env.BLOBS_SITE_ID, token: process.env.BLOBS_TOKEN });
  const all = await store.getJSON('email-contacts') || {};
  all[who.user] = contacts;
  await store.setJSON('email-contacts', all);
  return { statusCode:200, body:'OK' };
}