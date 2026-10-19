const express = require('express');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { buildMcpServer } = require('../../mcp/server');
const { signAccessToken } = require('../lib/tokens');
const { authUser } = require('../lib/middleware');

const router = express.Router();
const INTERNAL_API = () => process.env.INTERNAL_API_URL || `http://127.0.0.1:${process.env.PORT || 3000}`;

/* Stateless Streamable HTTP MCP endpoint.
 * Auth: same Bearer JWT as the rest of the API (Authorization: Bearer <token>).
 * Mounted behind requireAuth + requireTenant — req.user is always set here. */
router.post('/', async (req, res) => {
  try {
    const user = authUser(req);
    const token = signAccessToken(user); // fresh short-lived token for internal API calls
    const server = buildMcpServer(INTERNAL_API(), token);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => { transport.close(); server.close(); });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (e) {
    console.error('MCP HTTP error', e);
    if (!res.headersSent) res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal error' }, id: null });
  }
});

router.get('/', (req, res) => res.status(405).json({ error: 'Method not allowed — use POST with JSON-RPC and Authorization: Bearer <token>' }));
router.delete('/', (req, res) => res.status(405).json({ error: 'Method not allowed' }));

module.exports = router;
