// src/server.js
require('dotenv').config();

const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
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
  const to     = req.query.to || process.env.MAIL_FROM_ADDRESS;
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ success: false, error: 'BREVO_API_KEY not set in Railway variables' });
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method:  'POST',
      headers: {
        'accept':       'application/json',
        'api-key':      apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender:      { name: process.env.MAIL_FROM_NAME, email: process.env.MAIL_FROM_ADDRESS },
        to:          [{ email: to }],
        subject:     'Test email - PiknikoBox',
        textContent: 'SMTP działa! Kod testowy: 123456',
        htmlContent: '<h2>✅ Brevo API działa!</h2><p>Kod testowy: <strong>123456</strong></p>',
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return res.status(500).json({ success: false, error: result.message, detail: result });
    }

    res.json({ success: true, message: 'Email wysłany!', to, messageId: result.messageId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
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
