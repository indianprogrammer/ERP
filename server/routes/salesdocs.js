const express = require('express');
const { pool, logAudit, requireModule } = require('../lib/middleware');
const { deductStockForDoc } = require('./stock');
const { getSettings } = require('./settings');
const router = express.Router();

const SELLER = { name: 'X3M Systems Pvt Ltd', gstin: '27AAAAA0000A1Z5', pan: 'AAAAA0000A', address: 'BKC, Mumbai 400051', state_code: '27' };
const OUR_STATE = '27';
const PREFIX = { Proforma: 'PI', TaxInvoice: 'INV', DeliveryChallan: 'CH', CreditNote: 'CN', DebitNote: 'DN' };
const tid = (req) => req.tenantId;

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
  return { lines, taxable, tax, cgst: isInterState ? 0 : tax / 2, sgst: isInterState ? 0 : tax / 2, igst: isInterState ? tax : 0, grand: taxable + tax, isInterState };
}

router.get('/', requireModule('sales'), async (req, res) => {
  let where = 'd.tenant_id=?', p = [tid(req)];
  if (req.query.type) { where = 'd.tenant_id=? AND d.doc_type=?'; p = [tid(req), req.query.type]; }
  const [rows] = await pool.query(
    `SELECT d.*, c.name customer_name, c.gstin customer_gstin,
      DATEDIFF(CURDATE(), d.due_date) overdue_days
     FROM sales_documents d JOIN customers c ON c.id=d.customer_id AND c.tenant_id=? WHERE ${where}
     ORDER BY d.id DESC LIMIT 100`, [tid(req), ...p]);
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
     FROM sales_documents d JOIN customers c ON c.id=d.customer_id AND c.tenant_id=?
     WHERE d.tenant_id=? AND d.doc_type='TaxInvoice' AND d.grand_total > d.paid_amount AND d.status <> 'Cancelled'
     ORDER BY d.due_date`, [tid(req), tid(req)]);
  const buckets = { Current: 0, '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  for (const r of rows) buckets[r.bucket] += Number(r.outstanding);
  res.json({ rows, buckets });
});

router.get('/ledger', requireModule('sales'), async (req, res) => {
  const cid = Number(req.query.customer_id) || null;
  const from = req.query.from || null;
  const to = req.query.to || null;
  if (!cid) {
    const [rows] = await pool.query(
      `SELECT c.id, c.name,
         COALESCE(d.debit,0) debit, COALESCE(r.credit,0) credit
       FROM customers c
       LEFT JOIN (SELECT customer_id,
                    SUM(CASE WHEN doc_type='CreditNote' THEN -ABS(grand_total) ELSE grand_total END) debit
                  FROM sales_documents
                  WHERE tenant_id=? AND status<>'Cancelled' AND doc_type IN ('TaxInvoice','DebitNote','CreditNote')
                  GROUP BY customer_id) d ON d.customer_id=c.id
       LEFT JOIN (SELECT customer_id, SUM(amount) credit FROM receipts WHERE tenant_id=? GROUP BY customer_id) r ON r.customer_id=c.id
       WHERE c.tenant_id=? AND c.is_active=1 ORDER BY c.name`, [tid(req), tid(req), tid(req)]);
    return res.json({ summary: rows.map(x => ({ ...x, debit: Number(x.debit), credit: Number(x.credit), balance: Number(x.debit) - Number(x.credit) })) });
  }
  const [[cust]] = await pool.query('SELECT * FROM customers WHERE id=? AND tenant_id=?', [cid, tid(req)]);
  if (!cust) return res.status(404).json({ error: 'Customer not found' });
  const union = `
    SELECT d.doc_date dt, d.doc_no, d.doc_type type, d.id rid,
      CASE WHEN d.doc_type='CreditNote' THEN 0 ELSE d.grand_total END debit,
      CASE WHEN d.doc_type='CreditNote' THEN ABS(d.grand_total) ELSE 0 END credit
    FROM sales_documents d
    WHERE d.tenant_id=? AND d.customer_id=? AND d.doc_type IN ('TaxInvoice','DebitNote','CreditNote') AND d.status<>'Cancelled'
    UNION ALL
    SELECT r.receipt_date dt, r.receipt_no, 'Receipt' type, r.id rid, 0 debit, r.amount credit
    FROM receipts r WHERE r.tenant_id=? AND r.customer_id=?`;
  const base = [tid(req), cid, tid(req), cid];
  let sql = `SELECT * FROM (${union}) t`;
  const p = [...base];
  if (from) { sql += ' WHERE dt >= ?'; p.push(from); }
  if (to) { sql += (from ? ' AND' : ' WHERE') + ' dt <= ?'; p.push(to); }
  sql += ' ORDER BY dt, rid';
  const [rows] = await pool.query(sql, p);
  let opening = 0;
  if (from) {
    const [[o]] = await pool.query(`SELECT COALESCE(SUM(debit-credit),0) bal FROM (${union}) t WHERE dt < ?`, [...base, from]);
    opening = Number(o.bal);
  }
  let bal = opening;
  const entries = rows.map(r => {
    const debit = Number(r.debit), credit = Number(r.credit);
    bal += debit - credit;
    return { date: r.dt, doc_no: r.doc_no, type: r.type, debit, credit, balance: bal };
  });
  const totals = entries.reduce((a, e) => ({ debit: a.debit + e.debit, credit: a.credit + e.credit }), { debit: 0, credit: 0 });
  res.json({ customer: { id: cust.id, name: cust.name, gstin: cust.gstin, place_of_supply: cust.place_of_supply }, opening, entries, totals, closing: bal });
});

router.get('/:id', requireModule('sales'), async (req, res) => {
  const [[doc]] = await pool.query(
    `SELECT d.*, c.name customer_name, c.gstin customer_gstin, c.address customer_address, c.state_code customer_state, c.place_of_supply
     FROM sales_documents d JOIN customers c ON c.id=d.customer_id AND c.tenant_id=? WHERE d.id=? AND d.tenant_id=?`, [tid(req), req.params.id, tid(req)]);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  const [items] = await pool.query('SELECT * FROM sales_doc_items WHERE doc_id=? AND tenant_id=?', [req.params.id, tid(req)]);
  const [receipts] = await pool.query('SELECT * FROM receipts WHERE doc_id=? AND tenant_id=? ORDER BY id', [req.params.id, tid(req)]);
  res.json({ doc, items, receipts });
});

router.post('/', requireModule('sales', 'can_create'), async (req, res) => {
  const { doc_type, customer_id, project_id, warehouse_id, place_of_supply, po_ref, carrier, eway_awb, due_date, notes, items = [], from_lead } = req.body;
  if (!doc_type || !customer_id) return res.status(400).json({ error: 'Document type and customer required' });
  if (!items.length) return res.status(400).json({ error: 'Add at least one line item' });
  const [[cust]] = await pool.query('SELECT * FROM customers WHERE id=? AND tenant_id=?', [customer_id, tid(req)]);
  const pos = place_of_supply || cust?.place_of_supply || 'Maharashtra (27)';
  const g = computeGst(items, pos);
  const [[{ c: cnt }]] = await pool.query('SELECT COUNT(*) c FROM sales_documents WHERE tenant_id=?', [tid(req)]);
  const doc_no = `${PREFIX[doc_type] || 'DOC'}-${new Date().getFullYear()}-${String(cnt + 1).padStart(3, '0')}`;
  const isCredit = doc_type === 'CreditNote';
  const sign = isCredit ? -1 : 1;
  const [r] = await pool.query(
    `INSERT INTO sales_documents (tenant_id,doc_no,doc_type,customer_id,project_id,warehouse_id,doc_date,place_of_supply,po_ref,carrier,eway_awb,status,gst_status,taxable_value,cgst,sgst,igst,grand_total,due_date,notes,created_by)
     VALUES (?,?,?,?, ?, ?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [tid(req), doc_no, doc_type, customer_id, project_id || null, warehouse_id || null, pos, po_ref || '', carrier || '', eway_awb || '',
      doc_type === 'TaxInvoice' ? 'Issued' : (doc_type === 'DeliveryChallan' ? 'Dispatched' : 'Issued'),
      doc_type === 'TaxInvoice' ? 'Pending GSTR-1' : 'N/A',
      sign * g.taxable, sign * g.cgst, sign * g.sgst, sign * g.igst, sign * g.grand,
      due_date || null, notes || '', req.session.user.id]);
  for (const ln of g.lines) {
    await pool.query('INSERT INTO sales_doc_items (tenant_id,doc_id,item_id,description,hsn_sac,qty,unit_price,gst_rate,amount) VALUES (?,?,?,?,?,?,?,?,?)',
      [tid(req), r.insertId, ln.item_id || null, ln.description || '', ln.hsn_sac || '', ln.qty || 1, ln.unit_price || 0, ln.gst_rate ?? 18, sign * ln.amount]);
  }
  if (project_id) await pool.query('INSERT IGNORE INTO project_links (tenant_id,project_id,ref_type,ref_id,amount) VALUES (?,?,\'SALE\',?,?)', [tid(req), project_id, r.insertId, sign * g.grand]);
  if (doc_type === 'TaxInvoice' || doc_type === 'DeliveryChallan') {
    await deductStockForDoc(r.insertId, req.session.user.id, tid(req));
    if (carrier || eway_awb) {
      await pool.query('INSERT INTO shipments (tenant_id,sales_doc_id,carrier,awb_no,status,shipped_date) VALUES (?,?,?,?,\'In-Transit\',CURDATE())',
        [tid(req), r.insertId, carrier || '', eway_awb || '']);
    }
  }
  if (from_lead) await pool.query('UPDATE leads SET converted_doc_id=? WHERE id=? AND tenant_id=?', [r.insertId, from_lead, tid(req)]);
  await logAudit(req, 'CREATE', `sales_${doc_type}`, doc_no);
  res.json({ id: r.insertId, doc_no, grand_total: g.grand, gst: { cgst: g.cgst, sgst: g.sgst, igst: g.igst, inter: g.isInterState } });
});

router.get('/:id/eway-json', requireModule('sales', 'can_export'), async (req, res) => {
  const [[doc]] = await pool.query(
    `SELECT d.*, c.name customer_name, c.gstin customer_gstin, c.address customer_address, c.state_code customer_state
     FROM sales_documents d JOIN customers c ON c.id=d.customer_id AND c.tenant_id=? WHERE d.id=? AND d.tenant_id=?`, [tid(req), req.params.id, tid(req)]);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  const [items] = await pool.query('SELECT * FROM sales_doc_items WHERE doc_id=? AND tenant_id=?', [req.params.id, tid(req)]);
  const supplyType = doc.place_of_supply?.startsWith('Maharashtra') ? 'O' : 'S';
  const seller = await getSettings(tid(req));
  const json = {
    version: '1.0.3', transactionType: 'OUTWARD', supplyType,
    docType: doc.doc_type === 'TaxInvoice' ? 'INV' : 'CHL',
    docNo: doc.doc_no, docDate: new Date(doc.doc_date).toLocaleDateString('en-GB'),
    fromGstin: seller.company_gstin || SELLER.gstin, fromTrdName: seller.company_name || SELLER.name,
    fromAddr1: seller.company_address || SELLER.address, fromStateCode: Number(seller.company_state_code || SELLER.state_code),
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

router.post('/:id/credit-debit', requireModule('sales', 'can_create'), async (req, res) => {
  const { note_type, reason, items } = req.body;
  const [[doc]] = await pool.query('SELECT * FROM sales_documents WHERE id=? AND tenant_id=?', [req.params.id, tid(req)]);
  if (!doc) return res.status(404).json({ error: 'Invoice not found' });
  const srcItems = items?.length ? items : (await pool.query('SELECT * FROM sales_doc_items WHERE doc_id=? AND tenant_id=?', [doc.id, tid(req)]))[0];
  const pos = doc.place_of_supply;
  const g = computeGst(srcItems.map(i => ({ qty: note_type === 'CreditNote' ? -Math.abs(i.qty) : Math.abs(i.qty), unit_price: i.unit_price, gst_rate: i.gst_rate, description: i.description, item_id: i.item_id, hsn_sac: i.hsn_sac })), pos);
  const [[{ c: cnt }]] = await pool.query('SELECT COUNT(*) c FROM sales_documents WHERE tenant_id=?', [tid(req)]);
  const doc_no = `${PREFIX[note_type]}-${new Date().getFullYear()}-${String(cnt + 1).padStart(3, '0')}`;
  const sign = note_type === 'CreditNote' ? -1 : 1;
  const [r] = await pool.query(
    `INSERT INTO sales_documents (tenant_id,doc_no,doc_type,customer_id,project_id,doc_date,place_of_supply,status,gst_status,taxable_value,cgst,sgst,igst,grand_total,notes,created_by)
     VALUES (?,?,?, ?, ?, CURDATE(), ?, 'Issued','N/A', ?, ?, ?, ?, ?, ?, ?)`,
    [tid(req), doc_no, note_type, doc.customer_id, doc.project_id, pos, sign * Math.abs(g.taxable), sign * Math.abs(g.cgst), sign * Math.abs(g.sgst), sign * Math.abs(g.igst), sign * Math.abs(g.grand), `${reason || ''} against ${doc.doc_no}`, req.session.user.id]);
  for (const ln of g.lines) {
    await pool.query('INSERT INTO sales_doc_items (tenant_id,doc_id,item_id,description,hsn_sac,qty,unit_price,gst_rate,amount) VALUES (?,?,?,?,?,?,?,?,?)',
      [tid(req), r.insertId, ln.item_id || null, ln.description || '', ln.hsn_sac || '', ln.qty, ln.unit_price || 0, ln.gst_rate ?? 18, sign * Math.abs(ln.amount)]);
  }
  if (note_type === 'CreditNote') {
    await pool.query('UPDATE sales_documents SET paid_amount = paid_amount + ? WHERE id=? AND tenant_id=?', [Math.abs(g.grand), doc.id, tid(req)]);
  }
  await logAudit(req, 'CREATE', note_type, `${doc_no} vs ${doc.doc_no}`);
  res.json({ id: r.insertId, doc_no });
});

router.post('/:id/receive-payment', requireModule('sales', 'can_update'), async (req, res) => {
  const { amount, mode, ref_no, receipt_date } = req.body;
  const [[doc]] = await pool.query('SELECT * FROM sales_documents WHERE id=? AND tenant_id=?', [req.params.id, tid(req)]);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  const [[{ c: cnt }]] = await pool.query('SELECT COUNT(*) c FROM receipts WHERE tenant_id=?', [tid(req)]);
  const receipt_no = `RCPT-${new Date().getFullYear()}-${String(cnt + 1).padStart(3, '0')}`;
  await pool.query('INSERT INTO receipts (tenant_id,receipt_no,customer_id,doc_id,amount,mode,ref_no,receipt_date,notes) VALUES (?,?,?,?,?,?,?,COALESCE(?,CURDATE()),?)',
    [tid(req), receipt_no, doc.customer_id, doc.id, amount || 0, mode || 'Bank', ref_no || '', receipt_date || null, `Against ${doc.doc_no}`]);
  await pool.query('UPDATE sales_documents SET paid_amount = paid_amount + ? WHERE id=? AND tenant_id=?', [amount || 0, doc.id, tid(req)]);
  await logAudit(req, 'PAYMENT_RECEIVED', 'receipt', `${receipt_no} ₹${amount} vs ${doc.doc_no}`);
  const [[receipt]] = await pool.query(
    `SELECT r.*, c.name customer_name, d.doc_no FROM receipts r
     JOIN customers c ON c.id=r.customer_id LEFT JOIN sales_documents d ON d.id=r.doc_id
     WHERE r.tenant_id=? AND r.receipt_no=?`, [tid(req), receipt_no]);
  res.json({ receipt_no, receipt });
});

router.post('/:id/ship', requireModule('sales', 'can_update'), async (req, res) => {
  const { carrier, awb_no } = req.body;
  const [[doc]] = await pool.query('SELECT * FROM sales_documents WHERE id=? AND tenant_id=?', [req.params.id, tid(req)]);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  await pool.query('UPDATE sales_documents SET carrier=?, eway_awb=?, status=\'In-Transit\' WHERE id=? AND tenant_id=?', [carrier || '', awb_no || '', doc.id, tid(req)]);
  await pool.query('UPDATE shipments SET carrier=?, awb_no=?, status=\'In-Transit\' WHERE sales_doc_id=? AND tenant_id=?', [carrier || '', awb_no || '', doc.id, tid(req)]);
  await logAudit(req, 'SHIPMENT', 'sales_doc', `${doc.doc_no} AWB ${awb_no}`);
  res.json({ ok: true });
});

router.post('/:id/deliver', requireModule('sales', 'can_update'), async (req, res) => {
  await pool.query('UPDATE sales_documents SET status=\'Delivered\' WHERE id=? AND tenant_id=?', [req.params.id, tid(req)]);
  await pool.query('UPDATE shipments SET status=\'Delivered\', delivered_date=CURDATE() WHERE sales_doc_id=? AND tenant_id=?', [req.params.id, tid(req)]);
  res.json({ ok: true });
});

router.post('/:id/mark-gst-filed', requireModule('gst', 'can_update'), async (req, res) => {
  await pool.query('UPDATE sales_documents SET gst_status=\'Reconciled\' WHERE id=? AND tenant_id=?', [req.params.id, tid(req)]);
  await logAudit(req, 'GST_MARK', 'sales_doc', req.params.id);
  res.json({ ok: true });
});

module.exports = router;
