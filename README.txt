
Jobs App Icon Pack
==================

Files:
  - jobs-icon-1024.png (master)
  - jobs-icon-512.png, jobs-icon-192.png (Android/Chrome)
  - jobs-icon-180.png, 167, 152 (Apple touch icons)
  - jobs-icon-32.png, jobs-icon-16.png (favicons)
  - site.webmanifest

How to add (Netlify/static):
  1) Copy all PNGs and site.webmanifest to your site's public root (same folder as index.html).
  2) Add these tags inside <head> of index.html:
     <link rel="apple-touch-icon" sizes="180x180" href="/jobs-icon-180.png">
     <link rel="apple-touch-icon" sizes="167x167" href="/jobs-icon-167.png">
     <link rel="apple-touch-icon" sizes="152x152" href="/jobs-icon-152.png">
     <link rel="icon" type="image/png" sizes="32x32" href="/jobs-icon-32.png">
     <link rel="icon" type="image/png" sizes="16x16" href="/jobs-icon-16.png">
     <link rel="manifest" href="/site.webmanifest">
     <meta name="theme-color" content="#0b7ef2">
  3) (Optional) For iOS PWA splash/icon, also keep 192 and 512 sizes.

If your app uses /public or /static folder for assets, place the files there and adjust the href paths accordingly.
