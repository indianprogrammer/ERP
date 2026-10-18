const express = require('express');
const { pool, logAudit, requireModule } = require('../lib/middleware');
const router = express.Router();

const tid = (req) => req.tenantId;

router.get('/', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM customers WHERE tenant_id=? AND is_active=1 ORDER BY name', [tid(req)]);
  res.json({ customers: rows });
});
router.get('/:id', async (req, res) => {
  const [[c]] = await pool.query('SELECT * FROM customers WHERE id=? AND tenant_id=?', [req.params.id, tid(req)]);
  if (!c) return res.status(404).json({ error: 'Customer not found' });
  res.json({ customer: c });
});
router.post('/', requireModule('sales', 'can_create'), async (req, res) => {
  const c = req.body;
  if (!c.name) return res.status(400).json({ error: 'Customer name required' });
  const [r] = await pool.query(
    'INSERT INTO customers (tenant_id,name,gstin,pan,contact_person,phone,email,address,state_code,place_of_supply,payment_terms) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    [tid(req), c.name, c.gstin || null, c.pan || null, c.contact_person || '', c.phone || '', c.email || '', c.address || '', c.state_code || '27', c.place_of_supply || 'Maharashtra', c.payment_terms || 'Net 30']);
  await logAudit(req, 'CREATE', 'customer', c.name);
  res.json({ id: r.insertId });
});
router.put('/:id', requireModule('sales', 'can_update'), async (req, res) => {
  const c = req.body;
  await pool.query(
    'UPDATE customers SET name=?,gstin=?,pan=?,contact_person=?,phone=?,email=?,address=?,state_code=?,place_of_supply=?,payment_terms=? WHERE id=? AND tenant_id=?',
    [c.name, c.gstin || null, c.pan || null, c.contact_person || '', c.phone || '', c.email || '', c.address || '', c.state_code || '27', c.place_of_supply || 'Maharashtra', c.payment_terms || '', req.params.id, tid(req)]);
  await logAudit(req, 'UPDATE', 'customer', c.name);
  res.json({ ok: true });
});
module.exports = router;
