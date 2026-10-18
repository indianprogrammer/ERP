const express = require('express');
const bcrypt = require('bcryptjs');
const { pool, logAudit, requireAuth } = require('../lib/middleware');
const { isSuperAdmin } = require('../lib/tenant');
const router = express.Router();

// Super-admin only: list all companies (tenants)
router.get('/tenants', requireAuth, (req, res, next) => {
  if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Super admin only' });
  next();
}, async (req, res) => {
  const [rows] = await pool.query('SELECT id,name,slug,domain,plan,status,trial_ends_at,subscription_ends_at,created_at FROM tenants ORDER BY id DESC');
  res.json({ tenants: rows });
});

// Super-admin only: create a company (no public signup)
router.post('/tenants', requireAuth, async (req, res, next) => {
  if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Super admin only' });
  next();
}, async (req, res) => {
  const { name, slug, email, password, fullName, plan = 'starter' } = req.body || {};
  if (!name || !slug || !email || !password) {
    return res.status(400).json({ error: 'name, slug, email, password required' });
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    return res.status(400).json({ error: 'Slug must be lowercase alphanumeric with hyphens' });
  }
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [existing] = await conn.query('SELECT id FROM tenants WHERE slug=?', [slug]);
    if (existing.length) throw new Error('Organization slug already taken');

    const [tRes] = await conn.query(
      'INSERT INTO tenants (name,slug,plan,status,trial_ends_at) VALUES (?,?,\'starter\',\'trial\',DATE_ADD(NOW(), INTERVAL 14 DAY))',
      [name, slug]);
    const tenantId = tRes.insertId;

    const hash = bcrypt.hashSync(password, 10);
    const [uRes] = await conn.query(
      'INSERT INTO users (tenant_id,username,password_hash,full_name,email,role_id,is_active) VALUES (?,?,?,?,?,NULL,1)',
      [tenantId, email, hash, fullName || name, email]);
    const userId = uRes.insertId;

    await conn.query(
      'INSERT INTO staff_roles (tenant_id,name,description,is_system) VALUES (?,\'Super Admin\',\'Full access\',1)',
      [tenantId]);
    const [roleRows] = await conn.query('SELECT id FROM staff_roles WHERE tenant_id=? AND is_system=1', [tenantId]);
    const roleId = roleRows[0].id;
    await conn.query('UPDATE users SET role_id=? WHERE id=?', [roleId, userId]);

    const modules = ['procurement','sales','inventory','projects','crm','gst','staff','admin'];
    for (const m of modules) {
      await conn.query(
        'INSERT INTO role_permissions (role_id,module,can_create,can_read,can_update,can_delete,can_export,can_approve) VALUES (?,?,1,1,1,1,1,1)',
        [roleId, m]);
    }

    await conn.query(
      'INSERT INTO audit_logs (tenant_id,user_id,username,action,resource,detail) VALUES (?,?,?,\'ORG_CREATE\',\'tenants\',?)',
      [tenantId, userId, email, `org=${name} slug=${slug} created_by_superadmin`]);

    await conn.commit();
    res.status(201).json({ ok: true, tenantId, userId, slug });
  } catch (e) {
    await conn.rollback();
    res.status(400).json({ error: e.message });
  } finally {
    conn.release();
  }
});

// Super-admin only: toggle tenant status
router.patch('/tenants/:id/status', requireAuth, async (req, res) => {
  if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Super admin only' });
  const { status } = req.body;
  await pool.query('UPDATE tenants SET status=? WHERE id=?', [status, req.params.id]);
  await logAudit(req, 'TENANT_STATUS', 'tenants', `${req.params.id}→${status}`);
  res.json({ ok: true });
});

// Super-admin only: edit company details
router.put('/tenants/:id', requireAuth, async (req, res) => {
  if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Super admin only' });
  const { name, slug, domain, plan, status } = req.body || {};
  if (!name || !slug) return res.status(400).json({ error: 'Name and slug required' });
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    return res.status(400).json({ error: 'Slug must be lowercase alphanumeric with hyphens' });
  }
  // check slug uniqueness excluding self
  const [existing] = await pool.query('SELECT id FROM tenants WHERE slug=? AND id<>?', [slug, req.params.id]);
  if (existing.length) throw new Error('Organization slug already taken');
  await pool.query(
    'UPDATE tenants SET name=?, slug=?, domain=?, plan=?, status=? WHERE id=?',
    [name, slug, domain || null, plan || 'starter', status || 'trial', req.params.id]);
  await logAudit(req, 'TENANT_UPDATE', 'tenants', `id=${req.params.id} name=${name} slug=${slug}`);
  res.json({ ok: true });
});

// ---- Plan Management ----

router.get('/plans', requireAuth, async (req, res, next) => {
  if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Super admin only' });
  next();
}, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM plans ORDER BY id');
  res.json({ plans: rows });
});

router.post('/plans', requireAuth, async (req, res, next) => {
  if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Super admin only' });
  next();
}, async (req, res) => {
  const { name, slug, price_monthly, max_users, max_vendors, max_customers, features, is_active } = req.body || {};
  if (!name || !slug) return res.status(400).json({ error: 'Name and slug required' });
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    return res.status(400).json({ error: 'Slug must be lowercase alphanumeric with hyphens' });
  }
  try {
    const [r] = await pool.query(
      'INSERT INTO plans (name,slug,price_monthly,max_users,max_vendors,max_customers,features,is_active) VALUES (?,?,?,?,?,?,?,?)',
      [name, slug, price_monthly || 0, max_users || 5, max_vendors || 50, max_customers || 50, JSON.stringify(features || {}), is_active ? 1 : 1]);
    await logAudit(req, 'PLAN_CREATE', 'plans', name);
    res.status(201).json({ ok: true, planId: r.insertId });
  } catch (e) { res.status(400).json({ error: e.code === 'ER_DUP_ENTRY' ? 'Plan slug already exists' : e.message }); }
});

router.put('/plans/:id', requireAuth, async (req, res, next) => {
  if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Super admin only' });
  next();
}, async (req, res) => {
  const { name, slug, price_monthly, max_users, max_vendors, max_customers, features, is_active } = req.body || {};
  if (!name || !slug) return res.status(400).json({ error: 'Name and slug required' });
  const [existing] = await pool.query('SELECT id FROM plans WHERE slug=? AND id<>?', [slug, req.params.id]);
  if (existing.length) throw new Error('Plan slug already exists');
  await pool.query(
    'UPDATE plans SET name=?, slug=?, price_monthly=?, max_users=?, max_vendors=?, max_customers=?, features=?, is_active=? WHERE id=?',
    [name, slug, price_monthly || 0, max_users || 5, max_vendors || 50, max_customers || 50, JSON.stringify(features || null), is_active ? 1 : 0, req.params.id]);
  await logAudit(req, 'PLAN_UPDATE', 'plans', `${req.params.id} name=${name}`);
  res.json({ ok: true });
});

router.delete('/plans/:id', requireAuth, async (req, res, next) => {
  if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Super admin only' });
  next();
}, async (req, res) => {
  const [used] = await pool.query('SELECT COUNT(*) c FROM tenants WHERE plan=?', [req.params.id]);
  if (used[0].c > 0) return res.status(400).json({ error: 'Plan is in use by companies' });
  await pool.query('DELETE FROM plans WHERE id=?', [req.params.id]);
  await logAudit(req, 'PLAN_DELETE', 'plans', req.params.id);
  res.json({ ok: true });
});

module.exports = router;
