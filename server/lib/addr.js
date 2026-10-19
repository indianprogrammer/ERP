require('dotenv').config();

/* Single source of truth for host/port — always driven by .env (HOST, PORT). */
const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 3000);

/* 0.0.0.0 / :: mean "bind all interfaces" — clients must use loopback or a LAN IP. */
const CONNECT_HOST = (HOST === '0.0.0.0' || HOST === '::' || HOST === '')
  ? '127.0.0.1'
  : HOST;

const BASE_URL = (process.env.BASE_URL || `http://${CONNECT_HOST}:${PORT}`).replace(/\/$/, '');

module.exports = { HOST, PORT, CONNECT_HOST, BASE_URL };
