const express = require('express');
const { pool } = require('../lib/middleware');
const router = express.Router();

const tid = (req) => req.tenantId;

function UI_money(n) { return '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 }); }

router.get('/', async (req, res) => {
  const q = `%${(req.query.q || '').trim()}%`;
  if (!q || q === '%%') return res.json({ results: [] });
  const t = tid(req);
  const results = [];
  const add = (rows, type, label, link) => rows.forEach(r => results.push({ type, label: label(r), link: link(r) }));
  const [inv] = await pool.query(`SELECT d.doc_no,d.grand_total,c.name FROM sales_documents d JOIN customers c ON c.id=d.customer_id AND c.tenant_id=? WHERE d.tenant_id=? AND (d.doc_no LIKE ? OR c.name LIKE ? OR d.eway_awb LIKE ?) LIMIT 5`, [t, t, q, q, q]);
  add(inv, 'Sales Document', r => `${r.doc_no} · ${r.name} · ${UI_money(r.grand_total)}`, r => `#/sales/docs?id=${r.doc_no}`);
  const [pos] = await pool.query(`SELECT p.po_no,p.grand_total,v.name FROM purchase_orders p JOIN vendors v ON v.id=p.vendor_id AND v.tenant_id=? WHERE p.tenant_id=? AND (p.po_no LIKE ? OR v.name LIKE ?) LIMIT 5`, [t, t, q, q]);
  add(pos, 'Purchase Order', r => `${r.po_no} · ${r.name} · ${UI_money(r.grand_total)}`, r => `#/procurement?tab=pos&po=${r.po_no}`);
  const [parties] = await pool.query(`SELECT name,gstin,'customer' t FROM customers WHERE tenant_id=? AND (name LIKE ? OR gstin LIKE ?) UNION ALL SELECT name,gstin,'vendor' FROM vendors WHERE tenant_id=? AND (name LIKE ? OR gstin LIKE ?) LIMIT 6`, [t, q, q, t, q, q]);
  add(parties, 'Party (GSTIN)', r => `${r.name} · ${r.gstin || 'No GSTIN'}`, r => r.t === 'customer' ? '#/sales?tab=customers' : '#/procurement?tab=vendors');
  const [items] = await pool.query(`SELECT sku,name,barcode FROM items WHERE tenant_id=? AND (sku LIKE ? OR name LIKE ? OR barcode LIKE ?) LIMIT 5`, [t, q, q, q]);
  add(items, 'Item / SKU', r => `${r.sku} · ${r.name}`, r => `#/inventory?sku=${r.sku}`);
  const [projs] = await pool.query(`SELECT code,name FROM projects WHERE tenant_id=? AND (code LIKE ? OR name LIKE ?) LIMIT 4`, [t, q, q]);
  add(projs, 'Project', r => `${r.code} · ${r.name}`, r => `#/projects?code=${r.code}`);
  res.json({ results: results.slice(0, 12) });
});

module.exports = router;
