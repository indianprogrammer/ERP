const express = require('express');
const { pool, logAudit, requireModule } = require('../lib/middleware');
const router = express.Router();

const tid = (req) => req.tenantId;

router.get('/', requireModule('projects'), async (req, res) => {
  const [rows] = await pool.query(
    `SELECT p.*,
      COALESCE((SELECT SUM(pl.amount) FROM project_links pl WHERE pl.project_id=p.id AND pl.ref_type='SALE' AND pl.tenant_id=?),0) sales,
      COALESCE((SELECT SUM(pl.amount) FROM project_links pl WHERE pl.project_id=p.id AND pl.ref_type='PO' AND pl.tenant_id=?),0) vendor_bills,
      COALESCE((SELECT SUM(e.amount) FROM expenses e WHERE e.project_id=p.id AND e.category<>'Vendor Payment' AND e.tenant_id=?),0) expenses,
      (SELECT COUNT(*) FROM project_links pl WHERE pl.project_id=p.id AND pl.ref_type='SALE' AND pl.tenant_id=?) invoice_count,
      (SELECT COUNT(*) FROM project_links pl WHERE pl.project_id=p.id AND pl.ref_type='PO' AND pl.tenant_id=?) po_count
     FROM projects p WHERE p.tenant_id=? ORDER BY p.id DESC`, [tid(req), tid(req), tid(req), tid(req), tid(req), tid(req)]);
  for (const r of rows) r.profit = Number(r.sales) - Number(r.vendor_bills) - Number(r.expenses);
  res.json({ projects: rows });
});

router.get('/:id', requireModule('projects'), async (req, res) => {
  const [rows] = await pool.query(
    `SELECT p.*,
      COALESCE((SELECT SUM(pl.amount) FROM project_links pl WHERE pl.project_id=p.id AND pl.ref_type='SALE' AND pl.tenant_id=?),0) sales,
      COALESCE((SELECT SUM(pl.amount) FROM project_links pl WHERE pl.project_id=p.id AND pl.ref_type='PO' AND pl.tenant_id=?),0) vendor_bills,
      COALESCE((SELECT SUM(e.amount) FROM expenses e WHERE e.project_id=p.id AND e.category<>'Vendor Payment' AND e.tenant_id=?),0) expenses
     FROM projects p WHERE p.id=? AND p.tenant_id=?`, [tid(req), tid(req), tid(req), req.params.id, tid(req)]);
  if (!rows[0]) return res.status(404).json({ error: 'Project not found' });
  const [links] = await pool.query(
    `SELECT pl.*, CASE pl.ref_type
       WHEN 'SALE' THEN (SELECT CONCAT(d.doc_no,' · ',c.name) FROM sales_documents d JOIN customers c ON c.id=d.customer_id AND c.tenant_id=? WHERE d.id=pl.ref_id AND d.tenant_id=?)
       WHEN 'PO' THEN (SELECT CONCAT(po.po_no,' · ',v.name) FROM purchase_orders po JOIN vendors v ON v.id=po.vendor_id AND v.tenant_id=? WHERE po.id=pl.ref_id AND po.tenant_id=?)
       WHEN 'RECEIPT' THEN (SELECT r.receipt_no FROM receipts r WHERE r.id=pl.ref_id AND r.tenant_id=?)
     END label
     FROM project_links pl WHERE pl.project_id=? AND pl.tenant_id=? ORDER BY pl.id DESC`, [tid(req), tid(req), tid(req), tid(req), tid(req), req.params.id, tid(req)]);
  const [expenses] = await pool.query('SELECT * FROM expenses WHERE project_id=? AND tenant_id=? ORDER BY id DESC', [req.params.id, tid(req)]);
  const p = rows[0];
  p.profit = Number(p.sales) - Number(p.vendor_bills) - Number(p.expenses);
  res.json({ project: p, links, expenses });
});

router.post('/', requireModule('projects', 'can_create'), async (req, res) => {
  const { code, name, client_name, budget, start_date, notes } = req.body;
  if (!code || !name) return res.status(400).json({ error: 'Code and name required' });
  try {
    const [r] = await pool.query('INSERT INTO projects (tenant_id,code,name,client_name,budget,start_date,notes) VALUES (?,?,?,?,?,?,?)',
      [tid(req), code, name, client_name || '', budget || 0, start_date || null, notes || '']);
    await logAudit(req, 'CREATE', 'project', code);
    res.json({ id: r.insertId });
  } catch (e) { res.status(400).json({ error: e.code === 'ER_DUP_ENTRY' ? 'Project code exists' : e.message }); }
});

router.post('/:id/expenses', requireModule('projects', 'can_create'), async (req, res) => {
  const { title, category, amount, expense_date, vendor_id } = req.body;
  if (!title || !amount) return res.status(400).json({ error: 'Title and amount required' });
  const [r] = await pool.query('INSERT INTO expenses (tenant_id,project_id,vendor_id,title,category,amount,expense_date,created_by) VALUES (?,?,?,?,?,?,?,?,?)',
    [tid(req), req.params.id, vendor_id || null, title, category || 'General', amount, expense_date || null, req.session.user.id]);
  await logAudit(req, 'CREATE', 'expense', `${title} ₹${amount}`);
  res.json({ id: r.insertId });
});

router.post('/:id/link', requireModule('projects', 'can_update'), async (req, res) => {
  const { ref_type, ref_id } = req.body;
  let amount = 0;
  if (ref_type === 'SALE') [[{ grand_total: amount }]] = await pool.query('SELECT grand_total FROM sales_documents WHERE id=? AND tenant_id=?', [ref_id, tid(req)]);
  if (ref_type === 'PO') [[{ grand_total: amount }]] = await pool.query('SELECT grand_total FROM purchase_orders WHERE id=? AND tenant_id=?', [ref_id, tid(req)]);
  await pool.query('INSERT IGNORE INTO project_links (tenant_id,project_id,ref_type,ref_id,amount) VALUES (?,?,?,?,?)', [tid(req), req.params.id, ref_type, ref_id, amount]);
  if (ref_type === 'SALE') await pool.query('UPDATE sales_documents SET project_id=? WHERE id=? AND tenant_id=?', [req.params.id, ref_id, tid(req)]);
  if (ref_type === 'PO') await pool.query('UPDATE purchase_orders SET project_id=? WHERE id=? AND tenant_id=?', [req.params.id, ref_id, tid(req)]);
  res.json({ ok: true, amount });
});

router.post('/:id/unlink', requireModule('projects', 'can_update'), async (req, res) => {
  const { ref_type, ref_id } = req.body;
  await pool.query('DELETE FROM project_links WHERE project_id=? AND ref_type=? AND ref_id=? AND tenant_id=?', [req.params.id, ref_type, ref_id, tid(req)]);
  res.json({ ok: true });
});

module.exports = router;
