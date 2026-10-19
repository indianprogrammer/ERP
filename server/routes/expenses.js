const express = require('express');
const { pool, logAudit, requireModule, authUser } = require('../lib/middleware');
const router = express.Router();

const tid = (req) => req.tenantId;

// GET /api/expenses?project_id=&type=project|individual&month=YYYY-MM&q=
// Expenses are either project-based (project_id set) or individual (project_id NULL).
router.get('/', requireModule('projects'), async (req, res) => {
  let where = 'e.tenant_id=?', p = [tid(req)];
  if (req.query.project_id) { where += ' AND e.project_id=?'; p.push(Number(req.query.project_id)); }
  if (req.query.type === 'project') where += ' AND e.project_id IS NOT NULL';
  if (req.query.type === 'individual') where += ' AND e.project_id IS NULL';
  if (req.query.month && /^\d{4}-\d{2}$/.test(req.query.month)) {
    where += " AND DATE_FORMAT(COALESCE(e.expense_date, e.created_at),'%Y-%m')=?";
    p.push(req.query.month);
  }
  if (req.query.q) { where += ' AND (e.title LIKE ? OR e.notes LIKE ? OR e.category LIKE ?)'; const like = `%${req.query.q}%`; p.push(like, like, like); }
  const [rows] = await pool.query(
    `SELECT e.*, pr.code project_code, pr.name project_name, u.full_name created_by_name
     FROM expenses e
     LEFT JOIN projects pr ON pr.id=e.project_id AND pr.tenant_id=e.tenant_id
     LEFT JOIN users u ON u.id=e.created_by
     WHERE ${where}
     ORDER BY COALESCE(e.expense_date, e.created_at) DESC, e.id DESC LIMIT 500`, p);
  const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const projectTotal = rows.filter(r => r.project_id).reduce((s, r) => s + Number(r.amount || 0), 0);
  res.json({
    expenses: rows,
    total,
    project_total: projectTotal,
    individual_total: total - projectTotal
  });
});

// POST /api/expenses — project-based when project_id provided, individual otherwise
router.post('/', requireModule('projects', 'can_create'), async (req, res) => {
  const { project_id, vendor_id, title, category, amount, expense_date, notes } = req.body;
  if (!title || !amount) return res.status(400).json({ error: 'Title and amount required' });
  if (Number(amount) <= 0) return res.status(400).json({ error: 'Amount must be greater than 0' });
  let pid = project_id ? Number(project_id) : null;
  if (pid) {
    const [[pr]] = await pool.query('SELECT id FROM projects WHERE id=? AND tenant_id=?', [pid, tid(req)]);
    if (!pr) return res.status(400).json({ error: 'Project not found' });
  }
  const [r] = await pool.query(
    'INSERT INTO expenses (tenant_id,project_id,vendor_id,title,category,amount,expense_date,notes,created_by) VALUES (?,?,?,?,?,?,?,?,?)',
    [tid(req), pid, vendor_id || null, title, category || 'General', amount, expense_date || null, notes || '', authUser(req).id]);
  await logAudit(req, 'CREATE', 'expense', `${title} (${pid ? 'project' : 'individual'}) ₹${amount}`);
  res.json({ id: r.insertId });
});

// DELETE /api/expenses/:id
router.delete('/:id', requireModule('projects', 'can_delete'), async (req, res) => {
  const [[e]] = await pool.query('SELECT id, title FROM expenses WHERE id=? AND tenant_id=?', [req.params.id, tid(req)]);
  if (!e) return res.status(404).json({ error: 'Expense not found' });
  await pool.query('DELETE FROM expenses WHERE id=? AND tenant_id=?', [req.params.id, tid(req)]);
  await logAudit(req, 'DELETE', 'expense', e.title);
  res.json({ ok: true });
});

module.exports = router;
