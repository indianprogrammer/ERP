const express = require('express');
const bcrypt = require('bcryptjs');
const { pool, logAudit, requireAuth, loadTenantUser } = require('../lib/middleware');
const { signAccessToken, signRefreshToken, verifyRefreshToken, ACCESS_TTL } = require('../lib/tokens');
const { resolveTenant, tenantScope } = require('../lib/tenant');

const router = express.Router();

async function loadUserPerms(userId, roleId) {
  const [rows] = await pool.query('SELECT module, can_create, can_read, can_update, can_delete, can_export, can_approve FROM role_permissions WHERE role_id=?', [roleId]);
  const perms = {};
  for (const r of rows) perms[r.module] = r;
  return perms;
}

// --- Public: resolve tenant slug from header/body for status check ---
router.get('/tenant/:slug', async (req, res) => {
  const [rows] = await pool.query('SELECT id,name,slug,plan,status,trial_ends_at,subscription_ends_at FROM tenants WHERE slug=?', [req.params.slug]);
  if (!rows[0]) return res.status(404).json({ error: 'Organization not found' });
  res.json({ tenant: rows[0] });
});

// --- Login (tenant-scoped) ---
router.post('/login', async (req, res) => {
  const { username, password, tenantSlug } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  let tenantId = null;
  if (tenantSlug) {
    const [trows] = await pool.query('SELECT id,status FROM tenants WHERE slug=?', [tenantSlug]);
    if (!trows[0]) return res.status(404).json({ error: 'Organization not found' });
    if (trows[0].status !== 'active' && trows[0].status !== 'trial') {
      return res.status(403).json({ error: 'Organization account is not active' });
    }
    tenantId = trows[0].id;
  } else if (req.tenant) {
    // Subdomain login (e.g. acme.localhost:3000) — scope to resolved tenant
    if (req.tenant.status !== 'active' && req.tenant.status !== 'trial') {
      return res.status(403).json({ error: 'Organization account is not active' });
    }
    tenantId = req.tenant.id;
  } else {
    // Bare-domain login: allow only super admins (tenant_id NULL)
    const [rows] = await pool.query(
      `SELECT u.*, r.name AS role FROM users u LEFT JOIN staff_roles r ON r.id=u.role_id WHERE u.username=? AND u.tenant_id IS NULL AND u.is_active=1`,
      [username]
    );
    const u = rows[0];
    if (!u || !bcrypt.compareSync(password, u.password_hash)) {
      await logAudit(req, 'LOGIN_FAIL', 'auth', `user=${username}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    req.session.user = {
      id: u.id, username: u.username, fullName: u.full_name, role: u.role || 'Super Admin',
      tenant_id: null, isSuperAdmin: true, mustChangePassword: !!u.must_change_password, perms: {}
    };
    await pool.query('UPDATE users SET last_login=NOW() WHERE id=?', [u.id]);
    await logAudit(req, 'LOGIN', 'auth', `user=${username} (super admin)`);
    return res.json({ user: req.session.user, tenant: null });
  }

  const [rows] = await pool.query(
    `SELECT u.*, r.name AS role FROM users u LEFT JOIN staff_roles r ON r.id=u.role_id
     WHERE u.username=? AND u.tenant_id=? AND u.is_active=1`,
    [username, tenantId]
  );
  const u = rows[0];
  if (!u || !bcrypt.compareSync(password, u.password_hash)) {
    await logAudit(req, 'LOGIN_FAIL', 'auth', `user=${username} tenant=${tenantId}`);
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const perms = await loadUserPerms(u.id, u.role_id);
  req.session.user = {
    id: u.id, username: u.username, fullName: u.full_name, role: u.role || 'Staff',
    tenant_id: u.tenant_id, isSuperAdmin: false, mustChangePassword: !!u.must_change_password, perms
  };
  await pool.query('UPDATE users SET last_login=NOW() WHERE id=?', [u.id]);
  await logAudit(req, 'LOGIN', 'auth', `user=${username} tenant=${tenantId}`);
  const [trows] = await pool.query('SELECT id,name,slug,plan,status FROM tenants WHERE id=?', [tenantId]);
  res.json({ user: req.session.user, tenant: trows[0] });
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

router.get('/me', requireAuth, async (req, res) => {
  if (!req.session?.user) return res.status(401).json({ error: 'Not authenticated' });
  let user = req.session.user;
  if (user.tenant_id) {
    const [trows] = await pool.query('SELECT id,name,slug,plan,status FROM tenants WHERE id=?', [user.tenant_id]);
    if (trows[0]) user.tenant = trows[0];
  } else {
    user.isSuperAdmin = true;
  }
  res.json({ user });
});

router.post('/logout', (req, res) => {
  const uname = req.session?.user?.username;
  req.session.destroy(() => {
    res.json({ ok: true });
    if (uname) logAudit({ session: { user: { username: uname } }, ip: req.ip }, 'LOGOUT', 'auth', '');
  });
});

// --- API tokens (Bearer JWT for mobile app, MCP server, external clients) ---
// Tenant users only. Super-admin accounts (tenant_id NULL) cannot obtain tokens.

router.post('/token', async (req, res) => {
  const { username, password, tenantSlug } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  let tenantId = null;
  if (tenantSlug) {
    const [trows] = await pool.query('SELECT id,status FROM tenants WHERE slug=?', [tenantSlug]);
    if (!trows[0]) return res.status(404).json({ error: 'Organization not found' });
    if (trows[0].status !== 'active' && trows[0].status !== 'trial') {
      return res.status(403).json({ error: 'Organization account is not active' });
    }
    tenantId = trows[0].id;
  } else if (req.tenant) {
    if (req.tenant.status !== 'active' && req.tenant.status !== 'trial') {
      return res.status(403).json({ error: 'Organization account is not active' });
    }
    tenantId = req.tenant.id;
  } else {
    return res.status(400).json({ error: 'tenantSlug is required' });
  }

  const [rows] = await pool.query(
    `SELECT u.*, r.name AS role FROM users u LEFT JOIN staff_roles r ON r.id=u.role_id
     WHERE u.username=? AND u.tenant_id=? AND u.is_active=1`,
    [username, tenantId]
  );
  const u = rows[0];
  if (!u || !bcrypt.compareSync(password, u.password_hash)) {
    await logAudit(req, 'LOGIN_FAIL', 'auth', `token user=${username} tenant=${tenantId}`);
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  if (u.must_change_password) {
    return res.status(403).json({ error: 'PASSWORD_CHANGE_REQUIRED', mustChange: true });
  }
  const user = await loadTenantUser(u.id);
  const token = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  await pool.query('UPDATE users SET last_login=NOW() WHERE id=?', [u.id]);
  await logAudit(req, 'LOGIN', 'auth', `token user=${username} tenant=${tenantId}`);
  const [trows] = await pool.query('SELECT id,name,slug,plan,status FROM tenants WHERE id=?', [tenantId]);
  res.json({ token, refreshToken, tokenType: 'Bearer', expiresIn: ACCESS_TTL, user, tenant: trows[0] });
});

router.post('/token/refresh', async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });
  let payload;
  try { payload = verifyRefreshToken(refreshToken); }
  catch { return res.status(401).json({ error: 'Invalid or expired refresh token' }); }
  const user = await loadTenantUser(payload.sub);
  if (!user || user.mustChangePassword) return res.status(401).json({ error: 'Invalid refresh token' });
  res.json({
    token: signAccessToken(user),
    refreshToken: signRefreshToken(user),
    tokenType: 'Bearer',
    expiresIn: ACCESS_TTL
  });
});

module.exports = router;
