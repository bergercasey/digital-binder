
// /.netlify/functions/send-email
// Sends email using ENV-configured provider:
//  - SENDGRID_API_KEY + SEND_FROM  -> SendGrid
//  - RESEND_API_KEY + SEND_FROM    -> Resend
// Returns 200 on success; 4xx/5xx on error.


// Gmail SMTP via TLS (App Password)
import tls from 'tls';

async function sendViaGmailSMTP({from, to, subject, text, html}){
  const user = process.env.GMAIL_USER || process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS || process.env.SMTP_PASS || process.env.EMAIL_PASS;
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 465);

  if (!user || !pass) {
    throw new Error('Missing GMAIL_USER and GMAIL_APP_PASSWORD (or SMTP_USER/SMTP_PASS) env vars');
  }

  function b64(s){ return Buffer.from(String(s), 'utf8').toString('base64'); }

  function buildMessage(){
    const boundary = '=_boundary_' + Math.random().toString(36).slice(2);
    const headers = [
      `From: ${from}`,
      `To: ${to.join(', ')}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`
    ].join('\r\n');

    const partText = [
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: 7bit',
      '',
      text || '',
      ''
    ].join('\r\n');

    const partHtml = [
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      'Content-Transfer-Encoding: 7bit',
      '',
      html || (text||'').replace(/\n/g,'<br>'),
      ''
    ].join('\r\n');

    const end = `--${boundary}--\r\n`;

    return headers + '\r\n\r\n' + partText + '\r\n' + partHtml + '\r\n' + end;
  }

  function expectCode(buf, code){
    const s = buf.toString('utf8');
    if (!s.startsWith(String(code))) {
      throw new Error(`SMTP expected ${code} but got: ` + s);
    }
  }

  const socket = tls.connect({ host, port, servername: host });
  const write = (line) => new Promise((resolve, reject) => {
    socket.write(line + '\r\n', (err) => err ? reject(err) : resolve());
  });
  const read = () => new Promise((resolve, reject) => {
    let chunks=[];
    function onData(d){ chunks.push(d); if (/\r?\n$/.test(d.toString('utf8'))) { socket.off('data', onData); resolve(Buffer.concat(chunks)); } }
    function onErr(e){ socket.off('data', onData); reject(e); }
    socket.on('data', onData);
    socket.once('error', onErr);
  });

  await new Promise((res, rej) => socket.once('secureConnect', res).once('error', rej));
  let buf = await read();              // 220
  expectCode(buf, 220);

  await write('EHLO netlify');
  buf = await read();                  // 250-... 250 ...
  expectCode(buf, 250);

  await write('AUTH LOGIN');
  buf = await read();                  // 334 VXNlcm5hbWU6
  expectCode(buf, 334);
  await write(b64(user));
  buf = await read();                  // 334 UGFzc3dvcmQ6
  expectCode(buf, 334);
  await write(b64(pass));
  buf = await read();                  // 235 2.7.0 Accepted
  expectCode(buf, 235);

  await write(`MAIL FROM:<${from}>`);
  buf = await read(); expectCode(buf, 250);

  for (const rcpt of to) {
    await write(`RCPT TO:<${rcpt}>`);
    buf = await read(); expectCode(buf, 250);
  }

  await write('DATA');
  buf = await read(); expectCode(buf, 354);

  const msg = buildMessage();
  await new Promise((resolve, reject) => {
    socket.write(msg.replace(/\n/g,'\r\n') + '\r\n.\r\n', (err) => err ? reject(err) : resolve());
  });
  buf = await read(); expectCode(buf, 250);

  await write('QUIT');
  socket.end();

  return { ok: true };
}

export async function handler(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const to = Array.isArray(payload.to) ? payload.to : [];
  const subject = String(payload.subject || '').slice(0, 256);
  const text = String(payload.text || '');
  const html = String(payload.html || '');
  const from = process.env.SEND_FROM || process.env.MAIL_FROM || process.env.FROM_EMAIL;

  if (!from) {
    return { statusCode: 500, body: 'Missing SEND_FROM (or MAIL_FROM) env var' };
  }
  if (!to.length) {
    return { statusCode: 400, body: 'Missing "to" recipients' };
  }
  if (!subject || !text) {
    return { statusCode: 400, body: 'Missing subject or text body' };
  }

  const sgKey = process.env.SENDGRID_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const gmailUser = process.env.GMAIL_USER || process.env.SMTP_USER || process.env.EMAIL_USER;

  try {
    if (gmailUser) {
      const resp = await sendViaGmailSMTP({ from, to, subject, text, html });
      if (!resp || resp.ok !== true) { return { statusCode: 500, body: 'Gmail SMTP send failed' }; }
      return success();
    }

    if (sgKey) {
      const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sgKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: to.map(e => ({ email: e })) }],
          from: { email: from },
          subject,
          content: [
            { type: 'text/plain', value: text },
            { type: 'text/html', value: html || text.replace(/\\n/g, '<br>') },
          ],
        }),
      });
      if (!resp.ok) {
        const errText = await resp.text();
        return { statusCode: resp.status, body: `SendGrid error: ${errText}` };
      }
      return success();
    }

    if (resendKey) {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to,
          subject,
          text,
          html: html || text.replace(/\\n/g, '<br>'),
        }),
      });
      if (!resp.ok) {
        const errText = await resp.text();
        return { statusCode: resp.status, body: `Resend error: ${errText}` };
      }
      return success();
    }

    return { statusCode: 501, body: 'No supported email provider configured. Set SENDGRID_API_KEY or RESEND_API_KEY, plus SEND_FROM.' };
  } catch (err) {
    return { statusCode: 500, body: 'Email send failed: ' + (err && err.message ? err.message : String(err)) };
  }
}

function success() {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({ ok: true }),
  };
}
