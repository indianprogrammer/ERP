App.registerView('dashboard', {
  async render() {
    const { metrics, recentDocs } = await UI.api('/api/dashboard');
    const cards = [
      { label: 'Monthly Sales', value: UI.money(metrics.monthlySales), cls: 'good', sub: 'This month (Tax Invoices)' },
      { label: 'Outstanding Receivables', value: UI.money(metrics.receivables), cls: metrics.receivables > 0 ? 'bad' : 'good', sub: 'Unpaid customer invoices' },
      { label: 'Inventory Value', value: UI.money(metrics.inventoryValue), sub: 'At purchase price' },
      { label: 'Open Leads', value: metrics.openLeads, sub: 'In CRM pipeline' },
      { label: 'Active Projects', value: metrics.activeProjects, sub: 'Being tracked' },
      { label: 'Low Stock Items', value: metrics.lowStock, cls: metrics.lowStock > 0 ? 'warn' : 'good', sub: 'At or below reorder level' },
      { label: 'Pending GST Filing', value: metrics.pendingGst, cls: metrics.pendingGst > 0 ? 'warn' : 'good', sub: 'Invoices not in GSTR-1' },
    ];
    return `
    <div class="page-head"><div><h1>Dashboard</h1><div class="sub">Enterprise overview · ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div></div>
      <div class="flex">
        <a class="btn btn-tonal" href="#/sales/docs?new=TaxInvoice">+ New Invoice</a>
        <a class="btn btn-primary" href="#/crm">Open Lead Board</a>
      </div>
    </div>
    <div class="cards">${cards.map(c => `
      <div class="card"><div class="k-label">${c.label}</div><div class="k-value ${c.cls || ''}">${c.value}</div><div class="k-sub">${c.sub}</div></div>`).join('')}
    </div>
    <div class="grid-2">
      <div class="panel">
        <h2>Recent Customer Invoices <a href="#/sales/docs">View all →</a></h2>
        ${UI.table(
      [{ key: 'doc_no', label: 'Inv #' }, 'customer', { key: 'grand_total', label: 'Amount', num: true }, { key: 'gst_status', label: 'GST Status' }, { key: 'status', label: 'Status' }],
      recentDocs,
      { grand_total: v => `<b>${UI.money(v)}</b>`, gst_status: v => UI.badge(v), status: v => UI.badge(v), doc_no: v => `<a href="#/sales/docs?id=${UI.esc(v)}">${UI.esc(v)}</a>` }
    )}
      </div>
      <div class="panel">
        <h2>Quick Actions</h2>
        <div class="grid-2" style="gap:10px">
          <a class="btn btn-outline" href="#/procurement?tab=quotes">📊 Compare Vendor Quotes</a>
          <a class="btn btn-outline" href="#/procurement?new=po">📦 Create Purchase Order</a>
          <a class="btn btn-outline" href="#/sales/docs?new=TaxInvoice">🧾 GST Tax Invoice</a>
          <a class="btn btn-outline" href="#/sales/docs?new=DeliveryChallan">🚚 Delivery Challan</a>
          <a class="btn btn-outline" href="#/gst">🏛️ GSTR-2B Reconciliation</a>
          <a class="btn btn-outline" href="#/inventory">📊 Stock & Warehouses</a>
          <a class="btn btn-outline" href="#/projects">📂 Project Profitability</a>
          <a class="btn btn-outline" href="#/staff">👥 Staff & Access</a>
        </div>
        <h3>Legend</h3>
        <div class="pill-group">
          <span class="chip">Reconciled = matched with GST Portal</span>
          <span class="chip">Pending GSTR-1 = not yet filed</span>
        </div>
      </div>
    </div>`;
  }
});
