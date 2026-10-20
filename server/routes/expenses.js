const express = require('express');
const fs = require('fs');
const path = require('path');
const { pool, logAudit, requireModule, authUser } = require('../lib/middleware');
const router = express.Router();

const tid = (req) => req.tenantId;
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'data', 'uploads', 'expenses');
const ALLOWED_EXT = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt'];
const TYPES = { '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.txt': 'text/plain' };

function safeName(s) { return String(s || '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80); }

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
  const { project_id, vendor_id, title, category, amount, expense_date, notes, attachment } = req.body;
  if (!title || !amount) return res.status(400).json({ error: 'Title and amount required' });
  if (Number(amount) <= 0) return res.status(400).json({ error: 'Amount must be greater than 0' });
  let pid = project_id ? Number(project_id) : null;
  if (pid) {
    const [[pr]] = await pool.query('SELECT id FROM projects WHERE id=? AND tenant_id=?', [pid, tid(req)]);
    if (!pr) return res.status(400).json({ error: 'Project not found' });
  }
  const [r] = await pool.query(
    'INSERT INTO expenses (tenant_id,project_id,vendor_id,title,category,amount,expense_date,notes,attachment,created_by) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [tid(req), pid, vendor_id || null, title, category || 'General', amount, expense_date || new Date().toISOString().slice(0, 10), notes || '', attachment || null, authUser(req).id]);
  await logAudit(req, 'CREATE', 'expense', `${title} (${pid ? 'project' : 'individual'}) ₹${amount}`);
  res.json({ id: r.insertId });
});

// POST /api/expenses/upload — multipart voucher/invoice upload (returns stored filename)
router.post('/upload', requireModule('projects', 'can_create'), async (req, res) => {
  try {
    if (typeof req.headers['content-type'] !== 'string' || !req.headers['content-type'].includes('multipart/form-data')) {
      return res.status(415).json({ error: 'Expected a multipart/form-data upload' });
    }
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 10 * 1024 * 1024) return res.status(413).json({ error: 'File too large (max 10 MB)' });
      chunks.push(chunk);
    }
    const raw = Buffer.concat(chunks);
    const ct = req.headers['content-type'];
    const bm = /boundary="?([^";]+)"?/i.exec(ct);
    if (!bm) return res.status(400).json({ error: 'Malformed upload' });
    const boundary = Buffer.from('--' + bm[1]);
    let pos = raw.indexOf(boundary);
    if (pos < 0) return res.status(400).json({ error: 'Malformed upload' });
    pos += boundary.length;
    // skip CRLF after boundary
    while (pos < raw.length && (raw[pos] === 13 || raw[pos] === 10)) pos++;
    const headEnd = raw.indexOf('\r\n\r\n', pos);
    if (headEnd < 0) return res.status(400).json({ error: 'Malformed upload' });
    const headers = raw.slice(pos, headEnd).toString('latin1');
    const dataStart = headEnd + 4;
    const nextBoundary = raw.indexOf(boundary, dataStart);
    if (nextBoundary < 0) return res.status(400).json({ error: 'Malformed upload' });
    let dataEnd = nextBoundary;
    if (raw[dataEnd - 2] === 13 && raw[dataEnd - 1] === 10) dataEnd -= 2;
    const data = raw.slice(dataStart, dataEnd);
    if (!data.length) return res.status(400).json({ error: 'Empty file' });
    const fn = /filename="([^"]*)"/i.exec(headers);
    const ext = path.extname(fn ? fn[1] : '').toLowerCase() || '.bin';
    if (!ALLOWED_EXT.includes(ext)) return res.status(400).json({ error: 'Unsupported file type ' + ext });
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const stored = `${tid(req)}_${Date.now()}_${safeName(fn ? fn[1] : 'file' + ext)}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, stored), data);
    await logAudit(req, 'UPLOAD', 'expense_attachment', `${stored} (${data.length}b)`);
    res.json({ attachment: stored, name: fn ? fn[1] : stored, size: data.length });
  } catch (e) {
    res.status(500).json({ error: 'Upload failed: ' + e.message });
  }
});

function attachmentRow(req, id) {
  return pool.query('SELECT title, attachment FROM expenses WHERE id=? AND tenant_id=?', [id, tid(req)]).then(([rows]) => rows[0]);
}

// GET /api/expenses/:id/attachment — stream the uploaded voucher / invoice
router.get('/:id/attachment', requireModule('projects'), async (req, res) => {
  const e = await attachmentRow(req, req.params.id);
  if (!e) return res.status(404).json({ error: 'Expense not found' });
  if (!e.attachment) return res.status(404).json({ error: 'No document attached' });
  const file = path.join(UPLOAD_DIR, path.basename(e.attachment));
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'File missing on server' });
  const ext = path.extname(file).toLowerCase();
  const inline = ['image/', 'application/pdf', 'text/'].some(t => (TYPES[ext] || '').startsWith(t));
  res.setHeader('Content-Type', TYPES[ext] || 'application/octet-stream');
  res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${safeName(e.attachment)}"`);
  fs.createReadStream(file).pipe(res);
});

// DELETE /api/expenses/:id/attachment
router.delete('/:id/attachment', requireModule('projects', 'can_delete'), async (req, res) => {
  const e = await attachmentRow(req, req.params.id);
  if (!e) return res.status(404).json({ error: 'Expense not found' });
  if (e.attachment) {
    const file = path.join(UPLOAD_DIR, path.basename(e.attachment));
    try { fs.unlinkSync(file); } catch { }
    await pool.query('UPDATE expenses SET attachment=NULL WHERE id=? AND tenant_id=?', [req.params.id, tid(req)]);
    await logAudit(req, 'DELETE_ATTACHMENT', 'expense', e.attachment);
  }
  res.json({ ok: true });
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
