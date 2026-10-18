const express = require('express');
const { pool } = require('../lib/middleware');
const router = express.Router();

const tid = (req) => req.tenantId;

router.get('/', async (req, res) => {
  const u = req.session.user;
  const [notifications] = await pool.query(
    'SELECT id,title,body,kind,link,created_at,is_read FROM notifications WHERE tenant_id=? AND (user_id IS NULL OR user_id=?) ORDER BY id DESC LIMIT 30', [tid(req), u.id]);
  const [[{ c }]] = await pool.query('SELECT COUNT(*) c FROM notifications WHERE tenant_id=? AND (user_id IS NULL OR user_id=?) AND is_read=0', [tid(req), u.id]);
  res.json({ notifications, unread: c });
});

router.post('/read', async (req, res) => {
  await pool.query('UPDATE notifications SET is_read=1 WHERE tenant_id=? AND (user_id IS NULL OR user_id=?)', [tid(req), req.session.user.id]);
  res.json({ ok: true });
});

module.exports = router;
