#!/usr/bin/env node
/* X3M ERP MCP server — stdio transport.
 *
 * Runs as a subprocess of an MCP client (Claude Desktop, Claude Code, etc.).
 * Authenticates against the ERP API with a tenant user account and exposes
 * company, dashboard, customers, items, vendors, sales, CRM and expense tools.
 *
 * Environment (all optional — defaults come from the project .env HOST/PORT):
 *   ERP_API_URL   Base URL of the running ERP (default http://<connect-host>:<PORT>)
 *   ERP_USERNAME  Tenant username
 *   ERP_PASSWORD  Tenant password
 *   ERP_TENANT    Tenant slug (company subdomain), e.g. acme
 *   ERP_TOKEN     (optional) existing Bearer token — skips credential exchange
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { buildMcpServer } = require('./server');
const { BASE_URL } = require('../server/lib/addr');

const API_URL = (process.env.ERP_API_URL || BASE_URL).replace(/\/$/, '');

async function getToken() {
  if (process.env.ERP_TOKEN) return process.env.ERP_TOKEN;
  const { username, password, tenant } = process.env;
  const u = process.env.ERP_USERNAME || username;
  const p = process.env.ERP_PASSWORD || password;
  const t = process.env.ERP_TENANT || tenant;
  if (!u || !p || !t) {
    console.error('Set ERP_API_URL, ERP_USERNAME, ERP_PASSWORD and ERP_TENANT (or ERP_TOKEN).');
    process.exit(1);
  }
  const res = await fetch(`${API_URL}/api/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: u, password: p, tenantSlug: t })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`Token exchange failed (${res.status}): ${data.error || 'unknown error'}`);
    process.exit(1);
  }
  return data.token;
}

async function main() {
  const token = await getToken();
  const server = buildMcpServer(API_URL, token);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`X3M ERP MCP server running (stdio) against ${API_URL}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
