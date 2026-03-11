// src/models/User.js
const pool = require('../config/database');

const User = {
  async create({ email, passwordHash }) {
    const res = await pool.query(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *`,
      [email.toLowerCase().trim(), passwordHash]
    );
    return res.rows[0];
  },

  async findById(id) {
    const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return res.rows[0] || null;
  },

  async findByEmail(email) {
    const res = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );
    return res.rows[0] || null;
  },

  async markVerified(id) {
    await pool.query(
      'UPDATE users SET verified = TRUE, verified_at = NOW() WHERE id = $1',
      [id]
    );
  },

  async saveCode({ userId, code, expiresAt }) {
    await pool.query(
      'UPDATE verification_codes SET used = TRUE WHERE user_id = $1 AND used = FALSE',
      [userId]
    );
    await pool.query(
      'INSERT INTO verification_codes (user_id, code, expires_at) VALUES ($1, $2, $3)',
      [userId, code, expiresAt]
    );
  },

  async findActiveCode(userId) {
    const res = await pool.query(
      `SELECT * FROM verification_codes
       WHERE user_id = $1 AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    return res.rows[0] || null;
  },

  async markCodeUsed(codeId) {
    await pool.query(
      'UPDATE verification_codes SET used = TRUE WHERE id = $1',
      [codeId]
    );
  },
};

module.exports = User;
