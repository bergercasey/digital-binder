// /.netlify/functions/email-settings-load (ESM)
import { getStore } from '@netlify/blobs';
import { checkAuth } from './_auth.js';
export async function handler(event){
  const auth = checkAuth(event);
  const user = auth.ok ? auth.username : 'anon';
  const store = getStore({ name: 'binder-store', siteID: process.env.BLOBS_SITE_ID, token: process.env.BLOBS_TOKEN });
  const all = await store.getJSON('email-settings') || {};
  const row = all[user] || {};
  return { statusCode:200, headers:{'content-type':'application/json','cache-control':'no-store'}, body: JSON.stringify({ user, ...row }) };
}
