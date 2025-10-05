// netlify/functions/send-email.js
// Supports Resend / SendGrid / Gmail SMTP (nodemailer). Uses whichever env is configured.
export const handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }
    const payload = JSON.parse(event.body || '{}');
    const { to, subject, html, bcc = [] } = payload;
    if (!to || !Array.isArray(to) || to.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing "to" recipients' }) };
    }
    const subj = subject || 'Job Update';

    // Prefer explicit FROM envs, fallback to SMTP/Gmail user
    const from =
      process.env.SEND_FROM ||
      process.env.MAIL_FROM ||
      process.env.FROM_EMAIL ||
      process.env.EMAIL_FROM ||
      process.env.GMAIL_USER ||
      process.env.SMTP_USER ||
      process.env.EMAIL_USER;

    // 1) Resend
    if (process.env.RESEND_API_KEY) {
      const body = { from, to, subject: subj, html };
      if (bcc && bcc.length) body.bcc = bcc;
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const text = await resp.text();
        return { statusCode: resp.status, body: JSON.stringify({ error: 'Resend error', details: text }) };
      }
      const data = await resp.json().catch(() => ({}));
      return { statusCode: 200, body: JSON.stringify({ ok: true, provider: 'resend', data }) };
    }

    // 2) SendGrid
    if (process.env.SENDGRID_API_KEY) {
      const payload = {
        personalizations: [{ to: to.map(e => ({ email: e })), bcc: (bcc||[]).map(e => ({ email: e })) }],
        from: { email: from },
        subject: subj,
        content: [{ type: 'text/html', value: html }],
      };
      const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const text = await resp.text();
        return { statusCode: resp.status, body: JSON.stringify({ error: 'SendGrid error', details: text }) };
      }
      return { statusCode: 200, body: JSON.stringify({ ok: true, provider: 'sendgrid' }) };
    }

    // 3) Gmail/SMTP via nodemailer
    const pass = process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS || process.env.SMTP_PASS || process.env.EMAIL_PASS;
    const user = process.env.GMAIL_USER || process.env.SMTP_USER || process.env.EMAIL_USER || from;
    if (user && pass) {
      const host = process.env.SMTP_HOST || 'smtp.gmail.com';
      const port = Number(process.env.SMTP_PORT || 465);
      const secure = port === 465;

      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });

      const info = await transporter.sendMail({
        from: from || user,
        to: to.join(','),
        bcc: (bcc && bcc.length) ? bcc.join(',') : undefined,
        subject: subj,
        html,
      });

      return { statusCode: 200, body: JSON.stringify({ ok: true, provider: 'gmail', id: info.messageId }) };
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'No email provider configured. Set RESEND_API_KEY or SENDGRID_API_KEY or GMAIL_* / SMTP_* envs.' }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error', details: String(err && err.message || err) }) };
  }
};
