// src/services/emailService.js
// Uses Brevo HTTP API (port 443) — works on Railway
require('dotenv').config();
const fetch = require('node-fetch');

function buildEmail(code) {
  const minutes = process.env.CODE_EXPIRES_MINUTES || '15';
  const name    = process.env.MAIL_FROM_NAME || 'PiknikoBox';
  return `
<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="500" cellpadding="0" cellspacing="0"
             style="background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);">
        <tr>
          <td style="background:#4f46e5;padding:30px 40px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:22px;">${name}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="color:#1e1b4b;margin:0 0 16px;">Potwierdź swój adres e-mail</h2>
            <p style="color:#4b5563;margin:0 0 24px;line-height:1.6;">
              Użyj poniższego kodu aby dokończyć rejestrację.<br/>
              Kod wygasa po <strong>${minutes} minutach</strong>.
            </p>
            <div style="background:#f0f0ff;border:2px dashed #4f46e5;border-radius:8px;
                        padding:24px;text-align:center;margin-bottom:24px;">
              <span style="font-size:48px;font-weight:bold;letter-spacing:14px;
                           color:#4f46e5;font-family:monospace;">${code}</span>
            </div>
            <p style="color:#9ca3af;font-size:13px;">
              Jeśli nie zakładałeś konta, zignoruj tę wiadomość.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:16px 40px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="color:#9ca3af;font-size:12px;margin:0;">© ${new Date().getFullYear()} ${name}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = {
  async sendVerificationCode(toEmail, code) {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) throw new Error('BREVO_API_KEY is not set');

    console.log(`📧 Sending code to ${toEmail} via Brevo API...`);

    const payload = {
      sender: {
        name:  process.env.MAIL_FROM_NAME || 'PiknikoBox',
        email: process.env.MAIL_FROM_ADDRESS,
      },
      to: [{ email: toEmail }],
      subject: `Twój kod weryfikacyjny: ${code}`,
      textContent: `Twój kod weryfikacyjny: ${code}. Wygasa za ${process.env.CODE_EXPIRES_MINUTES || 15} minut.`,
      htmlContent: buildEmail(code),
    };

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method:  'POST',
      headers: {
        'accept':       'application/json',
        'api-key':      apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Brevo API error:', result);
      throw new Error(result.message || 'Failed to send email');
    }

    console.log(`✅ Email sent to ${toEmail} — messageId: ${result.messageId}`);
    return result;
  }
};
