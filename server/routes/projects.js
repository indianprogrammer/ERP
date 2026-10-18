const express = require('express');
const { pool, logAudit, requireModule } = require('../lib/middleware');
const router = express.Router();

router.get('/', requireModule('projects'), async (req, res) => {
  const [rows] = await pool.query(
    `SELECT p.*,
      COALESCE((SELECT SUM(pl.amount) FROM project_links pl WHERE pl.project_id=p.id AND pl.ref_type='SALE'),0) sales,
      COALESCE((SELECT SUM(pl.amount) FROM project_links pl WHERE pl.project_id=p.id AND pl.ref_type='PO'),0) vendor_bills,
      COALESCE((SELECT SUM(e.amount) FROM expenses e WHERE e.project_id=p.id AND e.category<>'Vendor Payment'),0) expenses,
      (SELECT COUNT(*) FROM project_links pl WHERE pl.project_id=p.id AND pl.ref_type='SALE') invoice_count,
      (SELECT COUNT(*) FROM project_links pl WHERE pl.project_id=p.id AND pl.ref_type='PO') po_count
     FROM projects p ORDER BY p.id DESC`);
  for (const r of rows) r.profit = Number(r.sales) - Number(r.vendor_bills) - Number(r.expenses);
  res.json({ projects: rows });
});

router.get('/:id', requireModule('projects'), async (req, res) => {
  const [rows] = await pool.query(
    `SELECT p.*,
      COALESCE((SELECT SUM(pl.amount) FROM project_links pl WHERE pl.project_id=p.id AND pl.ref_type='SALE'),0) sales,
      COALESCE((SELECT SUM(pl.amount) FROM project_links pl WHERE pl.project_id=p.id AND pl.ref_type='PO'),0) vendor_bills,
      COALESCE((SELECT SUM(e.amount) FROM expenses e WHERE e.project_id=p.id AND e.category<>'Vendor Payment'),0) expenses
     FROM projects p WHERE p.id=?`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Project not found' });
  const [links] = await pool.query(
    `SELECT pl.*, CASE pl.ref_type
       WHEN 'SALE' THEN (SELECT CONCAT(d.doc_no,' · ',c.name) FROM sales_documents d JOIN customers c ON c.id=d.customer_id WHERE d.id=pl.ref_id)
       WHEN 'PO' THEN (SELECT CONCAT(po.po_no,' · ',v.name) FROM purchase_orders po JOIN vendors v ON v.id=po.vendor_id WHERE po.id=pl.ref_id)
       WHEN 'RECEIPT' THEN (SELECT r.receipt_no FROM receipts r WHERE r.id=pl.ref_id)
     END label
     FROM project_links pl WHERE pl.project_id=? ORDER BY pl.id DESC`, [req.params.id]);
  const [expenses] = await pool.query('SELECT * FROM expenses WHERE project_id=? ORDER BY id DESC', [req.params.id]);
  const p = rows[0];
  p.profit = Number(p.sales) - Number(p.vendor_bills) - Number(p.expenses);
  res.json({ project: p, links, expenses });
});

router.post('/', requireModule('projects', 'can_create'), async (req, res) => {
  const { code, name, client_name, budget, start_date, notes } = req.body;
  if (!code || !name) return res.status(400).json({ error: 'Code and name required' });
  try {
    const [r] = await pool.query('INSERT INTO projects (code,name,client_name,budget,start_date,notes) VALUES (?,?,?,?,?,?)',
      [code, name, client_name || '', budget || 0, start_date || null, notes || '']);
    await logAudit(req, 'CREATE', 'project', code);
    res.json({ id: r.insertId });
  } catch (e) { res.status(400).json({ error: e.code === 'ER_DUP_ENTRY' ? 'Project code exists' : e.message }); }
});

// direct expense against project
router.post('/:id/expenses', requireModule('projects', 'can_create'), async (req, res) => {
  const { title, category, amount, expense_date, vendor_id } = req.body;
  if (!title || !amount) return res.status(400).json({ error: 'Title and amount required' });
  const [r] = await pool.query('INSERT INTO expenses (project_id,vendor_id,title,category,amount,expense_date,created_by) VALUES (?,?,?,?,?,?,?)',
    [req.params.id, vendor_id || null, title, category || 'General', amount, expense_date || null, req.session.user.id]);
  await logAudit(req, 'CREATE', 'expense', `${title} ₹${amount}`);
  res.json({ id: r.insertId });
});

// manually link existing doc
router.post('/:id/link', requireModule('projects', 'can_update'), async (req, res) => {
  const { ref_type, ref_id } = req.body;
  let amount = 0;
  if (ref_type === 'SALE') [[{ grand_total: amount }]] = await pool.query('SELECT grand_total FROM sales_documents WHERE id=?', [ref_id]);
  if (ref_type === 'PO') [[{ grand_total: amount }]] = await pool.query('SELECT grand_total FROM purchase_orders WHERE id=?', [ref_id]);
  await pool.query('INSERT IGNORE INTO project_links (project_id,ref_type,ref_id,amount) VALUES (?,?,?,?)', [req.params.id, ref_type, ref_id, amount]);
  if (ref_type === 'SALE') await pool.query('UPDATE sales_documents SET project_id=? WHERE id=?', [req.params.id, ref_id]);
  if (ref_type === 'PO') await pool.query('UPDATE purchase_orders SET project_id=? WHERE id=?', [req.params.id, ref_id]);
  res.json({ ok: true, amount });
});

router.post('/:id/unlink', requireModule('projects', 'can_update'), async (req, res) => {
  const { ref_type, ref_id } = req.body;
  await pool.query('DELETE FROM project_links WHERE project_id=? AND ref_type=? AND ref_id=?', [req.params.id, ref_type, ref_id]);
  res.json({ ok: true });
});

module.exports = router;
