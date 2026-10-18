const pool = require('../db/pool');

/* Resolve the current tenant from the request host.
 * Supports subdomain (acme.localhost:3000) and custom domain (erp.acme.com).
 * The bare app host (localhost:3000) is the super-admin / marketing surface.
 */
async function resolveTenant(req, res, next) {
  const host = (req.hostname || '').toLowerCase().split(':')[0];
  const parts = host.split('.');

  // Super-admin / bare domain: no tenant context
  if (parts.length <= 2 || host === 'localhost' || host === '127.0.0.1') {
    req.tenant = null;
    return next();
  }

  // Subdomain = first segment (e.g. acme from acme.localhost:3000)
  const slug = parts[0];

  // Custom domain lookup (full host)
  try {
    const [rows] = await pool.query(
      'SELECT * FROM tenants WHERE domain = ? LIMIT 1',
      [host]
    );
    if (rows[0]) { req.tenant = rows[0]; return next(); }
  } catch (e) { /* fall through to slug lookup */ }

  // Subdomain lookup
  try {
    const [rows] = await pool.query(
      'SELECT * FROM tenants WHERE slug = ? LIMIT 1',
      [slug]
    );
    if (rows[0]) { req.tenant = rows[0]; return next(); }
  } catch (e) { /* fall through */ }

  // Unknown tenant
  req.tenant = null;
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Unknown organization', slug });
  }
  next();
}

function requireTenant(req, res, next) {
  if (!req.tenant) return res.status(400).json({ error: 'Tenant context required' });
  next();
}

function tenantScope(req) {
  return req.tenant ? req.tenant.id : null;
}

function isSuperAdmin(req) {
  const u = req.session?.user;
  return !!(u && (!u.tenant_id || u.role === 'Super Admin'));
}

module.exports = { resolveTenant, requireTenant, tenantScope, isSuperAdmin };
