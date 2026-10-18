const express = require('express');
const bcrypt = require('bcryptjs');
const { pool, logAudit, requireModule } = require('../lib/middleware');
const router = express.Router();

const MODULES = ['procurement', 'sales', 'inventory', 'crm', 'projects', 'gst', 'admin'];
const tid = (req) => req.tenantId;

router.get('/roles', requireModule('admin'), async (req, res) => {
  const [roles] = await pool.query('SELECT * FROM staff_roles WHERE tenant_id=? ORDER BY id', [tid(req)]);
  const [perms] = await pool.query('SELECT rp.* FROM role_permissions rp JOIN staff_roles sr ON sr.id=rp.role_id WHERE sr.tenant_id=?', [tid(req)]);
  res.json({ roles, perms });
});

router.get('/users', requireModule('admin'), async (req, res) => {
  const [rows] = await pool.query(
    'SELECT u.id,u.username,u.full_name,u.email,u.is_active,u.must_change_password,u.last_login,r.name role FROM users u LEFT JOIN staff_roles r ON r.id=u.role_id WHERE u.tenant_id=? ORDER BY u.id', [tid(req)]);
  res.json({ users: rows });
});

router.post('/users', requireModule('admin', 'can_create'), async (req, res) => {
  const { username, password, full_name, email, role_id } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password min 6 chars' });
  try {
    const hash = bcrypt.hashSync(password, 10);
    const [r] = await pool.query('INSERT INTO users (tenant_id,username,password_hash,full_name,email,role_id) VALUES (?,?,?,?,?,?)',
      [tid(req), username, hash, full_name || username, email || null, role_id || null]);
    await logAudit(req, 'CREATE', 'user', username);
    res.json({ id: r.insertId });
  } catch (e) { res.status(400).json({ error: e.code === 'ER_DUP_ENTRY' ? 'Username taken' : e.message }); }
});

router.put('/users/:id', requireModule('admin', 'can_update'), async (req, res) => {
  const { full_name, email, role_id, is_active, reset_password } = req.body;
  await pool.query('UPDATE users SET full_name=?, email=?, role_id=?, is_active=?, must_change_password=IF(?=1,1,must_change_password) WHERE id=? AND tenant_id=?',
    [full_name || '', email || null, role_id || null, is_active ? 1 : 0, reset_password ? 1 : 0, req.params.id, tid(req)]);
  if (reset_password) {
    const hash = bcrypt.hashSync('changeme123', 10);
    await pool.query('UPDATE users SET password_hash=? WHERE id=? AND tenant_id=?', [hash, req.params.id, tid(req)]);
  }
  await logAudit(req, 'UPDATE', 'user', req.params.id);
  res.json({ ok: true });
});

router.post('/roles', requireModule('admin', 'can_create'), async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Role name required' });
  const [r] = await pool.query('INSERT INTO staff_roles (tenant_id,name,description) VALUES (?,?,?)', [tid(req), name, description || '']);
  for (const m of MODULES) await pool.query('INSERT INTO role_permissions (role_id,module,can_read) VALUES (?,?,1)', [r.insertId, m]);
  await logAudit(req, 'CREATE', 'role', name);
  res.json({ id: r.insertId });
});

router.put('/roles/:id/permissions', requireModule('admin', 'can_update'), async (req, res) => {
  const perms = req.body.perms || {};
  for (const m of MODULES) {
    const p = perms[m] || {};
    await pool.query(
      `INSERT INTO role_permissions (role_id,module,can_create,can_read,can_update,can_delete,can_export,can_approve) VALUES (?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE can_create=VALUES(can_create), can_read=VALUES(can_read), can_update=VALUES(can_update),
       can_delete=VALUES(can_delete), can_export=VALUES(can_export), can_approve=VALUES(can_approve)`,
      [req.params.id, m, p.can_create ? 1 : 0, p.can_read ? 1 : 0, p.can_update ? 1 : 0, p.can_delete ? 1 : 0, p.can_export ? 1 : 0, p.can_approve ? 1 : 0]);
  }
  await logAudit(req, 'PERMISSIONS', 'role', req.params.id);
  res.json({ ok: true });
});

router.get('/audit', requireModule('admin'), async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM audit_logs WHERE tenant_id=? ORDER BY id DESC LIMIT 200', [tid(req)]);
  res.json({ logs: rows });
});

module.exports = router;
