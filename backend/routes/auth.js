const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const db       = require('../db/database');
const { authenticate, requireAdmin, SECRET } = require('../middleware/auth');

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password)
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

  const payload = { id: user.id, username: user.username, role: user.role };
  const token   = jwt.sign(payload, SECRET, { expiresIn: '12h' });
  res.json({ token, user: payload });
});

router.get('/me', authenticate, (req, res) => res.json(req.user));

// List users (admin only)
router.get('/users', authenticate, requireAdmin, (_req, res) => {
  res.json(
    db.prepare('SELECT id, username, role, created_at FROM users ORDER BY id').all()
  );
});

// Change password — admin can change any user; cajero only own account
router.put('/users/:id/password', authenticate, (req, res) => {
  const targetId = parseInt(req.params.id);
  if (req.user.role !== 'admin' && req.user.id !== targetId)
    return res.status(403).json({ error: 'Sin permiso para cambiar esta contraseña' });

  const { password } = req.body || {};
  if (!password || password.length < 6)
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

  if (!db.prepare('SELECT id FROM users WHERE id = ?').get(targetId))
    return res.status(404).json({ error: 'Usuario no encontrado' });

  db.prepare('UPDATE users SET password = ? WHERE id = ?')
    .run(bcrypt.hashSync(password, 10), targetId);
  res.json({ success: true });
});

module.exports = router;
