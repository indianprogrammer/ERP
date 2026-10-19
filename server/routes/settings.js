const express = require('express');
const { pool, logAudit, requireModule } = require('../lib/middleware');
const { ensureStages } = require('../lib/leadStages');
const router = express.Router();

const tid = (req) => req.tenantId;

const DEFAULTS = {
  invoice_theme: 'classic', receipt_theme: 'simple', receipt_page_size: 'a5', invoice_page_size: 'a4', terms_conditions: '',
  bank_name: '', bank_account_no: '', bank_ifsc: '', bank_branch: '',
  upi_id: '', qr_image: '',
  company_name: '', company_address: '', company_gstin: '', company_pan: '',
  company_state_code: '27', company_phone: '', company_email: ''
};
const FIELDS = Object.keys(DEFAULTS);

async function getSettings(tenantId) {
  const [rows] = await pool.query('SELECT * FROM company_settings WHERE tenant_id=?', [tenantId]);
  const s = { ...DEFAULTS, ...(rows[0] || {}) };
  if (!s.company_name || !s.company_gstin || !s.company_address) {
    const [[t]] = await pool.query('SELECT name, gstin, address FROM tenants WHERE id=?', [tenantId]);
    if (t) {
      s.company_name = s.company_name || t.name || '';
      s.company_gstin = s.company_gstin || t.gstin || '';
      s.company_address = s.company_address || t.address || '';
    }
  }
  const out = {};
  for (const f of FIELDS) out[f] = s[f] ?? DEFAULTS[f];
  return out;
}

router.get('/', requireModule('admin'), async (req, res) => {
  res.json({ settings: await getSettings(tid(req)) });
});

router.put('/', requireModule('admin', 'can_update'), async (req, res) => {
  const vals = {};
  for (const f of FIELDS) if (req.body[f] !== undefined) vals[f] = req.body[f];
  if (vals.qr_image && String(vals.qr_image).length > 500000) {
    return res.status(400).json({ error: 'QR image too large (max ~350KB)' });
  }
  if (vals.invoice_page_size !== undefined && !['a4', 'letter', 'legal'].includes(vals.invoice_page_size)) {
    return res.status(400).json({ error: 'Page size must be a4, letter or legal' });
  }
  if (vals.receipt_page_size !== undefined && !['a4', 'a5'].includes(vals.receipt_page_size)) {
    return res.status(400).json({ error: 'Page size must be a4 or a5' });
  }
  const keys = Object.keys(vals);
  if (keys.length) {
    const sql = `INSERT INTO company_settings (tenant_id, ${keys.join(',')})
                 VALUES (?, ${keys.map(() => '?').join(',')})
                 ON DUPLICATE KEY UPDATE ${keys.map(k => `${k}=VALUES(${k})`).join(',')}`;
    await pool.query(sql, [tid(req), ...keys.map(k => vals[k])]);
    if (vals.company_name !== undefined || vals.company_gstin !== undefined || vals.company_address !== undefined) {
      await pool.query('UPDATE tenants SET name=COALESCE(?,name), gstin=COALESCE(?,gstin), address=COALESCE(?,address) WHERE id=?',
        [vals.company_name ?? null, vals.company_gstin ?? null, vals.company_address ?? null, tid(req)]);
    }
  }
  await logAudit(req, 'SETTINGS_UPDATE', 'settings', keys.join(','));
  res.json({ settings: await getSettings(tid(req)) });
});

// ---------- Lead stages (CRM pipeline) ----------
const HEX = /^#[0-9A-Fa-f]{6}$/;

router.get('/lead-stages', requireModule('admin'), async (req, res) => {
  await ensureStages(tid(req));
  const [stages] = await pool.query(
    `SELECT s.*, (SELECT COUNT(*) FROM leads l WHERE l.stage_id=s.id AND l.tenant_id=s.tenant_id) AS lead_count
     FROM lead_stages s WHERE s.tenant_id=? ORDER BY s.position, s.id`, [tid(req)]);
  res.json({ stages });
});

router.post('/lead-stages', requireModule('admin', 'can_update'), async (req, res) => {
  const name = String(req.body.name || '').trim().slice(0, 60);
  const color = String(req.body.color || '#5F6368');
  if (!name) return res.status(400).json({ error: 'Stage name required' });
  if (!HEX.test(color)) return res.status(400).json({ error: 'Color must be a hex value like #1A73E8' });
  try {
    const [[{ p }]] = await pool.query('SELECT COALESCE(MAX(position),0)+1 p FROM lead_stages WHERE tenant_id=?', [tid(req)]);
    const [r] = await pool.query('INSERT INTO lead_stages (tenant_id,name,position,color) VALUES (?,?,?,?)', [tid(req), name, p, color]);
    await logAudit(req, 'CREATE', 'lead_stage', name);
    res.json({ id: r.insertId });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'A stage with this name already exists' });
    throw e;
  }
});

router.put('/lead-stages/:id', requireModule('admin', 'can_update'), async (req, res) => {
  const [[stage]] = await pool.query('SELECT * FROM lead_stages WHERE id=? AND tenant_id=?', [req.params.id, tid(req)]);
  if (!stage) return res.status(404).json({ error: 'Stage not found' });
  const name = req.body.name !== undefined ? String(req.body.name).trim().slice(0, 60) : stage.name;
  const color = req.body.color !== undefined ? String(req.body.color) : stage.color;
  if (!name) return res.status(400).json({ error: 'Stage name required' });
  if (!HEX.test(color)) return res.status(400).json({ error: 'Color must be a hex value like #1A73E8' });
  try {
    await pool.query('UPDATE lead_stages SET name=?, color=? WHERE id=? AND tenant_id=?', [name, color, stage.id, tid(req)]);
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'A stage with this name already exists' });
    throw e;
  }
  await logAudit(req, 'UPDATE', 'lead_stage', `${stage.id}:${name}`);
  res.json({ ok: true });
});

router.post('/lead-stages/reorder', requireModule('admin', 'can_update'), async (req, res) => {
  const ids = (req.body.ids || []).map(Number).filter(Boolean);
  if (!ids.length) return res.status(400).json({ error: 'ids array required' });
  for (let i = 0; i < ids.length; i++) {
    await pool.query('UPDATE lead_stages SET position=? WHERE id=? AND tenant_id=?', [i + 1, ids[i], tid(req)]);
  }
  await logAudit(req, 'REORDER', 'lead_stage', ids.join(','));
  res.json({ ok: true });
});

router.delete('/lead-stages/:id', requireModule('admin', 'can_update'), async (req, res) => {
  const [[stage]] = await pool.query('SELECT * FROM lead_stages WHERE id=? AND tenant_id=?', [req.params.id, tid(req)]);
  if (!stage) return res.status(404).json({ error: 'Stage not found' });
  const [[{ cnt }]] = await pool.query('SELECT COUNT(*) cnt FROM leads WHERE stage_id=? AND tenant_id=?', [stage.id, tid(req)]);
  const [[{ total }]] = await pool.query('SELECT COUNT(*) total FROM lead_stages WHERE tenant_id=?', [tid(req)]);
  if (total <= 1) return res.status(400).json({ error: 'Cannot delete the last remaining stage' });
  if (cnt > 0) {
    const move = Number(req.body.move_to || req.query.move_to || 0);
    if (!move) return res.status(409).json({ error: `Stage has ${cnt} lead(s) — move them to another stage first`, lead_count: cnt });
    const [[tgt]] = await pool.query('SELECT id FROM lead_stages WHERE id=? AND tenant_id=?', [move, tid(req)]);
    if (!tgt) return res.status(400).json({ error: 'Target stage not found' });
    await pool.query('UPDATE leads SET stage_id=? WHERE stage_id=? AND tenant_id=?', [move, stage.id, tid(req)]);
  }
  await pool.query('DELETE FROM lead_stages WHERE id=? AND tenant_id=?', [stage.id, tid(req)]);
  await logAudit(req, 'DELETE', 'lead_stage', stage.name);
  res.json({ ok: true });
});

module.exports = router;
module.exports.getSettings = getSettings;
