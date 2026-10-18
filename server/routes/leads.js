const express = require('express');
const { pool, logAudit, requireModule } = require('../lib/middleware');
const router = express.Router();

const tid = (req) => req.tenantId;

router.get('/', requireModule('crm'), async (req, res) => {
  const [stages] = await pool.query('SELECT * FROM lead_stages WHERE tenant_id=? ORDER BY position', [tid(req)]);
  const [leads] = await pool.query(
    `SELECT l.*, u.full_name owner_name FROM leads l LEFT JOIN users u ON u.id=l.owner_id AND u.tenant_id=? WHERE l.tenant_id=? ORDER BY l.id DESC`, [tid(req), tid(req)]);
  res.json({ stages, leads });
});

router.post('/', requireModule('crm', 'can_create'), async (req, res) => {
  const { title, company, contact_name, phone, email, value, stage_id, notes } = req.body;
  if (!title) return res.status(400).json({ error: 'Lead title required' });
  const [r] = await pool.query(
    'INSERT INTO leads (tenant_id,title,company,contact_name,phone,email,value,stage_id,notes,owner_id) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [tid(req), title, company || '', contact_name || '', phone || '', email || '', value || 0, stage_id || 1, notes || '', req.session.user.id]);
  await logAudit(req, 'CREATE', 'lead', title);
  res.json({ id: r.insertId });
});

router.put('/:id', requireModule('crm', 'can_update'), async (req, res) => {
  const { title, company, contact_name, phone, email, value, stage_id, notes } = req.body;
  await pool.query(
    'UPDATE leads SET title=?,company=?,contact_name=?,phone=?,email=?,value=?,stage_id=?,notes=? WHERE id=? AND tenant_id=?',
    [title, company || '', contact_name || '', phone || '', email || '', value || 0, stage_id || 1, notes || '', req.params.id, tid(req)]);
  res.json({ ok: true });
});

router.post('/:id/move', requireModule('crm', 'can_update'), async (req, res) => {
  const { stage_id } = req.body;
  await pool.query('UPDATE leads SET stage_id=? WHERE id=? AND tenant_id=?', [stage_id, req.params.id, tid(req)]);
  await logAudit(req, 'LEAD_MOVE', 'lead', `${req.params.id}→stage${stage_id}`);
  res.json({ ok: true });
});

router.post('/:id/convert', requireModule('crm', 'can_approve'), async (req, res) => {
  const { create_invoice, gstin, place_of_supply } = req.body;
  const [[lead]] = await pool.query('SELECT * FROM leads WHERE id=? AND tenant_id=?', [req.params.id, tid(req)]);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  let [[cust]] = await pool.query('SELECT * FROM customers WHERE name=? AND tenant_id=?', [lead.company || lead.title, tid(req)]);
  if (!cust) {
    const [r] = await pool.query('INSERT INTO customers (tenant_id,name,gstin,contact_person,phone,email,place_of_supply) VALUES (?,?,?,?,?,?,?)',
      [tid(req), lead.company || lead.title, gstin || null, lead.contact_name, lead.phone, lead.email, place_of_supply || 'Maharashtra']);
    cust = { id: r.insertId };
  }
  let doc = null;
  if (create_invoice && lead.value > 0) {
    const gstRate = 18;
    const taxable = Number(lead.value);
    const tax = taxable * gstRate / 100;
    const inter = !(place_of_supply || 'Maharashtra').startsWith('Maharashtra');
    const [[{ c: cnt }]] = await pool.query('SELECT COUNT(*) c FROM sales_documents WHERE tenant_id=?', [tid(req)]);
    const doc_no = `INV-${new Date().getFullYear()}-${String(cnt + 1).padStart(3, '0')}`;
    const [r] = await pool.query(
      `INSERT INTO sales_documents (tenant_id,doc_no,doc_type,customer_id,doc_date,place_of_supply,status,gst_status,taxable_value,cgst,sgst,igst,grand_total,notes,created_by)
       VALUES (?, ?, 'TaxInvoice', CURDATE(), ?, 'Issued','Pending GSTR-1', ?, ?, ?, ?, ?, ?, ?)`,
      [tid(req), doc_no, cust.id, place_of_supply || 'Maharashtra', taxable, inter ? 0 : tax / 2, inter ? 0 : tax / 2, inter ? tax : 0, taxable + tax, `Converted from lead: ${lead.title}`, req.session.user.id]);
    await pool.query('INSERT INTO sales_doc_items (tenant_id,doc_id,description,hsn_sac,qty,unit_price,gst_rate,amount) VALUES (?,?,?,?,?,?,?,?)',
      [tid(req), r.insertId, lead.title, '998315', 1, taxable, gstRate, taxable]);
    await pool.query('UPDATE leads SET converted_doc_id=?, stage_id=5 WHERE id=? AND tenant_id=?', [r.insertId, lead.id, tid(req)]);
    doc = { id: r.insertId, doc_no };
  } else {
    await pool.query('UPDATE leads SET stage_id=5 WHERE id=? AND tenant_id=?', [lead.id, tid(req)]);
  }
  await logAudit(req, 'LEAD_CONVERT', 'lead', `${lead.title}→customer#${cust.id}${doc ? ' invoice ' + doc.doc_no : ''}`);
  res.json({ customer_id: cust.id, doc });
});

router.delete('/:id', requireModule('crm', 'can_delete'), async (req, res) => {
  await pool.query('DELETE FROM leads WHERE id=? AND tenant_id=?', [req.params.id, tid(req)]);
  await logAudit(req, 'DELETE', 'lead', req.params.id);
  res.json({ ok: true });
});
module.exports = router;
