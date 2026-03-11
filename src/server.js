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
  res.json({ success: true, message: 'Service is running.', time: new Date().toISOString() });
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
