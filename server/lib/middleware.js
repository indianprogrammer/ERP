const pool = require('../db/pool');

async function logAudit(req, action, resource, detail = '') {
  try {
    await pool.query(
      'INSERT INTO audit_logs (user_id, username, action, resource, detail, ip) VALUES (?,?,?,?,?,?)',
      [req.session?.user?.id || null, req.session?.user?.username || 'anon', action, resource, String(detail).slice(0, 490), req.ip || '']
    );
  } catch (e) { console.error('audit fail', e.message); }
}

function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) return res.status(401).json({ error: 'Not authenticated' });
  if (req.session.user.must_change_password && !req.path.startsWith('/auth/')) {
    return res.status(403).json({ error: 'PASSWORD_CHANGE_REQUIRED', mustChange: true });
  }
  next();
}

function requireModule(module, perm = 'can_read') {
  return (req, res, next) => {
    const u = req.session?.user;
    if (!u) return res.status(401).json({ error: 'Not authenticated' });
    if (u.role === 'Super Admin') return next();
    const p = (u.perms || {})[module];
    if (!p || !p[perm]) return res.status(403).json({ error: `No ${perm} access for ${module}` });
    next();
  };
}

module.exports = { pool, logAudit, requireAuth, requireModule };
