const express = require('express');
const { pool, logAudit, requireModule } = require('../lib/middleware');
const router = express.Router();

const tid = (req) => req.tenantId;

router.get('/', requireModule('procurement'), async (req, res) => {
  const [rows] = await pool.query(
    `SELECT w.*, i.sku, i.name item_name, p.po_no FROM warranties w
     LEFT JOIN items i ON i.id=w.item_id AND i.tenant_id=? LEFT JOIN purchase_orders p ON p.id=w.po_id AND p.tenant_id=?
     WHERE w.tenant_id=? ORDER BY w.warranty_end IS NULL, w.warranty_end`, [tid(req), tid(req), tid(req)]);
  const [alerts] = await pool.query(
    `SELECT w.*, i.name item_name FROM warranties w LEFT JOIN items i ON i.id=w.item_id AND i.tenant_id=?
     WHERE w.tenant_id=? AND w.warranty_end BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)`, [tid(req), tid(req)]);
  res.json({ warranties: rows, alerts });
});

router.post('/', requireModule('procurement', 'can_create'), async (req, res) => {
  const { item_id, po_id, serial_no, customer_name, warranty_start, warranty_end, notes } = req.body;
  if (!serial_no) return res.status(400).json({ error: 'Serial number required' });
  try {
    const [r] = await pool.query(
      'INSERT INTO warranties (tenant_id,item_id,po_id,serial_no,customer_name,warranty_start,warranty_end,notes) VALUES (?,?,?,?,?,?,?,?)',
      [tid(req), item_id || null, po_id || null, serial_no, customer_name || '', warranty_start || null, warranty_end || null, notes || '']);
    await logAudit(req, 'CREATE', 'warranty', serial_no);
    res.json({ id: r.insertId });
  } catch (e) { res.status(400).json({ error: e.code === 'ER_DUP_ENTRY' ? 'Serial number already exists' : e.message }); }
});

router.put('/:id', requireModule('procurement', 'can_update'), async (req, res) => {
  const { customer_name, warranty_start, warranty_end, status, notes } = req.body;
  await pool.query('UPDATE warranties SET customer_name=?,warranty_start=?,warranty_end=?,status=?,notes=? WHERE id=? AND tenant_id=?',
    [customer_name || '', warranty_start || null, warranty_end || null, status || 'Active', notes || '', req.params.id, tid(req)]);
  res.json({ ok: true });
});
module.exports = router;
