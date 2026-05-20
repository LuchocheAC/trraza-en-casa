const express = require('express');
const router = express.Router();
const db = require('../db/database');

function calcSummary(date) {
  const rows = db.prepare(`
    SELECT payment_method, COUNT(*) as count, SUM(total) as total
    FROM sales WHERE DATE(created_at) = ?
    GROUP BY payment_method
  `).all(date);

  let cash_total = 0, card_total = 0, transfer_total = 0, transaction_count = 0, total_sales = 0;
  for (const r of rows) {
    transaction_count += Number(r.count);
    total_sales       += Number(r.total);
    if      (r.payment_method === 'efectivo')      cash_total     = Number(r.total);
    else if (r.payment_method === 'tarjeta')        card_total     = Number(r.total);
    else if (r.payment_method === 'transferencia')  transfer_total = Number(r.total);
  }
  return { cash_total, card_total, transfer_total, transaction_count, total_sales };
}

// Today's running summary (includes closing record if exists)
router.get('/summary', (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  const summary = calcSummary(date);
  const closing = db.prepare('SELECT * FROM cash_closings WHERE date = ?').get(date) || null;
  res.json({ date, ...summary, closing });
});

// List past closings (most recent first)
router.get('/', (_req, res) => {
  res.json(db.prepare('SELECT * FROM cash_closings ORDER BY date DESC LIMIT 60').all());
});

// Close today's cash register
router.post('/', (req, res) => {
  const date = new Date().toISOString().split('T')[0];
  if (db.prepare('SELECT id FROM cash_closings WHERE date = ?').get(date))
    return res.status(400).json({ error: 'La caja de hoy ya fue cerrada' });

  const { notes } = req.body || {};
  const { cash_total, card_total, transfer_total, transaction_count, total_sales } = calcSummary(date);

  const { lastInsertRowid } = db.prepare(`
    INSERT INTO cash_closings
      (date, total_sales, cash_total, card_total, transfer_total, transaction_count, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(date, total_sales, cash_total, card_total, transfer_total, transaction_count, notes || null);

  res.status(201).json(db.prepare('SELECT * FROM cash_closings WHERE id = ?').get(lastInsertRowid));
});

module.exports = router;
