const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/summary', (_req, res) => {
  const today = new Date().toISOString().split('T')[0];

  const todayRow  = db.prepare(`SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total FROM sales WHERE DATE(created_at)=?`).get(today);
  const weekRow   = db.prepare(`SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total FROM sales WHERE DATE(created_at)>=DATE('now','-7 days')`).get();
  const monthRow  = db.prepare(`SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total FROM sales WHERE strftime('%Y-%m',created_at)=strftime('%Y-%m','now')`).get();
  const products  = db.prepare(`SELECT COUNT(*) as count FROM products`).get();
  const lowStock  = db.prepare(`SELECT COUNT(*) as count FROM products WHERE stock < 5`).get();

  res.json({
    today: todayRow,
    week:  weekRow,
    month: monthRow,
    products: products.count,
    low_stock: lowStock.count,
  });
});

router.get('/daily', (_req, res) => {
  res.json(db.prepare(`
    SELECT DATE(created_at) as date, COUNT(*) as sales_count, SUM(total) as total
    FROM sales
    WHERE DATE(created_at) >= DATE('now','-30 days')
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `).all());
});

router.get('/top-products', (req, res) => {
  const days = parseInt(req.query.days) || 30;
  res.json(db.prepare(`
    SELECT si.product_name, SUM(si.quantity) as qty, SUM(si.subtotal) as revenue
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    WHERE DATE(s.created_at) >= DATE('now', '-${days} days')
    GROUP BY si.product_name
    ORDER BY revenue DESC
    LIMIT 10
  `).all());
});

module.exports = router;
