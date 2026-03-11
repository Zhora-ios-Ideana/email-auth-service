// src/services/emailService.js
const nodemailer = require('nodemailer');
require('dotenv').config();

function createTransporter() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
}

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
            <p style="color:#9ca3af;font-size:12px;margin:0;">
              © ${new Date().getFullYear()} ${name}
            </p>
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
    const transporter = createTransporter();
    const name        = process.env.MAIL_FROM_NAME || 'PiknikoBox';
    const from        = process.env.MAIL_FROM_ADDRESS;

    console.log(`📧 Sending code to ${toEmail}...`);

    await transporter.sendMail({
      from:    `"${name}" <${from}>`,
      to:      toEmail,
      subject: `Twój kod weryfikacyjny: ${code}`,
      text:    `Twój kod weryfikacyjny: ${code}. Wygasa za ${process.env.CODE_EXPIRES_MINUTES || 15} minut.`,
      html:    buildEmail(code),
    });

    console.log(`✅ Email sent to ${toEmail}`);
  }
};
