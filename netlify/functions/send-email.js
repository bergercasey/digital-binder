
// /.netlify/functions/send-email  (Gmail SMTP + optional SendGrid/Resend fallback)
import tls from 'tls';

function success(){ return { statusCode: 200, headers: {'Access-Control-Allow-Origin':'*'}, body: JSON.stringify({ok:true}) }; }

async function sendViaGmailSMTP({from, to, subject, text, html}){
  const user = process.env.GMAIL_USER || process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS || process.env.SMTP_PASS || process.env.EMAIL_PASS;
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 465);
  if (!user || !pass) throw new Error('Missing GMAIL_USER and GMAIL_APP_PASSWORD');

  function b64(s){ return Buffer.from(String(s), 'utf8').toString('base64'); }
  function buildMessage(){
    const boundary = '=_b_'+Math.random().toString(36).slice(2);
    const headers = [
      `From: ${from}`,
      `To: ${to.join(', ')}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`
    ].join('\\r\\n');
    const p1 = `--${boundary}\\r\\nContent-Type: text/plain; charset="UTF-8"\\r\\n\\r\\n${text}\\r\\n`;
    const p2 = `--${boundary}\\r\\nContent-Type: text/html; charset="UTF-8"\\r\\n\\r\\n${html || text.replace(/\\n/g,'<br>')}\\r\\n`;
    const end = `--${boundary}--\\r\\n`;
    return headers + '\\r\\n\\r\\n' + p1 + p2 + end;
  }
  const socket = tls.connect({host, port, servername: host});
  const write = (s)=>new Promise((res,rej)=>socket.write(s+'\\r\\n', e=>e?rej(e):res()));
  const read = ()=>new Promise((res,rej)=>{let buf=''; function on(d){buf+=d.toString('utf8'); if(/\\r?\\n$/.test(buf)) {socket.off('data',on); res(buf);} } socket.on('data',on).once('error',rej); });
  await new Promise((res,rej)=>socket.once('secureConnect',res).once('error',rej));
  let r = await read(); if(!/^220/.test(r)) throw new Error('SMTP 220 greeting failed: '+r);
  await write('EHLO netlify'); r = await read(); if(!/^250/.test(r)) throw new Error('SMTP EHLO failed: '+r);
  await write('AUTH LOGIN'); r = await read(); if(!/^334/.test(r)) throw new Error('AUTH start failed: '+r);
  await write(b64(user)); r = await read(); if(!/^334/.test(r)) throw new Error('AUTH username failed: '+r);
  await write(b64(pass)); r = await read(); if(!/^235/.test(r)) throw new Error('AUTH password failed: '+r);
  await write(`MAIL FROM:<${from}>`); r = await read(); if(!/^250/.test(r)) throw new Error('MAIL FROM failed: '+r);
  for (const rcpt of to){ await write(`RCPT TO:<${rcpt}>`); r = await read(); if(!/^250/.test(r)) throw new Error('RCPT TO failed: '+r); }
  await write('DATA'); r = await read(); if(!/^354/.test(r)) throw new Error('DATA failed: '+r);
  await write(buildMessage() + '\\r\\n.'); r = await read(); if(!/^250/.test(r)) throw new Error('Message not accepted: '+r);
  await write('QUIT'); socket.end();
  return {ok:true};
}

export async function handler(event){
  if (event.httpMethod === 'OPTIONS') return {statusCode:204, headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}, body:''};
  if (event.httpMethod !== 'POST') return {statusCode:405, body:'Method Not Allowed'};

  let payload={}; try{ payload = JSON.parse(event.body||'{}'); }catch(_){ return {statusCode:400, body:'Invalid JSON'}; }
  const to = Array.isArray(payload.to) ? payload.to : [];
  const subject = String(payload.subject||'').slice(0,256);
  const text = String(payload.text||'');
  const html = String(payload.html||'');
  const from = process.env.SEND_FROM || process.env.MAIL_FROM || process.env.FROM_EMAIL || process.env.GMAIL_USER;

  if (!from) return {statusCode:500, body:'Missing SEND_FROM (or MAIL_FROM/FROM_EMAIL) env var'};
  if (!to.length) return {statusCode:400, body:'Missing "to" recipients'};
  if (!subject || !text) return {statusCode:400, body:'Missing subject or text body'};

  try{
    await sendViaGmailSMTP({from, to, subject, text, html});
    return success();
  }catch(err){
    return {statusCode:500, body:'Email send failed: ' + (err && err.message ? err.message : String(err))};
  }
}
