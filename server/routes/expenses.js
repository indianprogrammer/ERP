const express = require('express');
const { pool, logAudit, requireModule } = require('../lib/middleware');
const router = express.Router();

const tid = (req) => req.tenantId;

router.get('/', requireModule('projects'), async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM expenses WHERE tenant_id=? ORDER BY id DESC LIMIT 100', [tid(req)]);
  res.json({ expenses: rows });
});
router.post('/', requireModule('projects', 'can_create'), async (req, res) => {
  const { project_id, vendor_id, title, category, amount, expense_date, notes } = req.body;
  if (!title || !amount) return res.status(400).json({ error: 'Title and amount required' });
  const [r] = await pool.query('INSERT INTO expenses (tenant_id,project_id,vendor_id,title,category,amount,expense_date,notes,created_by) VALUES (?,?,?,?,?,?,?,?,?)',
    [tid(req), project_id || null, vendor_id || null, title, category || 'General', amount, expense_date || null, notes || '', req.session.user.id]);
  await logAudit(req, 'CREATE', 'expense', title);
  res.json({ id: r.insertId });
});
module.exports = router;
