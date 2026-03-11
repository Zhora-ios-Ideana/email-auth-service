// src/middleware/auth.js
const jwt  = require('jsonwebtoken');
const User = require('../models/User');
require('dotenv').config();

/**
 * Protects routes — requires a valid Bearer JWT in the Authorization header.
 * Attaches req.user on success.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user    = User.findById(payload.sub);

    if (!user || !user.verified) {
      return res.status(401).json({ success: false, message: 'User not found or not verified.' });
    }

    req.user = { id: user.id, email: user.email };
    next();
  } catch (err) {
    const expired = err.name === 'TokenExpiredError';
    return res.status(401).json({
      success: false,
      message: expired ? 'Session expired. Please log in again.' : 'Invalid token.',
    });
  }
}

module.exports = { requireAuth };
