App.registerView('projects', {
  async render(params) {
    return `
    <div class="page-head"><div><h1>Multi-Project Cost Mapping</h1>
      <div class="sub">Net Profit = Mapped Sales − (Mapped Vendor Bills + Expenses)</div></div>
      <div class="flex">
        <button class="btn btn-outline" id="btn-exp">+ Expense</button>
        <button class="btn btn-primary" id="btn-proj">+ New Project</button>
      </div></div>
    <div id="proj-body"><div class="empty">Loading…</div></div>`;
  },
  async mount(params) {
    document.getElementById('btn-proj').onclick = () => this.projForm();
    document.getElementById('btn-exp').onclick = () => this.expenseForm();
    await this.renderList(params);
  },
  async renderList(params) {
    const { projects } = await UI.api('/api/projects');
    const body = document.getElementById('proj-body');
    body.innerHTML = `
      <div class="cards">${projects.map(p => {
      const margin = Number(p.sales) > 0 ? (p.profit / p.sales * 100).toFixed(1) : 0;
      return `
        <div class="card" style="cursor:pointer" onclick="App.views.projects.detail(${p.id})">
          <div class="k-label">${UI.esc(p.code)} · ${UI.esc(p.client_name || '')}</div>
          <div style="font-weight:600;margin-bottom:6px">${UI.esc(p.name)}</div>
          <div class="k-value ${p.profit >= 0 ? 'good' : 'bad'}">${UI.money(p.profit)}</div>
          <div class="k-sub">Sales ${UI.money(p.sales)} − Bills ${UI.money(p.vendor_bills)} − Exp ${UI.money(p.expenses)}</div>
          <div class="bar"><i style="width:${Math.min(100, Math.max(0, margin))}%;background:${p.profit >= 0 ? 'var(--green)' : 'var(--red)'}"></i></div>
          <div class="k-sub">Margin ${margin}% · Budget ${UI.money(p.budget)}</div>
        </div>`;
    }).join('')}</div>
      <div class="panel"><h2>All Projects</h2>
      ${UI.table(['code', 'name', 'client_name', { key: 'sales', label: 'Sales', num: true }, { key: 'vendor_bills', label: 'Vendor Bills', num: true }, { key: 'expenses', label: 'Expenses', num: true }, { key: 'profit', label: 'Net P&L', num: true }, 'status'],
        projects, {
        code: v => `<b>${UI.esc(v)}</b>`, sales: v => UI.money(v), vendor_bills: v => UI.money(v), expenses: v => UI.money(v),
        profit: v => `<b style="color:${Number(v) >= 0 ? 'var(--green)' : 'var(--red)'}">${Number(v) >= 0 ? '+' : ''}${UI.money(v)}</b>`,
        status: v => UI.badge(v)
      })}</div>`;
    if (params.id) this.detail(Number(params.id));
  },
  async detail(id) {
    const { project: p, links, expenses } = await UI.api('/api/projects/' + id);
    const { pos } = await UI.api('/api/pos').catch(() => ({ pos: [] }));
    const { docs } = await UI.api('/api/salesdocs').catch(() => ({ docs: [] }));
    const b = UI.modal(`${UI.esc(p.code)} — ${UI.esc(p.name)}`, `
      <div class="cards" style="grid-template-columns:repeat(3,1fr)">
        <div class="card"><div class="k-label">Mapped Sales</div><div class="k-value good">${UI.money(p.sales)}</div></div>
        <div class="card"><div class="k-label">Vendor Bills + Exp</div><div class="k-value bad">${UI.money(Number(p.vendor_bills) + Number(p.expenses))}</div></div>
        <div class="card"><div class="k-label">Net Profit</div><div class="k-value ${p.profit >= 0 ? 'good' : 'bad'}">${Number(p.profit) >= 0 ? '+' : ''}${UI.money(p.profit)}</div></div>
      </div>
      <h3>Mapped Documents</h3>
      ${links.length ? UI.table(['ref_type', 'label', { key: 'amount', label: 'Amount', num: true }, { key: '_u', label: '' }],
      links, {
        ref_type: v => UI.badge(v === 'SALE' ? 'TaxInvoice' : v === 'PO' ? 'Ordered' : 'Received'),
        label: v => UI.esc(v || '—'), amount: v => UI.money(v),
        _u: (v, r) => `<button class="link-btn danger unlnk" data-t="${r.ref_type}" data-i="${r.ref_id}">Unlink</button>`
      }) : '<div class="empty">No linked documents</div>'}
      <h3>Direct Expenses</h3>
      ${UI.table(['title', 'category', { key: 'amount', label: 'Amount', num: true }, { key: 'expense_date', label: 'Date' }], expenses,
      { amount: v => UI.money(v), expense_date: v => UI.fmtDate(v), title: v => UI.esc(v) })}
      <h3>Link Existing Document</h3>
      <div class="flex">
        <select id="lnk-type" class="input-inline"><option value="SALE">Sales Invoice</option><option value="PO">Purchase Order</option></select>
        <select id="lnk-id" class="input-inline" style="min-width:240px"></select>
        <button class="btn btn-tonal btn-sm" id="lnk-go">Link</button>
      </div>`,
      `<button class="btn btn-outline" onclick="UI.closeModal()">Close</button>
       <button class="btn btn-primary" id="p-exp">+ Expense</button>`);
    const fill = (type) => {
      const sel = b.querySelector('#lnk-id');
      const opts = type === 'SALE' ? docs.filter(d => d.doc_type === 'TaxInvoice' || d.doc_type === 'Invoice').map(d => ({ v: d.id, l: `${d.doc_no} · ${d.customer_name}` }))
        : pos.map(p2 => ({ v: p2.id, l: `${p2.po_no} · ${p2.vendor_name}` }));
      sel.innerHTML = opts.map(o => `<option value="${o.v}">${UI.esc(o.l)}</option>`).join('');
    };
    fill('SALE');
    b.querySelector('#lnk-type').onchange = e => fill(e.target.value);
    b.querySelector('#lnk-go').onclick = async () => {
      const ref_type = b.querySelector('#lnk-type').value, ref_id = Number(b.querySelector('#lnk-id').value);
      if (!ref_id) return UI.toast('Nothing to link', 'err');
      try { await UI.api(`/api/projects/${id}/link`, { method: 'POST', body: { ref_type, ref_id } }); UI.closeModal(); UI.toast('Linked', 'ok'); this.detail(id); }
      catch (e) { UI.toast(e.message, 'err'); }
    };
    b.querySelectorAll('.unlnk').forEach(btn => btn.onclick = async () => {
      try { await UI.api(`/api/projects/${id}/unlink`, { method: 'POST', body: { ref_type: btn.dataset.t, ref_id: Number(btn.dataset.i) } }); UI.closeModal(); this.detail(id); }
      catch (e) { UI.toast(e.message, 'err'); }
    });
    b.querySelector('#p-exp').onclick = () => { UI.closeModal(); this.expenseForm(id); };
  },
  async projForm() {
    const b = UI.modal('New Project', `
      <div class="form-grid" id="pf">
        ${UI.field('code', 'Project Code *', 'PRJ-')}
        ${UI.field('name', 'Project Name *')}
        ${UI.field('client_name', 'Client')}
        ${UI.field('budget', 'Budget (₹)', '', 'number', 'step="any"')}
        ${UI.field('start_date', 'Start Date', new Date().toISOString().slice(0, 10), 'date')}
      </div>`,
      `<button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-primary" id="pr-save">Create</button>`);
    b.querySelector('#pr-save').onclick = async () => {
      const d = UI.formValues('pf');
      if (!d.code || !d.name) return UI.toast('Code & name required', 'err');
      try { await UI.api('/api/projects', { method: 'POST', body: d }); UI.closeModal(); UI.toast('Project created', 'ok'); this.renderList({}); }
      catch (e) { UI.toast(e.message, 'err'); }
    };
  },
  async expenseForm(projectId) {
    const { projects } = await UI.api('/api/projects');
    const b = UI.modal('New Project Expense', `
      <div class="form-grid" id="ef">
        ${UI.select('project_id', 'Project', projects.map(p => ({ value: p.id, label: `${p.code} · ${p.name}` })), projectId)}
        ${UI.field('title', 'Expense Title *')}
        ${UI.select('category', 'Category', ['General', 'Travel', 'Hardware', 'Software', 'Labour', 'Consulting', 'Vendor Payment'])}
        ${UI.field('amount', 'Amount (₹) *', '', 'number', 'step="any"')}
        ${UI.field('expense_date', 'Date', new Date().toISOString().slice(0, 10), 'date')}
      </div>`,
      `<button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-primary" id="e-save">Save</button>`);
    b.querySelector('#e-save').onclick = async () => {
      const d = UI.formValues('ef');
      if (!d.title || !d.amount) return UI.toast('Title & amount required', 'err');
      try { await UI.api('/api/expenses', { method: 'POST', body: d }); UI.closeModal(); UI.toast('Expense saved', 'ok'); this.renderList({}); }
      catch (e) { UI.toast(e.message, 'err'); }
    };
  }
});
