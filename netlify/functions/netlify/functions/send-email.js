// /.netlify/functions/send-email (ESM)
import nodemailer from 'nodemailer';
export async function handler(event){
  if (event.httpMethod !== 'POST') return { statusCode:405, body:'Method Not Allowed' };
  const { subject, html, to } = JSON.parse(event.body||'{}');
  const user = process.env.GMAIL_USER, pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return { statusCode:500, body:'Missing GMAIL_USER or GMAIL_APP_PASSWORD' };
  if (!to || !to.length) return { statusCode:400, body:'No recipients' };
  const transporter = nodemailer.createTransport({ host:'smtp.gmail.com', port:465, secure:true, auth:{ user, pass } });
  try{ await transporter.sendMail({ from: process.env.GMAIL_FROM_DEFAULT || user, to, subject: subject||'HVAC Binder Updates', html: html||'' }); return { statusCode:200, body:'OK' }; }
  catch(e){ return { statusCode:500, body:'Gmail SMTP error: '+(e?.message||'send failed') }; }
}