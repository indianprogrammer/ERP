const express = require('express');
const { pool, logAudit, requireModule } = require('../lib/middleware');
const router = express.Router();

router.get('/', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM warehouses WHERE is_active=1 ORDER BY code');
  res.json({ warehouses: rows });
});
router.post('/', requireModule('inventory', 'can_create'), async (req, res) => {
  const { code, name, location } = req.body;
  if (!code || !name) return res.status(400).json({ error: 'Code and name required' });
  const [r] = await pool.query('INSERT INTO warehouses (code,name,location) VALUES (?,?,?)', [code, name, location || '']);
  await logAudit(req, 'CREATE', 'warehouse', code);
  res.json({ id: r.insertId });
});
module.exports = router;
