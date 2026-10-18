const express = require('express');
const { pool, logAudit, requireModule } = require('../lib/middleware');
const router = express.Router();

const tid = (req) => req.tenantId;

router.get('/', requireModule('procurement'), async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM vendors WHERE tenant_id=? ORDER BY name', [tid(req)]);
  res.json({ vendors: rows });
});
router.get('/:id', requireModule('procurement'), async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM vendors WHERE id=? AND tenant_id=?', [req.params.id, tid(req)]);
  if (!rows[0]) return res.status(404).json({ error: 'Vendor not found' });
  res.json({ vendor: rows[0] });
});
router.post('/', requireModule('procurement', 'can_create'), async (req, res) => {
  const v = req.body;
  if (!v.name) return res.status(400).json({ error: 'Vendor name required' });
  const [r] = await pool.query(
    'INSERT INTO vendors (tenant_id,name,gstin,pan,contact_person,phone,email,address,bank_details,payment_terms,hsn_sac) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    [tid(req), v.name, v.gstin || null, v.pan || null, v.contact_person || '', v.phone || '', v.email || '', v.address || '', v.bank_details || '', v.payment_terms || 'Net 30', v.hsn_sac || '']);
  await logAudit(req, 'CREATE', 'vendor', v.name);
  res.json({ id: r.insertId });
});
router.put('/:id', requireModule('procurement', 'can_update'), async (req, res) => {
  const v = req.body;
  await pool.query(
    'UPDATE vendors SET name=?,gstin=?,pan=?,contact_person=?,phone=?,email=?,address=?,bank_details=?,payment_terms=?,hsn_sac=?,is_active=? WHERE id=? AND tenant_id=?',
    [v.name, v.gstin || null, v.pan || null, v.contact_person || '', v.phone || '', v.email || '', v.address || '', v.bank_details || '', v.payment_terms || '', v.hsn_sac || '', v.is_active ? 1 : 0, req.params.id, tid(req)]);
  await logAudit(req, 'UPDATE', 'vendor', v.name);
  res.json({ ok: true });
});
router.delete('/:id', requireModule('procurement', 'can_delete'), async (req, res) => {
  await pool.query('UPDATE vendors SET is_active=0 WHERE id=? AND tenant_id=?', [req.params.id, tid(req)]);
  await logAudit(req, 'DEACTIVATE', 'vendor', req.params.id);
  res.json({ ok: true });
});
module.exports = router;
