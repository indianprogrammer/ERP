App.registerView('dashboard', {
  async render() {
    const d = await UI.api('/api/dashboard');
    const t = d.tenant || { name: 'Organization', plan: '—', status: '—' };
    const k = d.kpis;
    const paidPct = k.salesAll.total > 0
      ? Math.min(100, Math.round(((k.salesAll.total - k.receivables.total) / k.salesAll.total) * 100)) : 0;

    const cards = [
      { label: 'Sales This Month', value: UI.money(k.salesMonth.total), sub: `${k.salesMonth.count} invoice${k.salesMonth.count === 1 ? '' : 's'} · ${UI.money(k.salesAll.total)} all-time` },
      { label: 'Receivables Outstanding', value: UI.money(k.receivables.total), cls: k.receivables.total > 0 ? 'warn' : 'good', sub: `${k.receivables.count} open invoice${k.receivables.count === 1 ? '' : 's'}` },
      { label: 'Collections This Month', value: UI.money(k.receiptsMonth.total), cls: 'good', sub: `${k.receiptsMonth.count} payment${k.receiptsMonth.count === 1 ? '' : 's'} received` },
      { label: 'Expenses This Month', value: UI.money(k.expensesMonth), cls: k.expensesMonth > 0 ? 'warn' : '', sub: 'Logged business expenses' },
      { label: 'Open Purchase Orders', value: k.posOpen.count, cls: k.posOpen.count > 0 ? 'warn' : 'good', sub: `${UI.money(k.posOpen.total)} · ${k.posAll.count} all-time` },
      { label: 'Inventory Items', value: k.items, cls: k.lowStock > 0 ? 'bad' : 'good', sub: k.lowStock > 0 ? `${k.lowStock} low stock item${k.lowStock === 1 ? '' : 's'}` : 'Stock levels healthy' },
      { label: 'Open Leads', value: k.leads.count, sub: `${UI.money(k.leads.total)} pipeline value` },
      { label: 'Active Projects', value: k.projects, sub: `${k.customers} customers · ${k.vendors} vendors` }
    ];

    return `
    <div class="page-head">
      <div>
        <h1>${UI.esc(t.name)}</h1>
        <div class="sub">
          ${UI.badge(t.plan)} ${UI.badge(t.status)}
          ${t.gstin ? `<span class="chip">GSTIN ${UI.esc(t.gstin)}</span>` : ''}
          <span class="chip">${k.users} team member${k.users === 1 ? '' : 's'}</span>
          ${k.gstPending > 0 ? `<a class="chip" href="#/gst">${k.gstPending} invoice${k.gstPending === 1 ? '' : 's'} pending GSTR-1 →</a>` : ''}
        </div>
      </div>
    </div>

    <div class="cards">
      ${cards.map(c => `
        <div class="card">
          <div class="k-label">${c.label}</div>
          <div class="k-value ${c.cls || ''}">${c.value}</div>
          <div class="k-sub">${c.sub}</div>
        </div>`).join('')}
    </div>

    <div class="panel">
      <h2>Receivables Collection</h2>
      <div class="flex mb"><span>${UI.money(k.salesAll.total - k.receivables.total)} collected of ${UI.money(k.salesAll.total)} billed</span><span style="margin-left:auto">${paidPct}%</span></div>
      <div class="bar"><i style="width:${paidPct}%"></i></div>
    </div>

    <div class="grid-2">
      <div class="panel">
        <h2>Recent Sales Invoices <a href="#/sales">View all →</a></h2>
        ${d.recentDocs.length ? UI.table(
          ['doc_no', 'customer', 'doc_date', { key: 'grand_total', label: 'Total', num: true }, { key: 'paid_amount', label: 'Paid', num: true }, 'status'],
          d.recentDocs,
          {
            doc_no: v => `<b>${UI.esc(v)}</b>`,
            customer: v => UI.esc(v || '—'),
            doc_date: v => UI.fmtDate(v),
            grand_total: v => UI.money(v),
            paid_amount: v => UI.money(v),
            status: v => UI.badge(v)
          }
        ) : '<div class="empty">No invoices yet</div>'}
      </div>
      <div class="panel">
        <h2>Recent Payments <a href="#/sales">View all →</a></h2>
        ${d.recentReceipts.length ? UI.table(
          ['receipt_no', 'customer', 'mode', 'receipt_date', { key: 'amount', label: 'Amount', num: true }],
          d.recentReceipts,
          {
            receipt_no: v => `<b>${UI.esc(v)}</b>`,
            customer: v => UI.esc(v || '—'),
            receipt_date: v => UI.fmtDate(v),
            amount: v => UI.money(v)
          }
        ) : '<div class="empty">No payments recorded</div>'}
      </div>
    </div>

    <div class="grid-2">
      <div class="panel">
        <h2>Low Stock Alerts <a href="#/inventory">Inventory →</a></h2>
        ${d.lowStockItems.length ? UI.table(
          ['sku', 'name', { key: 'stock', label: 'In Stock', num: true }, { key: 'reorder_level', label: 'Reorder At', num: true }],
          d.lowStockItems,
          {
            sku: v => `<b>${UI.esc(v)}</b>`,
            name: v => UI.esc(v),
            stock: v => `<span class="${Number(v) <= 0 ? 'k-value bad' : 'k-value warn'}">${Number(v)}</span>`
          }
        ) : '<div class="empty">All items above reorder level</div>'}
      </div>
      <div class="panel">
        <h2>Open Purchase Orders <a href="#/procurement">Procurement →</a></h2>
        ${d.openPos.length ? UI.table(
          ['po_no', 'vendor', 'status', 'expected_date', { key: 'grand_total', label: 'Total', num: true }],
          d.openPos,
          {
            po_no: v => `<b>${UI.esc(v)}</b>`,
            vendor: v => UI.esc(v || '—'),
            status: v => UI.badge(v),
            expected_date: v => UI.fmtDate(v),
            grand_total: v => UI.money(v)
          }
        ) : '<div class="empty">No open purchase orders</div>'}
      </div>
    </div>`;
  }
});
