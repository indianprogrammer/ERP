const express = require('express');
const { pool } = require('../lib/middleware');

const router = express.Router();

// GET /api/dashboard — company dashboard stats (tenant users only)
router.get('/', async (req, res) => {
  try {
    const t = req.tenantId;
    if (!t) return res.status(403).json({ error: 'Super admin does not have a company dashboard' });

    const one = async (sql, params = [t]) => (await pool.query(sql, params))[0][0];
    const many = async (sql, params = [t]) => (await pool.query(sql, params))[0];

    const [
      salesAll, salesMonth, receivables, receiptsMonth, expensesMonth,
      posAll, posOpen, itemCount, lowStockCount, leads, projects, users,
      customers, vendors, gstPending,
      recentDocs, recentReceipts, lowStockItems, openPos
    ] = await Promise.all([
      one(`SELECT COUNT(*) count, COALESCE(SUM(grand_total),0) total FROM sales_documents
         WHERE tenant_id=? AND doc_type IN ('TaxInvoice','Invoice') AND status<>'Cancelled'`),
      one(`SELECT COUNT(*) count, COALESCE(SUM(grand_total),0) total FROM sales_documents
         WHERE tenant_id=? AND doc_type IN ('TaxInvoice','Invoice') AND status<>'Cancelled'
         AND MONTH(doc_date)=MONTH(CURDATE()) AND YEAR(doc_date)=YEAR(CURDATE())`),
      one(`SELECT COUNT(*) count, COALESCE(SUM(grand_total-paid_amount),0) total FROM sales_documents
         WHERE tenant_id=? AND doc_type IN ('TaxInvoice','Invoice') AND status<>'Cancelled' AND grand_total>paid_amount`),
      one(`SELECT COUNT(*) count, COALESCE(SUM(amount),0) total FROM receipts
         WHERE tenant_id=? AND MONTH(receipt_date)=MONTH(CURDATE()) AND YEAR(receipt_date)=YEAR(CURDATE())`),
      one(`SELECT COALESCE(SUM(amount),0) total FROM expenses
         WHERE tenant_id=? AND MONTH(expense_date)=MONTH(CURDATE()) AND YEAR(expense_date)=YEAR(CURDATE())`),
      one(`SELECT COUNT(*) count, COALESCE(SUM(grand_total),0) total FROM purchase_orders WHERE tenant_id=?`),
      one(`SELECT COUNT(*) count, COALESCE(SUM(grand_total),0) total FROM purchase_orders
         WHERE tenant_id=? AND status<>'Delivered'`),
      one(`SELECT COUNT(*) count FROM items WHERE tenant_id=? AND is_active=1`),
      one(`SELECT COUNT(*) count FROM items i WHERE i.tenant_id=? AND i.is_active=1
         AND i.reorder_level >= COALESCE((SELECT SUM(s.qty) FROM stock_levels s WHERE s.item_id=i.id AND s.tenant_id=i.tenant_id),0)`),
      one(`SELECT COUNT(*) count, COALESCE(SUM(value),0) total FROM leads WHERE tenant_id=?`),
      one(`SELECT COUNT(*) count FROM projects WHERE tenant_id=? AND status='Active'`),
      one(`SELECT COUNT(*) count FROM users WHERE tenant_id=? AND is_active=1`),
      one(`SELECT COUNT(*) count FROM customers WHERE tenant_id=? AND is_active=1`),
      one(`SELECT COUNT(*) count FROM vendors WHERE tenant_id=? AND is_active=1`),
      one(`SELECT COUNT(*) count FROM sales_documents
         WHERE tenant_id=? AND doc_type='TaxInvoice' AND gst_status='Pending GSTR-1'`),
      many(`SELECT d.id, d.doc_no, d.doc_type, d.doc_date, d.status, d.grand_total, d.paid_amount, c.name customer
         FROM sales_documents d LEFT JOIN customers c ON c.id=d.customer_id AND c.tenant_id=d.tenant_id
         WHERE d.tenant_id=? ORDER BY d.id DESC LIMIT 6`),
      many(`SELECT r.receipt_no, r.amount, r.mode, r.receipt_date, c.name customer
         FROM receipts r LEFT JOIN customers c ON c.id=r.customer_id AND c.tenant_id=r.tenant_id
         WHERE r.tenant_id=? ORDER BY r.id DESC LIMIT 5`),
      many(`SELECT i.sku, i.name, i.reorder_level, COALESCE(SUM(s.qty),0) stock
         FROM items i LEFT JOIN stock_levels s ON s.item_id=i.id AND s.tenant_id=i.tenant_id
         WHERE i.tenant_id=? AND i.is_active=1
         GROUP BY i.id, i.sku, i.name, i.reorder_level
         HAVING COALESCE(SUM(s.qty),0) <= i.reorder_level
         ORDER BY (COALESCE(SUM(s.qty),0) - i.reorder_level) ASC LIMIT 6`),
      many(`SELECT p.po_no, p.status, p.grand_total, p.order_date, p.expected_date, v.name vendor
         FROM purchase_orders p LEFT JOIN vendors v ON v.id=p.vendor_id AND v.tenant_id=p.tenant_id
         WHERE p.tenant_id=? AND p.status<>'Delivered' ORDER BY p.id DESC LIMIT 5`)
    ]);

    const tn = req.tenant;
    res.json({
      tenant: tn ? { id: tn.id, name: tn.name, slug: tn.slug, plan: tn.plan, status: tn.status, gstin: tn.gstin } : null,
      kpis: {
        salesMonth: { count: Number(salesMonth.count), total: Number(salesMonth.total) },
        salesAll: { count: Number(salesAll.count), total: Number(salesAll.total) },
        receivables: { count: Number(receivables.count), total: Number(receivables.total) },
        receiptsMonth: { count: Number(receiptsMonth.count), total: Number(receiptsMonth.total) },
        expensesMonth: Number(expensesMonth.total),
        posAll: { count: Number(posAll.count), total: Number(posAll.total) },
        posOpen: { count: Number(posOpen.count), total: Number(posOpen.total) },
        items: Number(itemCount.count),
        lowStock: Number(lowStockCount.count),
        leads: { count: Number(leads.count), total: Number(leads.total) },
        projects: Number(projects.count),
        users: Number(users.count),
        customers: Number(customers.count),
        vendors: Number(vendors.count),
        gstPending: Number(gstPending.count)
      },
      recentDocs,
      recentReceipts,
      lowStockItems,
      openPos
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
