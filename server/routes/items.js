const express = require('express');
const { pool, logAudit, requireModule } = require('../lib/middleware');
const router = express.Router();

router.get('/', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT i.*, COALESCE((SELECT SUM(qty) FROM stock_levels WHERE item_id=i.id),0) stock,
      (SELECT GROUP_CONCAT(CONCAT(w.code,':',sl.qty) SEPARATOR ' · ') FROM stock_levels sl JOIN warehouses w ON w.id=sl.warehouse_id WHERE sl.item_id=i.id) stock_by_wh
     FROM items i WHERE i.is_active=1 ORDER BY i.name`);
  res.json({ items: rows });
});

router.get('/low-stock', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT i.*, COALESCE((SELECT SUM(qty) FROM stock_levels WHERE item_id=i.id),0) stock FROM items i
     WHERE i.is_active=1 AND i.reorder_level>0 AND COALESCE((SELECT SUM(qty) FROM stock_levels WHERE item_id=i.id),0) <= i.reorder_level`);
  res.json({ items: rows });
});

router.post('/', requireModule('inventory', 'can_create'), async (req, res) => {
  const i = req.body;
  if (!i.sku || !i.name) return res.status(400).json({ error: 'SKU and name required' });
  try {
    const [r] = await pool.query(
      'INSERT INTO items (sku,name,barcode,uom,hsn_sac,category,sale_price,purchase_price,gst_rate,reorder_level) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [i.sku, i.name, i.barcode || null, i.uom || 'Nos', i.hsn_sac || '', i.category || 'General', i.sale_price || 0, i.purchase_price || 0, i.gst_rate ?? 18, i.reorder_level || 0]);
    await logAudit(req, 'CREATE', 'item', i.sku);
    res.json({ id: r.insertId });
  } catch (e) { res.status(400).json({ error: e.code === 'ER_DUP_ENTRY' ? 'SKU already exists' : e.message }); }
});

router.put('/:id', requireModule('inventory', 'can_update'), async (req, res) => {
  const i = req.body;
  await pool.query(
    'UPDATE items SET sku=?,name=?,barcode=?,uom=?,hsn_sac=?,category=?,sale_price=?,purchase_price=?,gst_rate=?,reorder_level=? WHERE id=?',
    [i.sku, i.name, i.barcode || null, i.uom || 'Nos', i.hsn_sac || '', i.category || 'General', i.sale_price || 0, i.purchase_price || 0, i.gst_rate ?? 18, i.reorder_level || 0, req.params.id]);
  await logAudit(req, 'UPDATE', 'item', i.sku);
  res.json({ ok: true });
});

module.exports = router;
