const pool = require('../db/pool');
const { verifyAccessToken } = require('./tokens');

/* Current authenticated user — works for both session (web UI) and
 * Bearer JWT (MCP server, external API clients). */
function authUser(req) {
  return req.user || req.session?.user || null;
}

async function loadTenantUser(userId) {
  const [rows] = await pool.query(
    `SELECT u.id, u.username, u.full_name, u.tenant_id, u.role_id, u.must_change_password, r.name AS role
     FROM users u LEFT JOIN staff_roles r ON r.id=u.role_id
     WHERE u.id=? AND u.is_active=1 AND u.tenant_id IS NOT NULL`,
    [userId]
  );
  const u = rows[0];
  if (!u) return null;
  const [prows] = await pool.query(
    'SELECT module, can_create, can_read, can_update, can_delete, can_export, can_approve FROM role_permissions WHERE role_id=?',
    [u.role_id]
  );
  const perms = {};
  for (const p of prows) perms[p.module] = p;
  return {
    id: u.id, username: u.username, fullName: u.full_name, role: u.role || 'Staff',
    tenant_id: u.tenant_id, isSuperAdmin: false, mustChangePassword: !!u.must_change_password, perms
  };
}

async function logAudit(req, action, resource, detail = '') {
  const u = authUser(req);
  try {
    await pool.query(
      'INSERT INTO audit_logs (tenant_id, user_id, username, action, resource, detail, ip) VALUES (?,?,?,?,?,?,?)',
      [u?.tenant_id ?? null, u?.id || null, u?.username || 'anon', action, resource, String(detail).slice(0, 490), req.ip || '']
    );
  } catch (e) { console.error('audit fail', e.message); }
}

async function requireAuth(req, res, next) {
  const hdr = req.headers.authorization || '';
  if (hdr.startsWith('Bearer ')) {
    let payload;
    try { payload = verifyAccessToken(hdr.slice(7)); }
    catch { return res.status(401).json({ error: 'Invalid or expired token' }); }
    const user = await loadTenantUser(payload.sub);
    if (!user) return res.status(401).json({ error: 'Invalid token' });
    if (user.mustChangePassword) {
      return res.status(403).json({ error: 'PASSWORD_CHANGE_REQUIRED', mustChange: true });
    }
    req.user = user;
    return next();
  }
  if (!req.session || !req.session.user) return res.status(401).json({ error: 'Not authenticated' });
  if (req.session.user.must_change_password && !req.path.startsWith('/auth/')) {
    return res.status(403).json({ error: 'PASSWORD_CHANGE_REQUIRED', mustChange: true });
  }
  next();
}

function requireModule(module, perm = 'can_read') {
  return (req, res, next) => {
    const u = authUser(req);
    if (!u) return res.status(401).json({ error: 'Not authenticated' });
    if (u.role === 'Super Admin') return next();
    const p = (u.perms || {})[module];
    if (!p || !p[perm]) return res.status(403).json({ error: `No ${perm} access for ${module}` });
    next();
  };
}

module.exports = { pool, logAudit, requireAuth, requireModule, authUser, loadTenantUser };
