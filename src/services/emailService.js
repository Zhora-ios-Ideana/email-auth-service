// src/services/emailService.js
const nodemailer = require('nodemailer');
require('dotenv').config();

// ── Transport ────────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ── HTML template ─────────────────────────────────────────────────────────────
function buildVerificationEmail(code, expiresMinutes) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Verify your email</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:10px;overflow:hidden;
                      box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#4f46e5;padding:32px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;letter-spacing:1px;">
                ${process.env.MAIL_FROM_NAME || 'MyApp'}
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="color:#1e1b4b;margin:0 0 12px;">Verify your email address</h2>
              <p style="color:#4b5563;line-height:1.6;margin:0 0 28px;">
                Use the code below to complete your registration.
                It expires in <strong>${expiresMinutes} minutes</strong>.
              </p>
              <!-- Code box -->
              <div style="background:#f0f0ff;border:2px dashed #4f46e5;
                          border-radius:8px;padding:24px;text-align:center;
                          margin-bottom:28px;">
                <span style="font-size:40px;font-weight:bold;letter-spacing:12px;
                             color:#4f46e5;font-family:monospace;">
                  ${code}
                </span>
              </div>
              <p style="color:#9ca3af;font-size:13px;margin:0;">
                If you didn't request this, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;text-align:center;
                       border-top:1px solid #e5e7eb;">
              <p style="color:#9ca3af;font-size:12px;margin:0;">
                © ${new Date().getFullYear()} ${process.env.MAIL_FROM_NAME || 'MyApp'}.
                All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Public API ────────────────────────────────────────────────────────────────
const emailService = {
  async sendVerificationCode(toEmail, code) {
    const expiresMinutes = parseInt(process.env.CODE_EXPIRES_MINUTES || '15');

    await transporter.sendMail({
      from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
      to:   toEmail,
      subject: `Your verification code: ${code}`,
      text: `Your verification code is: ${code}\n\nIt expires in ${expiresMinutes} minutes.`,
      html: buildVerificationEmail(code, expiresMinutes),
    });
  },

  async verifyConnection() {
    return transporter.verify();
  },
};

module.exports = emailService;
