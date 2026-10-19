require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const { requireAuth } = require('./server/lib/middleware');
const { resolveTenant, requireTenant, tenantScope } = require('./server/lib/tenant');

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

// module routers (all tenant-scoped via requireTenant above)
for (const mod of ['dashboard', 'vendors', 'rfqs', 'pos', 'customers', 'salesdocs', 'items', 'warehouses', 'stock', 'leads', 'projects', 'gst', 'staff', 'expenses', 'receipts', 'warranties', 'search', 'notifications', 'settings']) {
  try { app.use(`/api/${mod}`, require(`./server/routes/${mod}`)); } catch (e) { /* loaded in later parts */ }
}

app.use(express.static(path.join(__dirname, 'public')));
app.get(/^\/(?!api).*/, (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`X3M ERP SAAS running at http://localhost:${PORT}`));
