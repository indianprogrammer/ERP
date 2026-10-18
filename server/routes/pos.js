const express = require('express');
const { pool, logAudit, requireModule } = require('../lib/middleware');
const router = express.Router();

router.get('/', requireModule('procurement'), async (req, res) => {
  const [rows] = await pool.query(
    `SELECT p.*, v.name vendor_name, s.status ship_status, s.awb_no, s.carrier,
      (SELECT COALESCE(SUM(amount),0) FROM po_items WHERE po_id=p.id) unused
     FROM purchase_orders p JOIN vendors v ON v.id=p.vendor_id
     LEFT JOIN shipments s ON s.po_id=p.id ORDER BY p.id DESC`);
  res.json({ pos: rows });
});

router.get('/:id', requireModule('procurement'), async (req, res) => {
  const [[po]] = await pool.query(
    `SELECT p.*, v.name vendor_name, v.gstin vendor_gstin, v.address vendor_address, v.payment_terms vendor_terms,
     s.status ship_status, s.awb_no, s.carrier, s.shipped_date, s.expected_delivery
     FROM purchase_orders p JOIN vendors v ON v.id=p.vendor_id LEFT JOIN shipments s ON s.po_id=p.id WHERE p.id=?`, [req.params.id]);
  if (!po) return res.status(404).json({ error: 'PO not found' });
  const [items] = await pool.query('SELECT * FROM po_items WHERE po_id=?', [req.params.id]);
  res.json({ po, items });
});

router.post('/', requireModule('procurement', 'can_create'), async (req, res) => {
  const { vendor_id, project_id, warehouse_id, expected_date, notes, items = [] } = req.body;
  if (!vendor_id) return res.status(400).json({ error: 'Vendor required' });
  if (!items.length) return res.status(400).json({ error: 'Add at least one line item' });
  const [[{ c }]] = await pool.query('SELECT COUNT(*) c FROM purchase_orders');
  const po_no = `PO-${new Date().getFullYear()}-${String(c + 1).padStart(3, '0')}`;
  let subtotal = 0, tax_total = 0;
  for (const it of items) { const a = (it.qty || 0) * (it.unit_price || 0); subtotal += a; tax_total += a * (it.gst_rate ?? 18) / 100; }
  const [r] = await pool.query(
    `INSERT INTO purchase_orders (po_no,vendor_id,project_id,warehouse_id,order_date,expected_date,status,subtotal,tax_total,grand_total,notes,created_by)
     VALUES (?,?,?,? ,CURDATE(),?,'Ordered',?,?,?,?,?)`,
    [po_no, vendor_id, project_id || null, warehouse_id || null, expected_date || null, subtotal, tax_total, subtotal + tax_total, notes || '', req.session.user.id]);
  for (const it of items) {
    await pool.query('INSERT INTO po_items (po_id,item_id,description,hsn_sac,qty,unit_price,gst_rate,amount) VALUES (?,?,?,?,?,?,?,?)',
      [r.insertId, it.item_id || null, it.description || '', it.hsn_sac || '', it.qty || 1, it.unit_price || 0, it.gst_rate ?? 18, (it.qty || 0) * (it.unit_price || 0)]);
  }
  await pool.query('INSERT INTO shipments (po_id,status) VALUES (?,\'Ordered\')', [r.insertId]);
  if (project_id) await pool.query('INSERT IGNORE INTO project_links (project_id,ref_type,ref_id,amount) VALUES (?,\'PO\',?,?)', [project_id, r.insertId, subtotal + tax_total]);
  await logAudit(req, 'CREATE', 'purchase_order', po_no);
  res.json({ id: r.insertId, po_no });
});

// Receive goods (GRN): stock IN + status Delivered
router.post('/:id/receive', requireModule('procurement', 'can_update'), async (req, res) => {
  const { warehouse_id, lines = [] } = req.body;
  const [[po]] = await pool.query('SELECT * FROM purchase_orders WHERE id=?', [req.params.id]);
  if (!po) return res.status(404).json({ error: 'PO not found' });
  const wh = warehouse_id || po.warehouse_id || 1;
  for (const ln of lines) {
    if (!ln.item_id || !ln.qty) continue;
    await pool.query(
      `INSERT INTO stock_levels (item_id,warehouse_id,qty) VALUES (?,?,?)
       ON DUPLICATE KEY UPDATE qty=qty+VALUES(qty)`, [ln.item_id, wh, ln.qty]);
    await pool.query('INSERT INTO stock_movements (item_id,warehouse_id,movement_type,qty,ref_type,ref_no,created_by) VALUES (?,?,\'IN\',?,?,?,?)',
      [ln.item_id, wh, ln.qty, 'PO', po.po_no, req.session.user.id]);
  }
  await pool.query('UPDATE purchase_orders SET status=\'Delivered\' WHERE id=?', [req.params.id]);
  await pool.query(`UPDATE shipments SET status='Delivered', delivered_date=CURDATE() WHERE po_id=?`, [req.params.id]);
  await logAudit(req, 'GRN_RECEIVE', 'purchase_order', po.po_no);
  res.json({ ok: true });
});

router.post('/:id/ship-status', requireModule('procurement', 'can_update'), async (req, res) => {
  const { status, carrier, awb_no, expected_delivery } = req.body;
  await pool.query('UPDATE shipments SET status=?, carrier=COALESCE(?,carrier), awb_no=COALESCE(?,awb_no), expected_delivery=COALESCE(?,expected_delivery), shipped_date=IF(? IN (\'Shipped\',\'In-Transit\'),CURDATE(),shipped_date) WHERE po_id=?',
    [status || 'Ordered', carrier || null, awb_no || null, expected_delivery || null, status, req.params.id]);
  await pool.query('UPDATE purchase_orders SET status=? WHERE id=?', [status === 'Delivered' ? 'Delivered' : (status || 'Ordered'), req.params.id]);
  await logAudit(req, 'SHIPMENT_UPDATE', 'purchase_order', `${req.params.id}→${status}`);
  res.json({ ok: true });
});

// Pay vendor: reduces outstanding via notification + audit (payables tracked as paid_amount not on PO; keep simple ledger note)
router.post('/:id/pay', requireModule('procurement', 'can_approve'), async (req, res) => {
  const { amount, mode, ref_no } = req.body;
  const [[po]] = await pool.query('SELECT p.*, v.name vendor_name FROM purchase_orders p JOIN vendors v ON v.id=p.vendor_id WHERE p.id=?', [req.params.id]);
  if (!po) return res.status(404).json({ error: 'PO not found' });
  await pool.query('INSERT INTO expenses (vendor_id,title,category,amount,expense_date,notes,created_by) VALUES (?,?,?,?,CURDATE(),?,?)',
    [po.vendor_id, `Payment to ${po.vendor_name} for ${po.po_no}`, 'Vendor Payment', amount || 0, `Mode:${mode || 'Bank'} Ref:${ref_no || '-'}`, req.session.user.id]);
  await logAudit(req, 'VENDOR_PAYMENT', 'purchase_order', `${po.po_no} ₹${amount}`);
  res.json({ ok: true });
});
module.exports = router;
