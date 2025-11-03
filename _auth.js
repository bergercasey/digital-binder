// Optional auth hook. Currently disabled; adjust as needed.
export function needAuth() {
  return false; // set true to require a bearer token or cookie in checkAuth
}
export function checkAuth(event) {
  // Example: Expect "Authorization: Bearer <token>"
  const hdr = event.headers?.authorization || "";
  const ok = !!hdr && hdr.startsWith("Bearer ");
  return { ok };
}
