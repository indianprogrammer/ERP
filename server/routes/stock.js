const express = require('express');
const { pool, logAudit, requireModule, authUser } = require('../lib/middleware');
const router = express.Router();

const tid = (req) => req.tenantId;

router.get('/', requireModule('inventory'), async (req, res) => {
  const [rows] = await pool.query(
    `SELECT sl.*, i.sku, i.name item_name, i.uom, i.reorder_level, w.code wh_code, w.name wh_name
     FROM stock_levels sl JOIN items i ON i.id=sl.item_id AND i.tenant_id=? JOIN warehouses w ON w.id=sl.warehouse_id AND w.tenant_id=?
     WHERE sl.tenant_id=? ORDER BY i.name, w.code`, [tid(req), tid(req), tid(req)]);
  const [moves] = await pool.query(
    `SELECT m.*, i.sku, i.name item_name, w.code wh_code FROM stock_movements m
     JOIN items i ON i.id=m.item_id AND i.tenant_id=? JOIN warehouses w ON w.id=m.warehouse_id AND w.tenant_id=?
     WHERE m.tenant_id=? ORDER BY m.id DESC LIMIT 40`, [tid(req), tid(req), tid(req)]);
  res.json({ stock: rows, movements: moves });
});

router.post('/adjust', requireModule('inventory', 'can_update'), async (req, res) => {
  const { item_id, warehouse_id, movement_type, qty, notes } = req.body;
  if (!item_id || !warehouse_id || !movement_type || !qty) return res.status(400).json({ error: 'All fields required' });
  const delta = movement_type === 'OUT' ? -Number(qty) : movement_type === 'IN' ? Number(qty) : Number(qty);
  await pool.query(
    `INSERT INTO stock_levels (tenant_id,item_id,warehouse_id,qty) VALUES (?,?,?,?)
     ON DUPLICATE KEY UPDATE qty=qty+VALUES(qty)`, [tid(req), item_id, warehouse_id, delta]);
  await pool.query('INSERT INTO stock_movements (tenant_id,item_id,warehouse_id,movement_type,qty,ref_type,notes,created_by) VALUES (?,?,?,?,\'ADJ\',?,?)',
    [tid(req), item_id, warehouse_id, movement_type, Math.abs(qty), notes || '', authUser(req).id]);
  await logAudit(req, 'STOCK_ADJUST', 'stock', `item=${item_id} ${movement_type} ${qty}`);
  res.json({ ok: true });
});

// deduct stock for an outward doc (challan/invoice) — called from sales routes
async function deductStockForDoc(docId, userId, tenantId) {
  const [lines] = await pool.query('SELECT * FROM sales_doc_items WHERE doc_id=? AND tenant_id=? AND item_id IS NOT NULL', [docId, tenantId]);
  const [[doc]] = await pool.query('SELECT * FROM sales_documents WHERE id=? AND tenant_id=?', [docId, tenantId]);
  if (!doc || !lines.length) return;
  const wh = doc.warehouse_id || 1;
  for (const ln of lines) {
    await pool.query('INSERT INTO stock_levels (tenant_id,item_id,warehouse_id,qty) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE qty=qty+VALUES(qty)',
      [tenantId, ln.item_id, wh, -ln.qty]);
    await pool.query('INSERT INTO stock_movements (tenant_id,item_id,warehouse_id,movement_type,qty,ref_type,ref_no,created_by) VALUES (?,?,?,\'OUT\',?,?,?)',
      [tenantId, ln.item_id, wh, ln.qty, doc.doc_type, doc.doc_no, userId]);
  }
}
module.exports = router;
module.exports.deductStockForDoc = deductStockForDoc;
