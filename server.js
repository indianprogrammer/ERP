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
    const params = [tid];
    const [sales, pays, inv, leads, proj, lowStock, pendingGst, notifs] = await Promise.all([
      q(`SELECT COALESCE(SUM(grand_total),0) v FROM sales_documents WHERE tenant_id=? AND doc_type='TaxInvoice' AND doc_date >= DATE_FORMAT(NOW(),'%Y-%m-01')`, params),
      q(`SELECT COALESCE(SUM(grand_total - paid_amount),0) v FROM sales_documents WHERE tenant_id=? AND doc_type='TaxInvoice' AND grand_total > paid_amount`, params),
      q(`SELECT COALESCE(SUM(qty * purchase_price),0) v FROM stock_levels sl JOIN items i ON i.id=sl.item_id WHERE sl.tenant_id=?`, params),
      q(`SELECT COUNT(*) v FROM leads WHERE tenant_id=? AND stage_id < 5`, params),
      q(`SELECT COUNT(*) v FROM projects WHERE tenant_id=? AND status='Active'`, params),
      q(`SELECT COUNT(*) v FROM items i WHERE i.tenant_id=? AND i.is_active=1 AND i.reorder_level>0 AND COALESCE((SELECT SUM(qty) FROM stock_levels sl WHERE sl.item_id=i.id AND sl.tenant_id=?),0) <= i.reorder_level`, [tid, tid]),
      q(`SELECT COUNT(*) v FROM sales_documents WHERE tenant_id=? AND doc_type='TaxInvoice' AND gst_status LIKE 'Pending%'`, params),
      q(`SELECT id,title,body,kind,link,created_at FROM notifications WHERE tenant_id=? ORDER BY id DESC LIMIT 8`, params)
    ]);
    const recentDocs = await q(`SELECT d.id,d.doc_no,d.doc_type,d.grand_total,d.gst_status,d.status,c.name customer FROM sales_documents d JOIN customers c ON c.id=d.customer_id AND c.tenant_id=? WHERE d.tenant_id=? ORDER BY d.id DESC LIMIT 6`, [tid, tid]);
    res.json({
      tenant: { id: req.tenant.id, name: req.tenant.name, slug: req.tenant.slug, plan: req.tenant.plan, status: req.tenant.status },
      metrics: {
        monthlySales: sales[0].v, receivables: pays[0].v, inventoryValue: inv[0].v,
        openLeads: leads[0].v, activeProjects: proj[0].v, lowStock: lowStock[0].v, pendingGst: pendingGst[0].v
      },
      recentDocs, notifications: notifs
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
