const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'pos-villanueva-secret-2026';

function authenticate(req, res, next) {
  const token = (req.headers.authorization || '').split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin')
    return res.status(403).json({ error: 'Acceso restringido a administradores' });
  next();
}

module.exports = { authenticate, requireAdmin, SECRET };
