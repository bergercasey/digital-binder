
// /.netlify/functions/upload-image
import { getStore } from '@netlify/blobs';
import { checkAuth, needAuth } from './_auth.js';

function parseDataUrl(dataUrl){
  const m=/^data:([^;]+);base64,(.+)$/i.exec(dataUrl||''); if(!m) throw new Error('Invalid data URL');
  return { contentType: m[1], data: Buffer.from(m[2],'base64') };
}

export async function handler(event){
  if(needAuth()){ const auth=checkAuth(event); if(!auth.ok) return {statusCode:401,body:'Unauthorized'}; }
  if(event.httpMethod!=='POST') return {statusCode:405, body:'Method Not Allowed'};
  try{
    const {dataUrl,ext}=JSON.parse(event.body||'{}'); if(!dataUrl) return {statusCode:400, body:'Missing dataUrl'};
    const {contentType,data}=parseDataUrl(dataUrl);
    const store=getStore({name:'binder-store', siteID: process.env.BLOBS_SITE_ID, token: process.env.BLOBS_TOKEN});
    const rand=Math.random().toString(36).slice(2);
    const suffix=(ext&&typeof ext==='string')?ext.replace(/^\./,''):(contentType.split('/')[1]||'bin');
    const key=`images/${Date.now()}-${rand}.${suffix}`;
    await store.set(key, data, {contentType});
    const url=`/.netlify/functions/get-image?key=${encodeURIComponent(key)}`;
    return {statusCode:200, headers:{'Content-Type':'application/json'}, body: JSON.stringify({ok:true,url,key,contentType})};
  }catch(err){
    return {statusCode:500, body:String((err&&err.message)||err)};
  }
}
