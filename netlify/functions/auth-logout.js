// netlify/functions/auth-logout.js (ESM)
export async function handler() {
  const cookie = ['binder_auth=deleted','Path=/','HttpOnly','SameSite=Lax','Secure','Max-Age=0'].join('; ');
  return { statusCode: 200, headers: { 'Set-Cookie': cookie, 'Cache-Control':'no-store' }, body: 'OK' };
}
