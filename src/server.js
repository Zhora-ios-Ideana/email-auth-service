// src/server.js
require('dotenv').config();

const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const nodemailer = require('nodemailer');
const authRoutes = require('./routes/auth');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({
  origin: function(origin, cb) {
    const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim());
    if (!origin || allowed.length === 0 || allowed.includes(origin)) return cb(null, true);
    cb(new Error('CORS not allowed'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json({ limit: '16kb' }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/auth', authRoutes);

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Service is running.',
    time: new Date().toISOString(),
    smtp_host: process.env.SMTP_HOST,
    smtp_port: process.env.SMTP_PORT,
    smtp_user: process.env.SMTP_USER,
  });
});

// ── SMTP test — visit /test-smtp?to=your@email.com ────────────────────────────
app.get('/test-smtp', async (req, res) => {
  const to = req.query.to || process.env.SMTP_USER;
  const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false },
  });
  try {
    await transporter.verify();
    const info = await transporter.sendMail({
      from:    `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
      to:      to,
      subject: 'Test SMTP - PiknikoBox',
      text:    'SMTP działa! Kod testowy: 123456',
      html:    '<h2>✅ SMTP działa!</h2><p>Kod testowy: <strong>123456</strong></p>',
    });
    res.json({ success: true, message: 'Email wysłany!', to, response: info.response });
  } catch (err) {
    console.error('SMTP Error:', err);
    res.status(500).json({
      success: false,
      error:   err.message,
      code:    err.code,
      config: {
        host:   process.env.SMTP_HOST,
        port:   process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE,
        user:   process.env.SMTP_USER,
      }
    });
  }
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Not found.' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error('[Error]', err.message || err);
  if (err.status) {
    return res.status(err.status).json({
      success:           false,
      message:           err.message,
      needsVerification: err.needsVerification || undefined,
      email:             err.email || undefined,
    });
  }
  res.status(500).json({ success: false, message: 'Błąd serwera.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
