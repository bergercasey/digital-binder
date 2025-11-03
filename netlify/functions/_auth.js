// Optional auth hook. Disabled by default.
export function needAuth(){ return false; }
export function checkAuth(event){ return { ok: true }; }
