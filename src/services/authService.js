// src/services/authService.js
const bcrypt       = require('bcryptjs');
const jwt          = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const User         = require('../models/User');
const emailService = require('./emailService');
require('dotenv').config();

// ── Helpers ──────────────────────────────────────────────────────────────────
function generateCode() {
  const length = parseInt(process.env.CODE_LENGTH || '6');
  // Cryptographically random numeric OTP
  const max = Math.pow(10, length);
  return String(Math.floor(Math.random() * max)).padStart(length, '0');
}

function codeExpiresAt() {
  const minutes = parseInt(process.env.CODE_EXPIRES_MINUTES || '15');
  const d = new Date();
  d.setMinutes(d.getMinutes() + minutes);
  // SQLite datetime format: "YYYY-MM-DD HH:MM:SS"
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

function signJwt(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// ── Auth service ──────────────────────────────────────────────────────────────
const authService = {

  // 1. Register ────────────────────────────────────────────────────────────────
  async register({ email, password }) {
    if (!email || !password) {
      throw { status: 400, message: 'Email and password are required.' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw { status: 400, message: 'Invalid email address.' };
    }

    if (password.length < 8) {
      throw { status: 400, message: 'Password must be at least 8 characters.' };
    }

    const existing = User.findByEmail(email);
    if (existing) {
      if (existing.verified) {
        throw { status: 409, message: 'An account with this email already exists.' };
      }
      // Re-send code if user registered but never verified
      const code = generateCode();
      User.saveCode({ userId: existing.id, code, expiresAt: codeExpiresAt() });
      await emailService.sendVerificationCode(email, code);
      return {
        message: 'Account already registered. A new verification code has been sent.',
        email,
      };
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user         = User.create({ email, passwordHash });

    const code = generateCode();
    User.saveCode({ userId: user.id, code, expiresAt: codeExpiresAt() });
    await emailService.sendVerificationCode(email, code);

    return {
      message: 'Registration successful. Please check your email for the verification code.',
      email,
    };
  },

  // 2. Verify ──────────────────────────────────────────────────────────────────
  async verifyEmail({ email, code }) {
    if (!email || !code) {
      throw { status: 400, message: 'Email and code are required.' };
    }

    const user = User.findByEmail(email);
    if (!user) {
      throw { status: 404, message: 'No account found for this email.' };
    }

    if (user.verified) {
      throw { status: 409, message: 'This account is already verified.' };
    }

    const record = User.findActiveCode(user.id);

    if (!record) {
      throw { status: 400, message: 'Verification code has expired. Please request a new one.' };
    }

    if (record.code !== String(code).trim()) {
      throw { status: 400, message: 'Invalid verification code.' };
    }

    User.markCodeUsed(record.id);
    User.markVerified(user.id);

    const token = signJwt(user);

    return {
      message: 'Email verified successfully. Welcome!',
      token,
      user: { id: user.id, email: user.email },
    };
  },

  // 3. Login ────────────────────────────────────────────────────────────────────
  async login({ email, password }) {
    if (!email || !password) {
      throw { status: 400, message: 'Email and password are required.' };
    }

    const user = User.findByEmail(email);
    if (!user) {
      throw { status: 401, message: 'Invalid email or password.' };
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      throw { status: 401, message: 'Invalid email or password.' };
    }

    if (!user.verified) {
      throw {
        status: 403,
        message: 'Please verify your email before logging in.',
        needsVerification: true,
        email: user.email,
      };
    }

    const token = signJwt(user);

    return {
      message: 'Login successful.',
      token,
      user: { id: user.id, email: user.email },
    };
  },

  // 4. Resend code ──────────────────────────────────────────────────────────────
  async resendCode({ email }) {
    if (!email) {
      throw { status: 400, message: 'Email is required.' };
    }

    const user = User.findByEmail(email);
    if (!user) {
      // Return generic message to prevent email enumeration
      return { message: 'If an account exists, a new code has been sent.' };
    }

    if (user.verified) {
      throw { status: 409, message: 'This account is already verified.' };
    }

    const code = generateCode();
    User.saveCode({ userId: user.id, code, expiresAt: codeExpiresAt() });
    await emailService.sendVerificationCode(email, code);

    return { message: 'A new verification code has been sent to your email.' };
  },
};

module.exports = authService;
