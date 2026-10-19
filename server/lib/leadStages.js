const pool = require('../db/pool');

const DEFAULT_STAGES = [
  ['New', '#1A73E8'], ['Contacted', '#F9AB00'], ['Requirement Gathering', '#E37400'],
  ['Proposal Sent', '#A142F4'], ['Won', '#1E8E3E'], ['Lost', '#D93025']
];

async function ensureStages(tenantId) {
  const [[{ c }]] = await pool.query('SELECT COUNT(*) c FROM lead_stages WHERE tenant_id=?', [tenantId]);
  if (c > 0) return;
  for (let i = 0; i < DEFAULT_STAGES.length; i++) {
    await pool.query('INSERT IGNORE INTO lead_stages (tenant_id, name, position, color) VALUES (?,?,?,?)',
      [tenantId, DEFAULT_STAGES[i][0], i + 1, DEFAULT_STAGES[i][1]]);
  }
}

async function firstStageId(tenantId) {
  await ensureStages(tenantId);
  const [[f]] = await pool.query('SELECT id FROM lead_stages WHERE tenant_id=? ORDER BY position, id LIMIT 1', [tenantId]);
  return f ? f.id : 1;
}

async function wonStageId(tenantId) {
  await ensureStages(tenantId);
  const [[w]] = await pool.query("SELECT id FROM lead_stages WHERE tenant_id=? AND name='Won' LIMIT 1", [tenantId]);
  if (w) return w.id;
  const [[l]] = await pool.query('SELECT id FROM lead_stages WHERE tenant_id=? ORDER BY position DESC, id DESC LIMIT 1', [tenantId]);
  return l ? l.id : 1;
}

module.exports = { ensureStages, firstStageId, wonStageId, DEFAULT_STAGES };
