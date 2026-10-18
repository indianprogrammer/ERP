require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const { pool, requireAuth, logAudit } = require('./server/lib/middleware');
const { resolveTenant, requireTenant, tenantScope, isSuperAdmin } = require('./server/lib/tenant');

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 12 * 3600 * 1000 }
}));

// Resolve tenant from host for every request
app.use(resolveTenant);

app.use('/api/auth', require('./server/routes/auth'));

// Super-admin routes (no tenant required)
app.use('/api/admin', requireAuth, require('./server/routes/admin'));

// ---- protected API (tenant-scoped) ----
app.use('/api', requireAuth, requireTenant);

// Attach tenant scope to req for audit logging
app.use('/api', (req, res, next) => {
  req.tenantId = tenantScope(req);
  next();
});

app.get('/api/dashboard', async (req, res) => {
  try {
    const q = async (sql, params = []) => (await pool.query(sql, params))[0];
    const tid = req.tenantId;
    const isSuperAdmin = !tid;

    if (isSuperAdmin) {
      const [{ c: total }] = await q('SELECT COUNT(*) c FROM tenants');
      const [{ c: active }] = await q("SELECT COUNT(*) c FROM tenants WHERE status IN ('active','trial')");
      const [{ c: suspended }] = await q("SELECT COUNT(*) c FROM tenants WHERE status='suspended'");
      const [{ c: plans }] = await q('SELECT COUNT(*) c FROM plans');
      const [recent] = await q('SELECT id,name,slug,plan,status,created_at FROM tenants ORDER BY created_at DESC LIMIT 5');
      const [planRows] = await q('SELECT slug, COUNT(*) c FROM tenants GROUP BY slug');
      const planMap = {};
      for (const r of planRows) planMap[r.slug] = Number(r.c);
      res.json({
        isSuperAdmin: true,
        companyCount: Number(total),
        activeCompanies: Number(active),
        suspendedCompanies: Number(suspended),
        totalPlans: Number(plans),
        recentTenants: recent,
        planUsage: planMap,
        notifications: []
      });
      return;
    }

    // tenant dashboard (existing simplified)
    let companyCount = 1;
    const [notifs] = await q('SELECT id,title,body,kind,link,created_at FROM notifications WHERE tenant_id IS NULL OR tenant_id=? ORDER BY id DESC LIMIT 8', [tid || 0]);
    res.json({
      tenant: { id: req.tenant.id, name: req.tenant.name, slug: req.tenant.slug, plan: req.tenant.plan, status: req.tenant.status },
      companyCount,
      notifications: notifs
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// module routers (all tenant-scoped via requireTenant above)
for (const mod of ['vendors', 'rfqs', 'pos', 'customers', 'salesdocs', 'items', 'warehouses', 'stock', 'leads', 'projects', 'gst', 'staff', 'expenses', 'receipts', 'warranties', 'shipments', 'search', 'notifications']) {
  try { app.use(`/api/${mod}`, require(`./server/routes/${mod}`)); } catch (e) { /* loaded in later parts */ }
}

app.use(express.static(path.join(__dirname, 'public')));
app.get(/^\/(?!api).*/, (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`X3M ERP SAAS running at http://localhost:${PORT}`));
