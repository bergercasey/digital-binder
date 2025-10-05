
Per-account Favorites

Files included:
- netlify/functions/favs-get.js
- netlify/functions/favs-set.js
- package.json (adds @netlify/blobs)
- email-favs-per-user.js (frontend shim)

How to wire:
1) Add the 2 Netlify functions to your repo (same folder as your other functions).
2) Add @netlify/blobs to your Netlify build (this package.json is included; if you have a top-level one, add the dep there too).
3) Include the frontend script after your existing email scripts:
   <script src="emailprint-preview.js"></script>
   <script src="email-send-style-v2.js"></script> <!-- if you kept this -->
   <script src="email-favs-per-user.js"></script>

Behavior:
- Detects the logged-in username (tries several heuristics). 
- On opening the Email overlay, it fetches that user's favorites from the server and renders them.
- Adding a favorite writes back to the server and updates the UI immediately.
- Uses localStorage as fast cache and offline fallback, namespaced per user: ep_favorites::<username>.

Everything else in the app remains shared across users, as requested.
