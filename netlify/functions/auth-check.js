// netlify/functions/auth-check.js (ESM)
import { checkAuth, needAuth } from './_auth.js';
export async function handler(event){
  if(!needAuth()) return { statusCode:200, headers:{'content-type':'application/json','cache-control':'no-store'}, body: JSON.stringify({requireAuth:false,ok:true}) };
  const res = checkAuth(event);
  if(!res.ok) return { statusCode:401, headers:{'content-type':'application/json','cache-control':'no-store'}, body: JSON.stringify({requireAuth:true,ok:false}) };
  return { statusCode:200, headers:{'content-type':'application/json','cache-control':'no-store'}, body: JSON.stringify({requireAuth:true,ok:true,user:res.username}) };
}
