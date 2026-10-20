const express = require('express');
const { pool } = require('../lib/middleware');
const router = express.Router();

// Global HSN/SAC reference master — read-only lookup used by item & billing forms.
// Reference data is shared across tenants (same CBIC classifications apply everywhere),
// so GET is open to any authenticated tenant user — same policy as /api/items.
router.get('/', async (req, res) => {
  const q = String(req.query.q || '').trim();
  const type = ['HSN', 'SAC'].includes(String(req.query.type).toUpperCase()) ? String(req.query.type).toUpperCase() : null;
  const rate = req.query.rate !== undefined && req.query.rate !== '' ? Number(req.query.rate) : null;
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const where = [], p = [];
  if (q) { where.push('(code LIKE ? OR description LIKE ?)'); p.push(q + '%', '%' + q + '%'); }
  if (type) { where.push('type = ?'); p.push(type); }
  if (rate !== null && !Number.isNaN(rate)) { where.push('gst_rate = ?'); p.push(rate); }
  const w = where.length ? ' WHERE ' + where.join(' AND ') : '';
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) total FROM hsn_sac_master${w}`, p);
  const [rows] = await pool.query(
    `SELECT id, code, description, type, gst_rate FROM hsn_sac_master${w}
     ORDER BY LENGTH(code), code LIMIT ? OFFSET ?`,
    [...p, limit, (page - 1) * limit]);
  const [rates] = await pool.query('SELECT DISTINCT gst_rate FROM hsn_sac_master ORDER BY gst_rate');
  res.json({
    rows, total, page, limit,
    rates: rates.map(r => Number(r.gst_rate)),
    source: 'CBIC HSN/SAC master (public dataset, MIT) — GST rates per Council notifications'
  });
});

module.exports = router;
