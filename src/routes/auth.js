// src/routes/auth.js
const express     = require('express');
const rateLimit   = require('express-rate-limit');
const authService = require('../services/authService');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ── Rate limiters ─────────────────────────────────────────────────────────────
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 hour
  max: 10,
  message: { success: false, message: 'Too many registrations from this IP. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 min
  max: 20,
  message: { success: false, message: 'Too many requests. Please wait and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Helper: wrap async handlers ───────────────────────────────────────────────
function asyncHandler(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

// ── POST /auth/register ───────────────────────────────────────────────────────
/**
 * Body: { email, password }
 * Returns: { success, message, email }
 */
router.post('/register', registerLimiter, asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.register({ email, password });
  res.status(201).json({ success: true, ...result });
}));

// ── POST /auth/verify ─────────────────────────────────────────────────────────
/**
 * Body: { email, code }
 * Returns: { success, message, token, user }
 */
router.post('/verify', authLimiter, asyncHandler(async (req, res) => {
  const { email, code } = req.body;
  const result = await authService.verifyEmail({ email, code });
  res.json({ success: true, ...result });
}));

// ── POST /auth/login ──────────────────────────────────────────────────────────
/**
 * Body: { email, password }
 * Returns: { success, message, token, user }
 */
router.post('/login', authLimiter, asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login({ email, password });
  res.json({ success: true, ...result });
}));

// ── POST /auth/resend-code ────────────────────────────────────────────────────
/**
 * Body: { email }
 * Returns: { success, message }
 */
router.post('/resend-code', authLimiter, asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await authService.resendCode({ email });
  res.json({ success: true, ...result });
}));

// ── GET /auth/me  (protected — requires Bearer token) ─────────────────────────
/**
 * Returns: { success, user }
 */
router.get('/me', requireAuth, (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = router;
