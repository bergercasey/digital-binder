# Concurrency-Safe Save/Load Drop‑In (build1)

This package adds **optimistic concurrency** to your Netlify Blobs save/load so stale tabs can't overwrite newer data.

## What’s inside
- `netlify/functions/save.js` — rejects stale writes (409) using `serverVersion`
- `netlify/functions/load.js` — returns the current document (with `serverVersion`)
- `netlify/functions/_auth.js` — optional auth stub (currently disabled)
- `public/dropin-concurrency-client.js` — client helpers you can **import/merge** into your app (API + save flow)
- `public/example.html` — tiny demo wired to the helpers so you can verify the flow
- `netlify.toml` — sets functions dir and Node runtime
- `package.json` — adds `@netlify/blobs` dependency

## Quick Start (recommended for your existing app)
1. Copy the **`netlify/functions`** folder into your repo (replace existing `load.js` and `save.js`).
2. Keep your current UI code, but **merge** `public/dropin-concurrency-client.js`:
   - Track and send `serverVersion` with every save.
   - On 409 (stale), **do not overwrite** — prompt the user to reload/merge.
3. Commit and push to GitHub → Netlify will auto‑deploy and install deps from `package.json`.

> If your repo doesn't have a `package.json`, add the one here (or merge its deps) so Netlify can install `@netlify/blobs`.

## Verify after deploy
- Open **`/.netlify/functions/load`** on your site — you should see JSON (with `serverVersion` when data exists).
- Open `public/example.html` from your build output (or run locally) and click **Save**. Then open a second tab and try to overwrite with an older version — the second tab should get **409 stale** and refuse to overwrite.

## Offline note
This drop‑in **removes silent localStorage fallbacks**. If you want offline support, show a clear **OFFLINE – not synced** banner and never auto‑push local data over server data without confirmation.

— Built: 2025-11-03T16:18:14.809763
