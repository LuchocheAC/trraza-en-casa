const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

router.get('/', requireAdmin, (req, res) => {
  const { date, start_date, end_date, limit = 100 } = req.query;
  let sql = 'SELECT * FROM sales WHERE 1=1';
  const params = [];
  if (date) { sql += ' AND DATE(created_at) = ?'; params.push(date); }
  else {
    if (start_date) { sql += ' AND DATE(created_at) >= ?'; params.push(start_date); }
    if (end_date)   { sql += ' AND DATE(created_at) <= ?'; params.push(end_date); }
  }
  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(limit));
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', requireAdmin, (req, res) => {
  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id);
  if (!sale) return res.status(404).json({ error: 'Venta no encontrada' });
  const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(req.params.id);
  res.json({ ...sale, items });
});

router.post('/', (req, res) => {
  const { items, payment_method = 'efectivo', cash_received, discount = 0, notes } = req.body;
  if (!items || items.length === 0)
    return res.status(400).json({ error: 'La venta debe tener al menos un producto' });

  const createSale = db.transaction(() => {
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const total = subtotal - (discount || 0);
    const change = cash_received ? parseFloat(cash_received) - total : 0;

    const { lastInsertRowid: saleId } = db.prepare(`
      INSERT INTO sales (subtotal, discount, total, payment_method, cash_received, change_amount, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(subtotal, discount, total, payment_method,
          cash_received || null, change >= 0 ? change : 0, notes || null);

    const insItem = db.prepare(`
      INSERT INTO sale_items (sale_id, product_id, product_name, quantity, price, subtotal)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const updStock = db.prepare(
      'UPDATE products SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    );

    for (const item of items) {
      insItem.run(saleId, item.product_id || null, item.product_name, item.quantity, item.price, item.price * item.quantity);
      if (item.product_id) updStock.run(item.quantity, item.product_id);
    }

    return db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId);
  });

  try {
    res.status(201).json(createSale());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
