// src/models/User.js
const db = require('../config/database');

const User = {
  // ── Create ──────────────────────────────────────────────────────────────
  create({ email, passwordHash }) {
    const stmt = db.prepare(`
      INSERT INTO users (email, password_hash)
      VALUES (?, ?)
    `);
    const info = stmt.run(email.toLowerCase().trim(), passwordHash);
    return this.findById(info.lastInsertRowid);
  },

  // ── Read ─────────────────────────────────────────────────────────────────
  findById(id) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  },

  findByEmail(email) {
    return db.prepare(
      'SELECT * FROM users WHERE email = ? COLLATE NOCASE'
    ).get(email.toLowerCase().trim());
  },

  // ── Update ───────────────────────────────────────────────────────────────
  markVerified(id) {
    db.prepare(`
      UPDATE users
      SET verified = 1, verified_at = datetime('now')
      WHERE id = ?
    `).run(id);
  },

  // ── Verification codes ────────────────────────────────────────────────────
  saveCode({ userId, code, expiresAt }) {
    // Invalidate any previous unused codes for this user
    db.prepare(`
      UPDATE verification_codes SET used = 1 WHERE user_id = ? AND used = 0
    `).run(userId);

    db.prepare(`
      INSERT INTO verification_codes (user_id, code, expires_at)
      VALUES (?, ?, ?)
    `).run(userId, code, expiresAt);
  },

  findActiveCode(userId) {
    return db.prepare(`
      SELECT * FROM verification_codes
      WHERE user_id = ?
        AND used = 0
        AND expires_at > datetime('now')
      ORDER BY created_at DESC
      LIMIT 1
    `).get(userId);
  },

  markCodeUsed(codeId) {
    db.prepare('UPDATE verification_codes SET used = 1 WHERE id = ?').run(codeId);
  },
};

module.exports = User;
