const express = require('express');
const bcrypt = require('bcryptjs');
const { pool, logAudit, requireAuth } = require('../lib/middleware');

const router = express.Router();

async function loadUserPerms(userId, roleId) {
  const [rows] = await pool.query('SELECT module, can_create, can_read, can_update, can_delete, can_export, can_approve FROM role_permissions WHERE role_id=?', [roleId]);
  const perms = {};
  for (const r of rows) perms[r.module] = r;
  return perms;
}

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const [rows] = await pool.query(
    `SELECT u.*, r.name AS role FROM users u LEFT JOIN staff_roles r ON r.id=u.role_id WHERE u.username=? AND u.is_active=1`, [username]);
  const u = rows[0];
  if (!u || !bcrypt.compareSync(password, u.password_hash)) {
    await logAudit(req, 'LOGIN_FAIL', 'auth', `user=${username}`);
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const perms = await loadUserPerms(u.id, u.role_id);
  req.session.user = {
    id: u.id, username: u.username, fullName: u.full_name, role: u.role || 'Staff',
    mustChangePassword: !!u.must_change_password, perms
  };
  await pool.query('UPDATE users SET last_login=NOW() WHERE id=?', [u.id]);
  await logAudit(req, 'LOGIN', 'auth', `user=${username}`);
  res.json({ user: req.session.user });
});

router.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const u = req.session.user;
  const [rows] = await pool.query('SELECT password_hash FROM users WHERE id=?', [u.id]);
  if (!rows[0] || !bcrypt.compareSync(currentPassword || '', rows[0].password_hash)) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
  const hash = bcrypt.hashSync(newPassword, 10);
  await pool.query('UPDATE users SET password_hash=?, must_change_password=0 WHERE id=?', [hash, u.id]);
  req.session.user.mustChangePassword = false;
  await logAudit(req, 'PASSWORD_CHANGE', 'auth', `user=${u.username}`);
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  if (!req.session?.user) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ user: req.session.user });
});

router.post('/logout', (req, res) => {
  const uname = req.session?.user?.username;
  req.session.destroy(() => {
    res.json({ ok: true });
    if (uname) logAudit({ session: { user: { username: uname } }, ip: req.ip }, 'LOGOUT', 'auth', '');
  });
});

module.exports = router;
