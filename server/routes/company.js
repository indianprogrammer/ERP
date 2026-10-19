const express = require('express');
const { pool, logAudit, requireModule, authUser } = require('../lib/middleware');
const { getSettings } = require('./settings');
const router = express.Router();

const tid = (req) => req.tenantId;

// GET /api/company — current company profile (tenant + billing/invoice settings)
router.get('/', requireModule('admin'), async (req, res) => {
  const t = tid(req);
  if (!t) return res.status(403).json({ error: 'Company context required' });
  const [[tenant]] = await pool.query(
    `SELECT id, name, slug, domain, plan, status, trial_ends_at, subscription_ends_at, gstin, address, created_at
     FROM tenants WHERE id=?`, [t]);
  if (!tenant) return res.status(404).json({ error: 'Company not found' });
  const settings = await getSettings(t);
  res.json({ company: { ...tenant, settings } });
});

// PUT /api/company — update own company profile (no plan/status changes; those are billing-side)
router.put('/', requireModule('admin', 'can_update'), async (req, res) => {
  const t = tid(req);
  if (!t) return res.status(403).json({ error: 'Company context required' });
  const b = req.body || {};

  const tenantFields = {};
  if (b.name !== undefined) tenantFields.name = String(b.name).trim().slice(0, 150);
  if (b.gstin !== undefined) tenantFields.gstin = String(b.gstin).trim().toUpperCase() || null;
  if (b.address !== undefined) tenantFields.address = String(b.address).trim().slice(0, 400);
  if (b.slug !== undefined) {
    const slug = String(b.slug).trim().toLowerCase().slice(0, 80);
    if (!/^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$/.test(slug)) {
      return res.status(400).json({ error: 'Slug must be 3-80 chars: lowercase letters, numbers, hyphens' });
    }
    tenantFields.slug = slug;
  }
  if (b.domain !== undefined) tenantFields.domain = String(b.domain).trim().toLowerCase() || null;
  if (b.gstin && !/^[0-9A-Z]{15}$/.test(b.gstin)) {
    return res.status(400).json({ error: 'GSTIN must be 15 characters' });
  }
  if (tenantFields.name === '') return res.status(400).json({ error: 'Company name cannot be empty' });

  const tkeys = Object.keys(tenantFields);
  if (tkeys.length) {
    try {
      await pool.query(
        `UPDATE tenants SET ${tkeys.map(k => `${k}=?`).join(',')} WHERE id=?`,
        [...tkeys.map(k => tenantFields[k]), t]);
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Slug or domain already in use' });
      throw e;
    }
  }

  // Mirror profile fields into company_settings so invoices pick them up
  const settingMap = {};
  if (b.name !== undefined) settingMap.company_name = tenantFields.name;
  if (b.gstin !== undefined) settingMap.company_gstin = tenantFields.gstin || '';
  if (b.address !== undefined) settingMap.company_address = tenantFields.address;
  const SETTINGS_ALLOWED = ['company_name', 'company_address', 'company_gstin', 'company_pan', 'company_state_code',
    'company_phone', 'company_email', 'invoice_theme', 'receipt_theme', 'invoice_page_size', 'receipt_page_size',
    'terms_conditions', 'bank_name', 'bank_account_no', 'bank_ifsc', 'bank_branch', 'upi_id', 'qr_image'];
  for (const f of SETTINGS_ALLOWED) {
    if (b[f] !== undefined && settingMap[f] === undefined) settingMap[f] = b[f];
  }
  const skeys = Object.keys(settingMap);
  if (skeys.length) {
    const sql = `INSERT INTO company_settings (tenant_id, ${skeys.join(',')})
                 VALUES (?, ${skeys.map(() => '?').join(',')})
                 ON DUPLICATE KEY UPDATE ${skeys.map(k => `${k}=VALUES(${k})`).join(',')}`;
    await pool.query(sql, [t, ...skeys.map(k => settingMap[k])]);
  }

  await logAudit(req, 'UPDATE', 'company', [...tkeys, ...skeys].join(','));
  const [[tenant]] = await pool.query(
    `SELECT id, name, slug, domain, plan, status, trial_ends_at, subscription_ends_at, gstin, address, created_at
     FROM tenants WHERE id=?`, [t]);
  res.json({ ok: true, company: { ...(tenant || {}), settings: await getSettings(t) } });
});

// GET /api/company/team — light company directory (users in this company)
router.get('/team', requireModule('admin'), async (req, res) => {
  const [rows] = await pool.query(
    `SELECT u.id, u.username, u.full_name, r.name AS role, u.is_active, u.last_login
     FROM users u LEFT JOIN staff_roles r ON r.id=u.role_id
     WHERE u.tenant_id=? ORDER BY u.full_name`, [tid(req)]);
  res.json({ team: rows });
});

module.exports = router;
