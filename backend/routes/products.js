const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

// IMPORTANT: /categories must be before /:id
router.get('/categories', (_req, res) => {
  res.json(db.prepare('SELECT * FROM categories ORDER BY name').all());
});

router.get('/', (req, res) => {
  const { q, category_id, low_stock } = req.query;
  let sql = `
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE 1=1
  `;
  const params = [];
  if (q) { sql += ' AND (p.name LIKE ? OR p.barcode = ?)'; params.push(`%${q}%`, q); }
  if (category_id) { sql += ' AND p.category_id = ?'; params.push(category_id); }
  if (low_stock === 'true') { sql += ' AND p.stock < 5'; }
  sql += ' ORDER BY p.name ASC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const p = db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id = ?
  `).get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(p);
});

router.post('/', requireAdmin, (req, res) => {
  const { name, description, price, cost, stock, category_id, barcode, unit } = req.body;
  if (!name || price == null) return res.status(400).json({ error: 'Nombre y precio son requeridos' });
  try {
    const r = db.prepare(`
      INSERT INTO products (name, description, price, cost, stock, category_id, barcode, unit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, description || null, price, cost || 0, stock || 0, category_id || null, barcode || null, unit || 'unidad');
    res.status(201).json(db.prepare('SELECT * FROM products WHERE id = ?').get(r.lastInsertRowid));
  } catch (e) {
    if (e.message && e.message.includes('UNIQUE')) return res.status(400).json({ error: 'El código de barras ya existe' });
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', requireAdmin, (req, res) => {
  const { name, description, price, cost, stock, category_id, barcode, unit } = req.body;
  if (!db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id))
    return res.status(404).json({ error: 'Producto no encontrado' });
  try {
    db.prepare(`
      UPDATE products SET
        name=?, description=?, price=?, cost=?, stock=?,
        category_id=?, barcode=?, unit=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(name, description || null, price, cost || 0, stock, category_id || null, barcode || null, unit || 'unidad', req.params.id);
    res.json(db.prepare(`
      SELECT p.*, c.name as category_name FROM products p
      LEFT JOIN categories c ON p.category_id = c.id WHERE p.id=?
    `).get(req.params.id));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', requireAdmin, (req, res) => {
  if (!db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id))
    return res.status(404).json({ error: 'Producto no encontrado' });
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
