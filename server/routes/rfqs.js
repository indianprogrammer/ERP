const express = require('express');
const { pool, logAudit, requireModule } = require('../lib/middleware');
const router = express.Router();

const nextNo = async (table, col, prefix) => {
  const [[{ c }]] = await pool.query(`SELECT COUNT(*) c FROM ${table}`);
  return `${prefix}-${new Date().getFullYear()}-${String(c + 1).padStart(3, '0')}`;
};

// List RFQs with quote counts
router.get('/', requireModule('procurement'), async (req, res) => {
  const [rows] = await pool.query(
    `SELECT r.*, (SELECT COUNT(*) FROM vendor_quotes q WHERE q.rfq_id=r.id) quote_count,
      (SELECT COUNT(DISTINCT vendor_id) FROM vendor_quotes q WHERE q.rfq_id=r.id) vendor_count
     FROM rfqs r ORDER BY r.id DESC`);
  res.json({ rfqs: rows });
});

// Quote comparison matrix: group by item_desc across vendors
router.get('/:id/matrix', requireModule('procurement'), async (req, res) => {
  const [[rfq]] = await pool.query('SELECT * FROM rfqs WHERE id=?', [req.params.id]);
  if (!rfq) return res.status(404).json({ error: 'RFQ not found' });
  const [quotes] = await pool.query(
    `SELECT q.*, v.name vendor_name FROM vendor_quotes q JOIN vendors v ON v.id=q.vendor_id WHERE q.rfq_id=? ORDER BY q.item_desc, q.unit_price`, [req.params.id]);
  const items = {};
  for (const q of quotes) {
    const k = q.item_desc;
    if (!items[k]) items[k] = { item: k, quotes: [] };
    items[k].quotes.push({ ...q, total: q.qty * q.unit_price, tax: q.qty * q.unit_price * q.gst_rate / 100, grand: q.qty * q.unit_price * (1 + q.gst_rate / 100) });
  }
  for (const it of Object.values(items)) {
    it.best = [...it.quotes].sort((a, b) => a.grand - b.grand)[0];
    it.vendors = [...new Set(it.quotes.map(q => q.vendor_name))];
  }
  res.json({ rfq, items: Object.values(items), quotes });
});

router.post('/', requireModule('procurement', 'can_create'), async (req, res) => {
  const { title, due_date, project_id, quotes = [] } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const rfq_no = await nextNo('rfqs', 'rfq_no', 'RFQ');
  const [r] = await pool.query('INSERT INTO rfqs (rfq_no,title,project_id,status,due_date,created_by) VALUES (?,?,?,\'Open\',?,?)',
    [rfq_no, title, project_id || null, due_date || null, req.session.user.id]);
  for (const q of quotes) {
    if (!q.vendor_id || !q.item_desc) continue;
    await pool.query('INSERT INTO vendor_quotes (rfq_id,vendor_id,item_desc,qty,unit_price,gst_rate,lead_time_days,payment_terms,notes) VALUES (?,?,?,?,?,?,?,?,?)',
      [r.insertId, q.vendor_id, q.item_desc, q.qty || 1, q.unit_price || 0, q.gst_rate ?? 18, q.lead_time_days || 0, q.payment_terms || '', q.notes || '']);
  }
  await logAudit(req, 'CREATE', 'rfq', rfq_no);
  res.json({ id: r.insertId, rfq_no });
});

// Convert winning quote(s) → Purchase Order
router.post('/:id/convert', requireModule('procurement', 'can_approve'), async (req, res) => {
  const { quote_ids = [], warehouse_id, expected_date, notes } = req.body;
  if (!quote_ids.length) return res.status(400).json({ error: 'Select quotes to convert' });
  const [quotes] = await pool.query(
    `SELECT q.*, v.name vendor_name FROM vendor_quotes q JOIN vendors v ON v.id=q.vendor_id WHERE q.id IN (?)`, [quote_ids]);
  if (!quotes.length) return res.status(400).json({ error: 'Quotes not found' });
  const vendorId = quotes[0].vendor_id;
  if (quotes.some(q => q.vendor_id !== vendorId)) return res.status(400).json({ error: 'Select quotes from a single vendor only' });
  const [[rfq]] = await pool.query('SELECT * FROM rfqs WHERE id=?', [req.params.id]);
  const po_no = await nextNo('purchase_orders', 'po_no', 'PO');
  let subtotal = 0, tax_total = 0;
  for (const q of quotes) {
    const amt = q.qty * q.unit_price;
    subtotal += amt; tax_total += amt * q.gst_rate / 100;
  }
  const [r] = await pool.query(
    `INSERT INTO purchase_orders (po_no,vendor_id,rfq_id,quote_id,project_id,warehouse_id,order_date,expected_date,status,subtotal,tax_total,grand_total,notes,created_by)
     VALUES (?,?,?,?,?,?,CURDATE(),?,'Ordered',?,?,?,?,?)`,
    [po_no, vendorId, req.params.id, quote_ids[0], rfq?.project_id || null, warehouse_id || null, expected_date || null, subtotal, tax_total, subtotal + tax_total, notes || '', req.session.user.id]);
  for (const q of quotes) {
    await pool.query('INSERT INTO po_items (po_id,item_id,description,hsn_sac,qty,unit_price,gst_rate,amount) VALUES (?,?,?,?,?,?,?,?)',
      [r.insertId, null, q.item_desc, '', q.qty, q.unit_price, q.gst_rate, q.qty * q.unit_price]);
    await pool.query('UPDATE vendor_quotes SET status=\'Converted\' WHERE id=?', [q.id]);
  }
  await pool.query('INSERT INTO shipments (po_id,status) VALUES (?,\'Ordered\')', [r.insertId]);
  await pool.query('UPDATE rfqs SET status=\'PO Created\' WHERE id=?', [req.params.id]);
  await logAudit(req, 'CONVERT_TO_PO', 'purchase_order', po_no);
  res.json({ id: r.insertId, po_no });
});
module.exports = router;
