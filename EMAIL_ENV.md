
Email sending (server-side)
===========================
This build sends emails from a Netlify Function using your env variables.

Set ONE of these providers:
  - SendGrid: SENDGRID_API_KEY and SEND_FROM
  - Resend:   RESEND_API_KEY and SEND_FROM

Optional aliases for from address: MAIL_FROM or FROM_EMAIL.


Gmail (SMTP over TLS)
---------------------
Preferred: use a Gmail **App Password** on an account with 2FA enabled.
Required env:
  - GMAIL_USER (or SMTP_USER / EMAIL_USER): your Gmail address
  - GMAIL_APP_PASSWORD (or GMAIL_PASS / SMTP_PASS / EMAIL_PASS): 16-char App Password
Optional overrides:
  - SMTP_HOST (default: smtp.gmail.com)
  - SMTP_PORT (default: 465)
