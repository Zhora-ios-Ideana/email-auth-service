// src/routes/auth.js
const express     = require('express');
const rateLimit   = require('express-rate-limit');
const authService = require('../services/authService');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const slowLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10 });
const fastLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });

function wrap(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

router.post('/register',    slowLimiter, wrap(async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json({ success: true, ...result });
}));

router.post('/verify',      fastLimiter, wrap(async (req, res) => {
  const result = await authService.verifyEmail(req.body);
  res.json({ success: true, ...result });
}));

router.post('/login',       fastLimiter, wrap(async (req, res) => {
  const result = await authService.login(req.body);
  res.json({ success: true, ...result });
}));

router.post('/resend-code', fastLimiter, wrap(async (req, res) => {
  const result = await authService.resendCode(req.body);
  res.json({ success: true, ...result });
}));

router.get('/me', requireAuth, (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = router;
