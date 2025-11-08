
# Binder Auth (Optional, ENV-based)

To enable user login like the schedule, set these **Site → Environment variables** in Netlify:

- AUTH_USERS = "boss:1234,casey:abcd"
- AUTH_SECRET = "a-very-long-random-string"
- BLOBS_SITE_ID = "<your-site-id>"
- BLOBS_TOKEN = "<your personal access token>"

**How to login** (no UI change):
Send a POST to `/.netlify/functions/auth-login` with JSON: `{ "username": "boss", "password": "1234" }`.
On success, a `binder_auth` cookie is set for the site. Your existing app will then be able to call load/save.
You can wire this to your current login form or run it once from a small hidden fetch in your app.

If AUTH_USERS is not set, the site works without login.
