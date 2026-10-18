const express = require('express');
const { pool, requireModule } = require('../lib/middleware');
const router = express.Router();

router.get('/', requireModule('sales'), async (req, res) => {
  const [rows] = await pool.query(
    `SELECT r.*, c.name customer_name, d.doc_no FROM receipts r
     JOIN customers c ON c.id=r.customer_id LEFT JOIN sales_documents d ON d.id=r.doc_id
     ORDER BY r.id DESC LIMIT 50`);
  res.json({ receipts: rows });
});
module.exports = router;
