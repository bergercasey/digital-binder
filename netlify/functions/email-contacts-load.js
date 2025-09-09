// /.netlify/functions/email-contacts-load (ESM)
import { getStore } from '@netlify/blobs';
export async function handler(){
  try{
    const store = getStore({ name:'binder-store', siteID: process.env.BLOBS_SITE_ID, token: process.env.BLOBS_TOKEN });
    const all = await store.getJSON('email-contacts') || {};
    const list = all['anon'] || [];
    return { statusCode:200, headers:{'content-type':'application/json','cache-control':'no-store'}, body: JSON.stringify({ user:'anon', contacts:list }) };
  }catch(e){
    // If blobs not configured, return empty to avoid UI errors
    return { statusCode:200, headers:{'content-type':'application/json'}, body: JSON.stringify({ user:'anon', contacts:[] }) };
  }
}