// src/services/authService.js
const bcrypt       = require('bcryptjs');
const jwt          = require('jsonwebtoken');
const User         = require('../models/User');
const emailService = require('./emailService');
require('dotenv').config();

function generateCode() {
  const length = parseInt(process.env.CODE_LENGTH || '6');
  return String(Math.floor(Math.random() * Math.pow(10, length))).padStart(length, '0');
}

function codeExpiresAt() {
  const minutes = parseInt(process.env.CODE_EXPIRES_MINUTES || '15');
  const d = new Date();
  d.setMinutes(d.getMinutes() + minutes);
  return d;
}

function signJwt(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

module.exports = {
  async register({ email, password }) {
    if (!email || !password)
      throw { status: 400, message: 'Email i hasło są wymagane.' };

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw { status: 400, message: 'Nieprawidłowy adres email.' };

    if (password.length < 8)
      throw { status: 400, message: 'Hasło musi mieć minimum 8 znaków.' };

    const existing = await User.findByEmail(email);
    if (existing) {
      if (existing.verified)
        throw { status: 409, message: 'Konto z tym adresem email już istnieje.' };

      const code = generateCode();
      await User.saveCode({ userId: existing.id, code, expiresAt: codeExpiresAt() });
      await emailService.sendVerificationCode(email, code);
      return { message: 'Nowy kod weryfikacyjny został wysłany na Twój email.', email };
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user         = await User.create({ email, passwordHash });
    const code         = generateCode();

    await User.saveCode({ userId: user.id, code, expiresAt: codeExpiresAt() });
    await emailService.sendVerificationCode(email, code);

    return { message: 'Rejestracja udana! Sprawdź email aby potwierdzić konto.', email };
  },

  async verifyEmail({ email, code }) {
    if (!email || !code)
      throw { status: 400, message: 'Email i kod są wymagane.' };

    const user = await User.findByEmail(email);
    if (!user)
      throw { status: 404, message: 'Nie znaleziono konta dla tego adresu email.' };

    if (user.verified)
      throw { status: 409, message: 'To konto jest już zweryfikowane.' };

    const record = await User.findActiveCode(user.id);
    if (!record)
      throw { status: 400, message: 'Kod weryfikacyjny wygasł. Poproś o nowy.' };

    if (record.code !== String(code).trim())
      throw { status: 400, message: 'Nieprawidłowy kod weryfikacyjny.' };

    await User.markCodeUsed(record.id);
    await User.markVerified(user.id);

    return {
      message: 'Email zweryfikowany! Witaj!',
      token:   signJwt(user),
      user:    { id: user.id, email: user.email },
    };
  },

  async login({ email, password }) {
    if (!email || !password)
      throw { status: 400, message: 'Email i hasło są wymagane.' };

    const user = await User.findByEmail(email);
    if (!user)
      throw { status: 401, message: 'Nieprawidłowy email lub hasło.' };

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match)
      throw { status: 401, message: 'Nieprawidłowy email lub hasło.' };

    if (!user.verified)
      throw {
        status: 403,
        message: 'Potwierdź swój email przed zalogowaniem.',
        needsVerification: true,
        email: user.email,
      };

    return {
      message: 'Logowanie udane.',
      token:   signJwt(user),
      user:    { id: user.id, email: user.email },
    };
  },

  async resendCode({ email }) {
    if (!email)
      throw { status: 400, message: 'Email jest wymagany.' };

    const user = await User.findByEmail(email);
    if (!user)
      return { message: 'Jeśli konto istnieje, nowy kod został wysłany.' };

    if (user.verified)
      throw { status: 409, message: 'To konto jest już zweryfikowane.' };

    const code = generateCode();
    await User.saveCode({ userId: user.id, code, expiresAt: codeExpiresAt() });
    await emailService.sendVerificationCode(email, code);

    return { message: 'Nowy kod weryfikacyjny został wysłany.' };
  },
};
