// /.netlify/functions/email-contacts-save (ESM)
import { getStore } from '@netlify/blobs';
export async function handler(event){
  if (event.httpMethod !== 'POST') return { statusCode:405, body:'Method Not Allowed' };
  try{
    const body = JSON.parse(event.body||'{}');
    const contacts = Array.isArray(body.contacts) ? body.contacts.filter(x=>x && x.email) : [];
    const store = getStore({ name:'binder-store', siteID: process.env.BLOBS_SITE_ID, token: process.env.BLOBS_TOKEN });
    const all = await store.getJSON('email-contacts') || {};
    all['anon'] = contacts;
    await store.setJSON('email-contacts', all);
    return { statusCode:200, body:'OK' };
  }catch(e){
    // If blobs not configured, still 200 (no-op) so the UI doesn't error
    return { statusCode:200, body:'OK' };
  }
}