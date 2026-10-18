const express = require('express');
const { pool, logAudit, requireModule } = require('../lib/middleware');
const { deductStockForDoc } = require('./stock');
const router = express.Router();

const SELLER = { name: 'Google ERP Systems Pvt Ltd', gstin: '27AAAAA0000A1Z5', pan: 'AAAAA0000A', address: 'BKC, Mumbai 400051', state_code: '27' };
const OUR_STATE = '27'; // Maharashtra

const PREFIX = { Proforma: 'PI', TaxInvoice: 'INV', DeliveryChallan: 'CH', CreditNote: 'CN', DebitNote: 'DN' };

function computeGst(items, placeOfSupply) {
  const inter = String(placeOfSupply || '').includes('(') ? placeOfSupply.match(/\((\d+)\)/)?.[1] : null;
  const isInterState = (inter || OUR_STATE) !== OUR_STATE;
  let taxable = 0, tax = 0;
  const lines = items.map(it => {
    const amount = (it.qty || 0) * (it.unit_price || 0);
    const t = amount * (it.gst_rate ?? 18) / 100;
    taxable += amount; tax += t;
    return { ...it, amount, tax: t, isInterState };
  });
  return {
    lines, taxable, tax,
    cgst: isInterState ? 0 : tax / 2, sgst: isInterState ? 0 : tax / 2,
    igst: isInterState ? tax : 0,
    grand: taxable + tax, isInterState
  };
}

router.get('/', requireModule('sales'), async (req, res) => {
  let where = '1=1', p = [];
  if (req.query.type) { where = 'd.doc_type=?'; p.push(req.query.type); }
  const [rows] = await pool.query(
    `SELECT d.*, c.name customer_name, c.gstin customer_gstin,
      DATEDIFF(CURDATE(), d.due_date) overdue_days
     FROM sales_documents d JOIN customers c ON c.id=d.customer_id WHERE ${where}
     ORDER BY d.id DESC LIMIT 100`, p);
  res.json({ docs: rows });
});

router.get('/aging', requireModule('sales'), async (req, res) => {
  const [rows] = await pool.query(
    `SELECT d.doc_no, d.doc_date, d.due_date, c.name customer, (d.grand_total - d.paid_amount) outstanding,
      CASE
        WHEN DATEDIFF(CURDATE(), COALESCE(d.due_date, DATE_ADD(d.doc_date, INTERVAL 30 DAY))) <= 0 THEN 'Current'
        WHEN DATEDIFF(CURDATE(), COALESCE(d.due_date, DATE_ADD(d.doc_date, INTERVAL 30 DAY))) <= 30 THEN '0-30'
        WHEN DATEDIFF(CURDATE(), COALESCE(d.due_date, DATE_ADD(d.doc_date, INTERVAL 30 DAY))) <= 60 THEN '31-60'
        WHEN DATEDIFF(CURDATE(), COALESCE(d.due_date, DATE_ADD(d.doc_date, INTERVAL 30 DAY))) <= 90 THEN '61-90'
        ELSE '90+' END bucket
     FROM sales_documents d JOIN customers c ON c.id=d.customer_id
     WHERE d.doc_type='TaxInvoice' AND d.grand_total > d.paid_amount AND d.status <> 'Cancelled'
     ORDER BY d.due_date`);
  const buckets = { Current: 0, '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  for (const r of rows) buckets[r.bucket] += Number(r.outstanding);
  res.json({ rows, buckets });
});

router.get('/:id', requireModule('sales'), async (req, res) => {
  const [[doc]] = await pool.query(
    `SELECT d.*, c.name customer_name, c.gstin customer_gstin, c.address customer_address, c.state_code customer_state, c.place_of_supply
     FROM sales_documents d JOIN customers c ON c.id=d.customer_id WHERE d.id=?`, [req.params.id]);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  const [items] = await pool.query('SELECT * FROM sales_doc_items WHERE doc_id=?', [req.params.id]);
  const [receipts] = await pool.query('SELECT * FROM receipts WHERE doc_id=? ORDER BY id', [req.params.id]);
  res.json({ doc, items, receipts });
});

// Create document (Proforma / TaxInvoice / DeliveryChallan / CreditNote / DebitNote)
router.post('/', requireModule('sales', 'can_create'), async (req, res) => {
  const { doc_type, customer_id, project_id, warehouse_id, place_of_supply, po_ref, carrier, eway_awb, due_date, notes, items = [], from_lead } = req.body;
  if (!doc_type || !customer_id) return res.status(400).json({ error: 'Document type and customer required' });
  if (!items.length) return res.status(400).json({ error: 'Add at least one line item' });
  const [[cust]] = await pool.query('SELECT * FROM customers WHERE id=?', [customer_id]);
  const pos = place_of_supply || cust?.place_of_supply || 'Maharashtra (27)';
  const g = computeGst(items, pos);
  const [[{ c: cnt }]] = await pool.query('SELECT COUNT(*) c FROM sales_documents');
  const doc_no = `${PREFIX[doc_type] || 'DOC'}-${new Date().getFullYear()}-${String(cnt + 1).padStart(3, '0')}`;
  const isCredit = doc_type === 'CreditNote';
  const sign = isCredit ? -1 : 1;
  const [r] = await pool.query(
    `INSERT INTO sales_documents (doc_no,doc_type,customer_id,project_id,warehouse_id,doc_date,place_of_supply,po_ref,carrier,eway_awb,status,gst_status,taxable_value,cgst,sgst,igst,grand_total,due_date,notes,created_by)
     VALUES (?,?,?, ?, ?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [doc_no, doc_type, customer_id, project_id || null, warehouse_id || null, pos, po_ref || '', carrier || '', eway_awb || '',
      doc_type === 'TaxInvoice' ? 'Issued' : (doc_type === 'DeliveryChallan' ? 'Dispatched' : 'Issued'),
      doc_type === 'TaxInvoice' ? 'Pending GSTR-1' : 'N/A',
      sign * g.taxable, sign * g.cgst, sign * g.sgst, sign * g.igst, sign * g.grand,
      due_date || null, notes || '', req.session.user.id]);
  for (const ln of g.lines) {
    await pool.query('INSERT INTO sales_doc_items (doc_id,item_id,description,hsn_sac,qty,unit_price,gst_rate,amount) VALUES (?,?,?,?,?,?,?,?)',
      [r.insertId, ln.item_id || null, ln.description || '', ln.hsn_sac || '', ln.qty || 1, ln.unit_price || 0, ln.gst_rate ?? 18, sign * ln.amount]);
  }
  if (project_id) await pool.query('INSERT IGNORE INTO project_links (project_id,ref_type,ref_id,amount) VALUES (?,\'SALE\',?,?)', [project_id, r.insertId, sign * g.grand]);
  // outward stock for invoices & challans
  if (doc_type === 'TaxInvoice' || doc_type === 'DeliveryChallan') {
    await deductStockForDoc(r.insertId, req.session.user.id);
    if (carrier || eway_awb) {
      await pool.query('INSERT INTO shipments (sales_doc_id,carrier,awb_no,status,shipped_date) VALUES (?,?,?,\'In-Transit\',CURDATE())',
        [r.insertId, carrier || '', eway_awb || '']);
    }
  }
  if (from_lead) await pool.query('UPDATE leads SET converted_doc_id=? WHERE id=?', [r.insertId, from_lead]);
  await logAudit(req, 'CREATE', `sales_${doc_type}`, doc_no);
  res.json({ id: r.insertId, doc_no, grand_total: g.grand, gst: { cgst: g.cgst, sgst: g.sgst, igst: g.igst, inter: g.isInterState } });
});

// E-Way bill JSON (Rule 138) — downloadable
router.get('/:id/eway-json', requireModule('sales', 'can_export'), async (req, res) => {
  const [[doc]] = await pool.query(
    `SELECT d.*, c.name customer_name, c.gstin customer_gstin, c.address customer_address, c.state_code customer_state
     FROM sales_documents d JOIN customers c ON c.id=d.customer_id WHERE d.id=?`, [req.params.id]);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  const [items] = await pool.query('SELECT * FROM sales_doc_items WHERE doc_id=?', [req.params.id]);
  const supplyType = doc.place_of_supply?.startsWith('Maharashtra') ? 'O' : 'S';
  const json = {
    version: '1.0.3', transactionType: 'OUTWARD', supplyType,
    docType: doc.doc_type === 'TaxInvoice' ? 'INV' : 'CHL',
    docNo: doc.doc_no, docDate: new Date(doc.doc_date).toLocaleDateString('en-GB'),
    fromGstin: SELLER.gstin, fromTrdName: SELLER.name, fromAddr1: SELLER.address, fromStateCode: Number(SELLER.state_code),
    toGstin: doc.customer_gstin || 'URP', toTrdName: doc.customer_name, toAddr1: doc.customer_address || '', toStateCode: Number(doc.customer_state || 27),
    totalValue: Number(doc.taxable_value),
    cgstValue: Number(doc.cgst), sgstValue: Number(doc.sgst), igstValue: Number(doc.igst), cstValue: 0, epsgValue: 0,
    cessValue: 0,
    transporterId: '', transporterName: doc.carrier || '', transDocNo: doc.eway_awb || '', transMode: '1',
    vehicleNo: '', reasonCode: '', reasonRem: '', totalInvoiceValue: Number(doc.grand_total),
    itemNo: items.map((it, i) => i + 1),
    productName: items.map(it => it.description),
    productDesc: items.map(it => it.description),
    hsnCode: items.map(it => it.hsn_sac || '0000'),
    quantity: items.map(it => Number(it.qty)),
    taxableAmount: items.map(it => Number(it.amount)),
    cgstAmt: items.map(it => Number(it.amount) * Number(it.gst_rate) / 200),
    sgstAmt: items.map(it => Number(it.amount) * Number(it.gst_rate) / 200),
    igstAmt: items.map(it => doc.place_of_supply?.startsWith('Maharashtra') ? 0 : Number(it.amount) * Number(it.gst_rate) / 100),
    cessAmt: items.map(() => 0),
    unitPrice: items.map(it => Number(it.unit_price)),
    discount: items.map(() => 0),
    preTaxValue: items.map(it => Number(it.amount)),
    itemTotal: items.map(it => Number(it.amount))
  };
  res.setHeader('Content-Disposition', `attachment; filename="eway_${doc.doc_no}.json"`);
  res.json(json);
});

// Credit/Debit note from an invoice
router.post('/:id/credit-debit', requireModule('sales', 'can_create'), async (req, res) => {
  const { note_type, reason, items } = req.body; // note_type: CreditNote|DebitNote
  const [[doc]] = await pool.query('SELECT * FROM sales_documents WHERE id=?', [req.params.id]);
  if (!doc) return res.status(404).json({ error: 'Invoice not found' });
  const srcItems = items?.length ? items : (await pool.query('SELECT * FROM sales_doc_items WHERE doc_id=?', [doc.id]))[0];
  const pos = doc.place_of_supply;
  const g = computeGst(srcItems.map(i => ({ qty: note_type === 'CreditNote' ? -Math.abs(i.qty) : Math.abs(i.qty), unit_price: i.unit_price, gst_rate: i.gst_rate, description: i.description, item_id: i.item_id, hsn_sac: i.hsn_sac })), pos);
  const [[{ c: cnt }]] = await pool.query('SELECT COUNT(*) c FROM sales_documents');
  const doc_no = `${PREFIX[note_type]}-${new Date().getFullYear()}-${String(cnt + 1).padStart(3, '0')}`;
  const sign = note_type === 'CreditNote' ? -1 : 1;
  const [r] = await pool.query(
    `INSERT INTO sales_documents (doc_no,doc_type,customer_id,project_id,doc_date,place_of_supply,status,gst_status,taxable_value,cgst,sgst,igst,grand_total,notes,created_by)
     VALUES (?,?,?, ?, CURDATE(), ?, 'Issued','N/A', ?, ?, ?, ?, ?, ?, ?)`,
    [doc_no, note_type, doc.customer_id, doc.project_id, pos, sign * Math.abs(g.taxable), sign * Math.abs(g.cgst), sign * Math.abs(g.sgst), sign * Math.abs(g.igst), sign * Math.abs(g.grand), `${reason || ''} against ${doc.doc_no}`, req.session.user.id]);
  for (const ln of g.lines) {
    await pool.query('INSERT INTO sales_doc_items (doc_id,item_id,description,hsn_sac,qty,unit_price,gst_rate,amount) VALUES (?,?,?,?,?,?,?,?)',
      [r.insertId, ln.item_id || null, ln.description || '', ln.hsn_sac || '', ln.qty, ln.unit_price || 0, ln.gst_rate ?? 18, sign * Math.abs(ln.amount)]);
  }
  // credit note reduces receivable on original
  if (note_type === 'CreditNote') {
    await pool.query('UPDATE sales_documents SET paid_amount = paid_amount + ? WHERE id=?', [Math.abs(g.grand), doc.id]);
  }
  await logAudit(req, 'CREATE', note_type, `${doc_no} vs ${doc.doc_no}`);
  res.json({ id: r.insertId, doc_no });
});

// Receive payment
router.post('/:id/receive-payment', requireModule('sales', 'can_update'), async (req, res) => {
  const { amount, mode, ref_no, receipt_date } = req.body;
  const [[doc]] = await pool.query('SELECT * FROM sales_documents WHERE id=?', [req.params.id]);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  const [[{ c: cnt }]] = await pool.query('SELECT COUNT(*) c FROM receipts');
  const receipt_no = `RCPT-${new Date().getFullYear()}-${String(cnt + 1).padStart(3, '0')}`;
  await pool.query('INSERT INTO receipts (receipt_no,customer_id,doc_id,amount,mode,ref_no,receipt_date,notes) VALUES (?,?,?,?,?,?,COALESCE(?,CURDATE()),?)',
    [receipt_no, doc.customer_id, doc.id, amount || 0, mode || 'Bank', ref_no || '', receipt_date || null, `Against ${doc.doc_no}`]);
  await pool.query('UPDATE sales_documents SET paid_amount = paid_amount + ? WHERE id=?', [amount || 0, doc.id]);
  await logAudit(req, 'PAYMENT_RECEIVED', 'receipt', `${receipt_no} ₹${amount} vs ${doc.doc_no}`);
  res.json({ receipt_no });
});

// mark shipment of outward doc
router.post('/:id/ship', requireModule('sales', 'can_update'), async (req, res) => {
  const { carrier, awb_no } = req.body;
  const [[doc]] = await pool.query('SELECT * FROM sales_documents WHERE id=?', [req.params.id]);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  await pool.query('UPDATE sales_documents SET carrier=?, eway_awb=?, status=\'In-Transit\' WHERE id=?', [carrier || '', awb_no || '', doc.id]);
  await pool.query('UPDATE shipments SET carrier=?, awb_no=?, status=\'In-Transit\' WHERE sales_doc_id=?', [carrier || '', awb_no || '', doc.id]);
  await logAudit(req, 'SHIPMENT', 'sales_doc', `${doc.doc_no} AWB ${awb_no}`);
  res.json({ ok: true });
});

router.post('/:id/deliver', requireModule('sales', 'can_update'), async (req, res) => {
  await pool.query('UPDATE sales_documents SET status=\'Delivered\' WHERE id=?', [req.params.id]);
  await pool.query('UPDATE shipments SET status=\'Delivered\', delivered_date=CURDATE() WHERE sales_doc_id=?', [req.params.id]);
  res.json({ ok: true });
});

router.post('/:id/mark-gst-filed', requireModule('gst', 'can_update'), async (req, res) => {
  await pool.query('UPDATE sales_documents SET gst_status=\'Reconciled\' WHERE id=?', [req.params.id]);
  await logAudit(req, 'GST_MARK', 'sales_doc', req.params.id);
  res.json({ ok: true });
});

module.exports = router;
