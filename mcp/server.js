const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { z } = require('zod');

/* Thin API client — every tool call goes through the tenant-scoped HTTP API
 * with the caller's Bearer token, so role permissions are enforced server-side. */
function api(token, apiUrl) {
  const call = async (method, path, body) => {
    const res = await fetch(`${apiUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    if (!res.ok) {
      const msg = data.error || `HTTP ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return data;
  };
  return {
    get2: (p) => call('GET', p),
    post: (p, b) => call('POST', p, b),
    put: (p, b) => call('PUT', p, b)
  };
}

const ok = (data) => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] });
const fail = (e) => ({ content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true });

function buildMcpServer(apiUrl, token) {
  const server = new McpServer({ name: 'x3m-erp', version: '1.0.0' });
  const A = api(token, apiUrl);

  server.registerTool('company_get', {
    title: 'Get company profile',
    description: 'Get the current company profile: legal name, GSTIN, address, plan, and invoice/billing settings.',
    inputSchema: {}
  }, async () => { try { return ok(await A.get2('/api/company')); } catch (e) { return fail(e); } });

  server.registerTool('company_update', {
    title: 'Update company profile',
    description: 'Update the current company profile. Only provided fields are changed. Requires admin permission.',
    inputSchema: {
      name: z.string().max(150).optional().describe('Legal company name'),
      gstin: z.string().max(15).optional().describe('15-character GSTIN'),
      address: z.string().max(400).optional(),
      company_pan: z.string().max(20).optional(),
      company_phone: z.string().max(30).optional(),
      company_email: z.string().max(120).optional(),
      company_state_code: z.string().max(4).optional().describe('GST state code, e.g. 27 for Maharashtra'),
      terms_conditions: z.string().optional(),
      bank_name: z.string().optional(),
      upi_id: z.string().optional()
    }
  }, async (args) => { try { return ok(await A.put('/api/company', args)); } catch (e) { return fail(e); } });

  server.registerTool('dashboard_get', {
    title: 'Get dashboard KPIs',
    description: 'Company dashboard: sales this month, receivables, receipts, expenses, stock alerts, leads, projects, and recent documents.',
    inputSchema: {}
  }, async () => { try { return ok(await A.get2('/api/dashboard')); } catch (e) { return fail(e); } });

  server.registerTool('customers_list', {
    title: 'List customers',
    description: 'List active customers with GSTIN, contact details, and payment terms.',
    inputSchema: {
      query: z.string().max(80).optional().describe('Optional name/GSTIN search filter')
    }
  }, async ({ query }) => {
    try {
      const d = await A.get2('/api/customers');
      let rows = d.customers || [];
      if (query) {
        const q = query.toLowerCase();
        rows = rows.filter(c => [c.name, c.gstin, c.email, c.phone, c.contact_person]
          .some(v => String(v || '').toLowerCase().includes(q)));
      }
      return ok({ customers: rows.slice(0, 100) });
    } catch (e) { return fail(e); }
  });

  server.registerTool('customer_create', {
    title: 'Create customer',
    description: 'Create a new customer. Requires sales create permission.',
    inputSchema: {
      name: z.string().min(1).max(150),
      gstin: z.string().max(15).optional(),
      pan: z.string().max(20).optional(),
      contact_person: z.string().max(120).optional(),
      phone: z.string().max(30).optional(),
      email: z.string().max(120).optional(),
      address: z.string().max(400).optional(),
      state_code: z.string().max(4).optional().describe('GST state code, default 27'),
      place_of_supply: z.string().max(80).optional(),
      payment_terms: z.string().max(40).optional().describe('e.g. Net 30')
    }
  }, async (args) => { try { return ok(await A.post('/api/customers', args)); } catch (e) { return fail(e); } });

  server.registerTool('items_list', {
    title: 'List inventory items',
    description: 'List active inventory items with SKU, HSN/SAC, GST rate, prices, and current stock.',
    inputSchema: { query: z.string().max(80).optional() }
  }, async ({ query }) => {
    try {
      const d = await A.get2('/api/items');
      let rows = d.items || [];
      if (query) {
        const q = query.toLowerCase();
        rows = rows.filter(i => [i.sku, i.name, i.category, i.hsn_sac]
          .some(v => String(v || '').toLowerCase().includes(q)));
      }
      return ok({ items: rows.slice(0, 100) });
    } catch (e) { return fail(e); }
  });

  server.registerTool('item_create', {
    title: 'Create inventory item',
    description: 'Create a new inventory item. Requires inventory create permission.',
    inputSchema: {
      sku: z.string().min(1).max(60),
      name: z.string().min(1).max(150),
      uom: z.string().max(20).optional().describe('Unit of measure, default Nos'),
      hsn_sac: z.string().max(20).optional(),
      category: z.string().max(80).optional(),
      sale_price: z.number().nonnegative().optional(),
      purchase_price: z.number().nonnegative().optional(),
      gst_rate: z.number().min(0).max(28).optional().describe('GST rate %, default 18'),
      reorder_level: z.number().nonnegative().optional(),
      barcode: z.string().max(60).optional()
    }
  }, async (args) => { try { return ok(await A.post('/api/items', args)); } catch (e) { return fail(e); } });

  server.registerTool('sales_documents_list', {
    title: 'List sales documents',
    description: 'List sales documents (TaxInvoice, Invoice, Quotation, Proforma, DeliveryChallan, CreditNote, DebitNote) with customer and totals.',
    inputSchema: {
      type: z.enum(['Quotation', 'Proforma', 'TaxInvoice', 'Invoice', 'DeliveryChallan', 'CreditNote', 'DebitNote']).optional()
    }
  }, async ({ type }) => {
    try {
      const d = await A.get2(type ? `/api/salesdocs?type=${type}` : '/api/salesdocs');
      return ok({ docs: (d.docs || []).map(x => ({
        id: x.id, doc_no: x.doc_no, doc_type: x.doc_type, doc_date: x.doc_date, status: x.status,
        customer: x.customer_name, grand_total: x.grand_total, paid_amount: x.paid_amount
      })) });
    } catch (e) { return fail(e); }
  });

  server.registerTool('vendors_list', {
    title: 'List vendors',
    description: 'List active vendors/suppliers with GSTIN and contact details.',
    inputSchema: { query: z.string().max(80).optional() }
  }, async ({ query }) => {
    try {
      const d = await A.get2('/api/vendors');
      let rows = d.vendors || [];
      if (query) {
        const q = query.toLowerCase();
        rows = rows.filter(v => [v.name, v.gstin, v.email, v.phone]
          .some(f => String(f || '').toLowerCase().includes(q)));
      }
      return ok({ vendors: rows.slice(0, 100) });
    } catch (e) { return fail(e); }
  });

  server.registerTool('vendor_create', {
    title: 'Create vendor',
    description: 'Create a new vendor/supplier. Requires procurement create permission.',
    inputSchema: {
      name: z.string().min(1).max(150),
      gstin: z.string().max(15).optional(),
      pan: z.string().max(20).optional(),
      contact_person: z.string().max(120).optional(),
      phone: z.string().max(30).optional(),
      email: z.string().max(120).optional(),
      address: z.string().max(400).optional(),
      payment_terms: z.string().max(40).optional()
    }
  }, async (args) => { try { return ok(await A.post('/api/vendors', args)); } catch (e) { return fail(e); } });

  server.registerTool('leads_list', {
    title: 'List CRM leads',
    description: 'List CRM pipeline stages and leads with owner, value, and stage.',
    inputSchema: {}
  }, async () => { try { return ok(await A.get2('/api/leads')); } catch (e) { return fail(e); } });

  server.registerTool('lead_create', {
    title: 'Create CRM lead',
    description: 'Create a new CRM lead (goes to the first pipeline stage by default). Requires CRM create permission.',
    inputSchema: {
      title: z.string().min(1).max(150),
      company: z.string().max(150).optional(),
      contact_name: z.string().max(120).optional(),
      phone: z.string().max(30).optional(),
      email: z.string().max(120).optional(),
      value: z.number().nonnegative().optional().describe('Expected value'),
      notes: z.string().optional()
    }
  }, async (args) => { try { return ok(await A.post('/api/leads', args)); } catch (e) { return fail(e); } });

  server.registerTool('expenses_list', {
    title: 'List expenses',
    description: 'List the latest 100 expenses.',
    inputSchema: {}
  }, async () => { try { return ok(await A.get2('/api/expenses')); } catch (e) { return fail(e); } });

  server.registerTool('expense_create', {
    title: 'Create expense',
    description: 'Record an expense. Requires projects/expense create permission.',
    inputSchema: {
      title: z.string().min(1).max(200),
      amount: z.number().positive(),
      category: z.string().max(80).optional().describe('e.g. Travel, Salaries, General'),
      expense_date: z.string().optional().describe('YYYY-MM-DD, defaults to today'),
      notes: z.string().optional()
    }
  }, async (args) => { try { return ok(await A.post('/api/expenses', args)); } catch (e) { return fail(e); } });

  server.registerTool('stock_low', {
    title: 'List low-stock items',
    description: 'Items at or below their reorder level.',
    inputSchema: {}
  }, async () => { try { return ok(await A.get2('/api/items/low-stock')); } catch (e) { return fail(e); } });

  return server;
}

module.exports = { buildMcpServer };
