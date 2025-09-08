// /.netlify/functions/email-settings-save (ESM)
import { getStore } from '@netlify/blobs';
import { checkAuth } from './_auth.js';
export async function handler(event){
  if (event.httpMethod !== 'POST') return { statusCode:405, body:'Method Not Allowed' };
  let user = 'anon';
  try { const auth = checkAuth(event); if (auth && auth.ok && auth.username) user = auth.username; } catch {}
  const body = JSON.parse(event.body || '{}');
  const store = getStore({ name:'binder-store', siteID: process.env.BLOBS_SITE_ID, token: process.env.BLOBS_TOKEN });
  const all = await store.getJSON('email-settings') || {};
  all[user] = { fromName: body.fromName || '', fromEmail: body.fromEmail || '', to: Array.isArray(body.to) ? body.to : [] };
  await store.setJSON('email-settings', all);
  return { statusCode:200, body:'OK' };
}
