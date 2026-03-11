// src/middleware/auth.js
const jwt  = require('jsonwebtoken');
const User = require('../models/User');
require('dotenv').config();

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Wymagane uwierzytelnienie.' });
  }
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    const user    = await User.findById(payload.sub);
    if (!user || !user.verified) {
      return res.status(401).json({ success: false, message: 'Użytkownik nie znaleziony.' });
    }
    req.user = { id: user.id, email: user.email };
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: err.name === 'TokenExpiredError' ? 'Sesja wygasła.' : 'Nieprawidłowy token.',
    });
  }
}

module.exports = { requireAuth };
