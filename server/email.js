// Email notifications via SMTP (nodemailer). Best-effort: if SMTP is not
// configured, notifications are logged and skipped — form submissions still
// succeed and are persisted to the database.
import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || 'true') === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });
  return transporter;
}

export async function notify(subject, lines) {
  const body = Array.isArray(lines) ? lines.join('\n') : String(lines || '');
  const t = getTransporter();
  if (!t) {
    console.log(`[email] (skipped, SMTP not configured) ${subject}\n${body}`);
    return false;
  }
  try {
    await t.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: process.env.MAIL_TO || process.env.MAIL_FROM || process.env.SMTP_USER,
      subject,
      text: body,
    });
    return true;
  } catch (err) {
    console.error('[email] send failed:', err.message);
    return false;
  }
}
