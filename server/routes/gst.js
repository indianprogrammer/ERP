const express = require('express');
const { pool, logAudit, requireModule } = require('../lib/middleware');
const router = express.Router();

// GSTR-2B import (simulates GSP/ASP pull from GST Portal) + reconciliation
router.post('/gstr2b/import', requireModule('gst', 'can_create'), async (req, res) => {
  const { period, lines = [] } = req.body; // YYYY-MM
  if (!period || !lines.length) return res.status(400).json({ error: 'Period and lines required' });
  await pool.query('DELETE FROM gstr2b_lines WHERE period=?', [period]);
  let [[ret]] = await pool.query('SELECT * FROM gst_returns WHERE return_type=\'GSTR2B\' AND period=?', [period]);
  if (!ret) {
    const [r] = await pool.query('INSERT INTO gst_returns (return_type,period,status) VALUES (\'GSTR2B\',?,\'Imported\')', [period]);
    ret = { id: r.insertId };
  }
  for (const ln of lines) {
    await pool.query(
      `INSERT INTO gstr2b_lines (return_id,period,vendor_gstin,vendor_name,invoice_no,invoice_date,taxable_value,tax_amount,invoice_value)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [ret.id, period, ln.vendor_gstin, ln.vendor_name || '', ln.invoice_no, ln.invoice_date || null, ln.taxable_value || 0, ln.tax_amount || 0, ln.invoice_value || 0]);
  }
  await pool.query('UPDATE gst_returns SET status=\'Reconciled\' WHERE id=?', [ret.id]);
  await logAudit(req, 'GSTR2B_IMPORT', 'gst', `${period} · ${lines.length} lines`);
  res.json({ ok: true, count: lines.length });
});

// Reconcile GSTR-2B vs ERP vendor bills (POs)
router.get('/gstr2b/reconcile', requireModule('gst'), async (req, res) => {
  const period = req.query.period || new Date().toISOString().slice(0, 7);
  const [lines] = await pool.query('SELECT * FROM gstr2b_lines WHERE period=? ORDER BY invoice_date', [period]);
  const [pos] = await pool.query(
    `SELECT p.*, v.gstin vendor_gstin, v.name vendor_name FROM purchase_orders p JOIN vendors v ON v.id=p.vendor_id
     WHERE DATE_FORMAT(p.order_date,'%Y-%m')=?`, [period]);
  const poByKey = {};
  for (const p of pos) poByKey[`${p.vendor_gstin}|${p.po_no}`] = p;
  const erpByGstinInv = {};
  for (const p of pos) erpByGstinInv[`${p.vendor_gstin}|${p.po_no}`] = p;

  const results = [];
  const matchedPoIds = new Set();
  for (const ln of lines) {
    const key = `${ln.vendor_gstin}|${ln.invoice_no}`;
    const po = erpByGstinInv[key];
    let status = 'MissingInERP', erpValue = null;
    if (po) {
      matchedPoIds.add(po.id);
      erpValue = Number(po.grand_total);
      const portalVal = Number(ln.invoice_value);
      status = Math.abs(erpValue - portalVal) < 1 ? 'Matched' : 'TaxMismatch';
    }
    await pool.query('UPDATE gstr2b_lines SET match_status=?, erp_po_id=? WHERE id=?', [status, po?.id || null, ln.id]);
    results.push({ ...ln, match_status: status, erp_po_id: po?.id || null, erp_value: erpValue });
  }
  // ERP bills missing from portal
  const missingInPortal = pos.filter(p => !matchedPoIds.has(p.id)).map(p => ({ ...p, match_status: 'MissingInPortal' }));
  const summary = {
    total: results.length, matched: results.filter(r => r.match_status === 'Matched').length,
    mismatch: results.filter(r => r.match_status === 'TaxMismatch').length,
    missingInErp: results.filter(r => r.match_status === 'MissingInERP').length,
    missingInPortal: missingInPortal.length
  };
  res.json({ period, results, missingInPortal, summary });
});

// GSTR-1 / GSTR-3B JSON export from issued invoices
router.get('/:type/export', requireModule('gst', 'can_export'), async (req, res) => {
  const type = req.params.type.toUpperCase(); // GSTR1 | GSTR3B
  const period = req.query.period || new Date().toISOString().slice(0, 7);
  const [docs] = await pool.query(
    `SELECT d.*, c.name customer_name, c.gstin customer_gstin, c.state_code
     FROM sales_documents d JOIN customers c ON c.id=d.customer_id
     WHERE d.doc_type IN ('TaxInvoice','CreditNote','DebitNote') AND DATE_FORMAT(d.doc_date,'%Y-%m')=?`, [period]);
  let payload;
  if (type === 'GSTR1') {
    payload = {
      gstin: '27AAAAA0000A1Z5', fp: period.replace('-', ''),
      b2b: [{
        ctin: '27AAAAA0000A1Z5', cname: 'SAMPLE',
        inv: docs.filter(d => d.doc_type === 'TaxInvoice').map(d => ({
          inum: d.doc_no, idt: new Date(d.doc_date).toISOString().slice(0, 10),
          val: Number(d.grand_total), pos: d.place_of_supply, typ: 'R',
          itms: [{ num: 1, itm_det: { txval: Number(d.taxable_value), camt: Number(d.cgst), samt: Number(d.sgst), iamt: Number(d.igst), csamt: 0 } }]
        }))
      }],
      cdn: docs.filter(d => d.doc_type === 'CreditNote' || d.doc_type === 'DebitNote').map(d => ({
        ntty: d.doc_type === 'CreditNote' ? 'C' : 'D', nt_num: d.doc_no,
        nt_dt: new Date(d.doc_date).toISOString().slice(0, 10), val: Math.abs(Number(d.grand_total))
      })),
      summary: { count: docs.length, taxable: docs.reduce((s, d) => s + Math.abs(Number(d.taxable_value)), 0), tax: docs.reduce((s, d) => s + Math.abs(Number(d.cgst) + Number(d.sgst) + Number(d.igst)), 0) }
    };
  } else {
    const taxable = docs.reduce((s, d) => s + Number(d.taxable_value), 0);
    const igst = docs.reduce((s, d) => s + Number(d.igst), 0);
    const cgst = docs.reduce((s, d) => s + Number(d.cgst), 0);
    const sgst = docs.reduce((s, d) => s + Number(d.sgst), 0);
    payload = {
      gstin: '27AAAAA0000A1Z5', period, ret_type: '3B',
      sup: { taxable_value: taxable, igst, cgst, sgst, cess: 0, total_tax: igst + cgst + sgst },
      inter_state_sup: { taxable_value: docs.filter(d => Number(d.igst) > 0).reduce((s, d) => s + Number(d.taxable_value), 0), igst },
      intra_state_sup: { taxable_value: docs.filter(d => Number(d.cgst) > 0).reduce((s, d) => s + Number(d.taxable_value), 0), cgst, sgst },
      doc_count: docs.length
    };
  }
  // record return
  const rtype = type === 'GSTR1' ? 'GSTR1' : 'GSTR3B';
  await pool.query(
    `INSERT INTO gst_returns (return_type,period,status,payload) VALUES (?,?, 'Prepared', ?)
     ON DUPLICATE KEY UPDATE status='Prepared', payload=VALUES(payload)`, [rtype, period, JSON.stringify(payload)]);
  await logAudit(req, 'GST_EXPORT', rtype, period);
  res.setHeader('Content-Disposition', `attachment; filename="${rtype}_${period}.json"`);
  res.json(payload);
});

// file return (mark submitted — DSC/EVC placeholder)
router.post('/:type/file', requireModule('gst', 'can_approve'), async (req, res) => {
  const rtype = req.params.type.toUpperCase();
  const { period, mode } = req.body; // DSC | EVC
  await pool.query(
    `INSERT INTO gst_returns (return_type,period,status,reference_no,filed_at) VALUES (?,?, 'Filed', ?, NOW())
     ON DUPLICATE KEY UPDATE status='Filed', reference_no=VALUES(reference_no), filed_at=NOW()`,
    [rtype, period, `ACK-${Date.now().toString().slice(-10)}`]);
  if (rtype === 'GSTR1') await pool.query('UPDATE sales_documents SET gst_status=\'Filed\' WHERE DATE_FORMAT(doc_date,\'%Y-%m\')=? AND doc_type=\'TaxInvoice\'', [period]);
  await logAudit(req, 'GST_FILE', rtype, `${period} via ${mode || 'EVC'}`);
  res.json({ ok: true, mode: mode || 'EVC' });
});

router.get('/returns', requireModule('gst'), async (req, res) => {
  const [rows] = await pool.query('SELECT id,return_type,period,status,reference_no,filed_at FROM gst_returns ORDER BY period DESC, return_type');
  res.json({ returns: rows });
});

// GST portal connection status
router.get('/status', async (req, res) => {
  res.json({ connected: true, portal: 'GST Portal (GSP Sandbox)', gstin: '27AAAAA0000A1Z5', last_sync: new Date().toISOString() });
});

module.exports = router;
