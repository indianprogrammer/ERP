#!/usr/bin/env node
// Seeds the global HSN/SAC + GST-rate master from the public India HSN & SAC dataset.
// Usage:
//   node scripts/seed-hsn.js              # load from local cache (downloads first if missing)
//   node scripts/seed-hsn.js --download   # force re-download from GitHub
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');
const mysql = require('mysql2/promise');

const SRC_URL = 'https://raw.githubusercontent.com/vikasrami/India-HSN-SAC-Master/main/India-HSN-SAC-Master.json';
const CACHE = path.join(__dirname, '..', 'data', 'hsn', 'india-hsn-sac-master.json');

function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) return resolve(download(res.headers.location));
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode} from ${url}`)); }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

(async () => {
  const force = process.argv.includes('--download');
  if (force || !fs.existsSync(CACHE)) {
    process.stdout.write(`Downloading HSN/SAC dataset from ${SRC_URL} … `);
    const buf = await download(SRC_URL);
    fs.mkdirSync(path.dirname(CACHE), { recursive: true });
    fs.writeFileSync(CACHE, buf);
    console.log(`saved ${(buf.length / 1024 / 1024).toFixed(1)} MB → ${CACHE}`);
  } else {
    console.log(`Using cached dataset ${CACHE}`);
  }
  const rows = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
  if (!Array.isArray(rows) || !rows.length) throw new Error('Dataset is empty or unexpected format');

  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3307),
    user: process.env.DB_USER || 'erp',
    password: process.env.DB_PASSWORD || 'erp_pass_2026',
    database: process.env.DB_NAME || 'erp',
    connectionLimit: 4,
  });

  await pool.query(`CREATE TABLE IF NOT EXISTS hsn_sac_master (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(12) NOT NULL,
    description TEXT NOT NULL,
    type ENUM('HSN','SAC') NOT NULL DEFAULT 'HSN',
    gst_rate DECIMAL(6,2) NOT NULL DEFAULT 0,
    UNIQUE KEY uq_hsn_code (code),
    KEY idx_hsn_type (type),
    KEY idx_hsn_rate (gst_rate),
    FULLTEXT KEY ft_hsn_desc (description)
  ) ENGINE=InnoDB`);

  const clean = rows
    .map(r => ({
      code: String(r.code || '').trim(),
      description: String(r.description || '').replace(/\s+/g, ' ').trim(),
      type: (String(r.type || 'HSN').toUpperCase() === 'SAC') ? 'SAC' : 'HSN',
      gstRate: Number(r.gstRate ?? r.gst_rate ?? 0) || 0,
    }))
    .filter(r => r.code && r.description && /^\d+$/.test(r.code));

  let inserted = 0, updated = 0;
  const CHUNK = 500;
  for (let i = 0; i < clean.length; i += CHUNK) {
    const chunk = clean.slice(i, i + CHUNK);
    const vals = chunk.flatMap(r => [r.code, r.description, r.type, r.gstRate]);
    const [r] = await pool.query(
      `INSERT INTO hsn_sac_master (code, description, type, gst_rate) VALUES ${chunk.map(() => '(?,?,?,?)').join(',')}
       ON DUPLICATE KEY UPDATE description=VALUES(description), type=VALUES(type), gst_rate=VALUES(gst_rate)`,
      vals);
    inserted += r.affectedRows - 2 * (r.info?.changedRows || 0);
    updated += r.info?.changedRows || 0;
    process.stdout.write(`\r  upserted ${Math.min(i + CHUNK, clean.length)}/${clean.length}`);
  }
  const [[{ total }]] = await pool.query('SELECT COUNT(*) total FROM hsn_sac_master');
  const [[{ hsn }]] = await pool.query("SELECT COUNT(*) hsn FROM hsn_sac_master WHERE type='HSN'");
  const [[{ sac }]] = await pool.query("SELECT COUNT(*) sac FROM hsn_sac_master WHERE type='SAC'");
  console.log(`\nDone. Dataset rows: ${clean.length} · new: ${inserted} · refreshed: ${updated}`);
  console.log(`hsn_sac_master now has ${total} codes (${hsn} HSN goods + ${sac} SAC services)`);
  await pool.end();
})().catch(e => { console.error('\nSeed failed:', e.message); process.exit(1); });
