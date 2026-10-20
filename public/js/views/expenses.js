App.registerView('expenses', {
  filters: { type: '', project_id: '', month: '' },
  async render(params) {
    return `
    <div class="page-head"><div><h1>Expenses</h1>
      <div class="sub">Project-based or individual business expenses</div></div>
      <button class="btn btn-primary" id="btn-new-exp">+ Record Expense</button></div>
    <div class="panel" id="exp-summary"><div class="empty">Loading…</div></div>
    <div class="panel">
      <div class="flex" style="gap:10px;flex-wrap:wrap;margin-bottom:12px" id="exp-filters">
        <div class="tabs" style="margin:0">
          <button data-type="" class="active">All</button>
          <button data-type="project">Project-based</button>
          <button data-type="individual">Individual</button>
        </div>
        <select id="f-project" class="input-inline" style="min-width:220px"><option value="">All projects</option></select>
        <input type="month" id="f-month" class="input-inline">
        <input type="search" id="f-q" class="input-inline" placeholder="Search title, category…" style="min-width:180px">
      </div>
      <div id="exp-body"><div class="empty">Loading…</div></div>
    </div>`;
  },
  async mount() {
    document.getElementById('btn-new-exp').onclick = () => this.expenseForm();
    try {
      const { projects } = await UI.api('/api/projects');
      const sel = document.getElementById('f-project');
      sel.innerHTML = '<option value="">All projects</option>' +
        projects.map(p => `<option value="${p.id}">${UI.esc(p.code)} · ${UI.esc(p.name)}</option>`).join('');
      this._projects = projects;
    } catch { this._projects = []; }
    document.querySelectorAll('#exp-filters .tabs button').forEach(b => b.onclick = () => {
      document.querySelectorAll('#exp-filters .tabs button').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      this.filters.type = b.dataset.type;
      this.load();
    });
    document.getElementById('f-project').onchange = e => { this.filters.project_id = e.target.value; this.load(); };
    document.getElementById('f-month').onchange = e => { this.filters.month = e.target.value; this.load(); };
    let t;
    document.getElementById('f-q').oninput = e => {
      clearTimeout(t);
      t = setTimeout(() => { this.filters.q = e.target.value.trim(); this.load(); }, 300);
    };
    await this.load();
  },
  qs() {
    const f = this.filters, q = new URLSearchParams();
    if (f.type) q.set('type', f.type);
    if (f.project_id) q.set('project_id', f.project_id);
    if (f.month) q.set('month', f.month);
    if (f.q) q.set('q', f.q);
    const s = q.toString();
    return s ? '?' + s : '';
  },
  async load() {
    const body = document.getElementById('exp-body');
    body.innerHTML = '<div class="empty">Loading…</div>';
    try {
      const d = await UI.api('/api/expenses' + this.qs());
      const exp = d.expenses || [];
      document.getElementById('exp-summary').innerHTML = `
        <div class="cards" style="grid-template-columns:repeat(4,1fr)">
          <div class="card"><div class="k-label">Total Expenses</div><div class="k-value">${UI.money(d.total || 0)}</div><div class="k-sub">${exp.length} record(s)</div></div>
          <div class="card"><div class="k-label">Project-based</div><div class="k-value">${UI.money(d.project_total || 0)}</div><div class="k-sub">Mapped to projects</div></div>
          <div class="card"><div class="k-label">Individual</div><div class="k-value">${UI.money(d.individual_total || 0)}</div><div class="k-sub">General / overhead</div></div>
          <div class="card"><div class="k-label">Average</div><div class="k-value">${UI.money(exp.length ? (d.total / exp.length) : 0)}</div><div class="k-sub">Per record</div></div>
        </div>`;
      if (!exp.length) { body.innerHTML = '<div class="empty">No expenses found</div>'; return; }
      body.innerHTML = UI.table(
        [
          'title', 'type', 'category',
          { key: 'amount', label: 'Amount', num: true },
          { key: 'expense_date', label: 'Date' },
          'created_by_name',
          { key: '_doc', label: 'Document' },
          { key: '_d', label: '' }
        ], exp, {
          title: v => `<b>${UI.esc(v)}</b>`,
          type: (v, r) => r.project_id
            ? `<span class="badge">${UI.esc(r.project_code || 'Project')}</span>`
            : `<span class="badge" style="opacity:.7">Individual</span>`,
          category: v => UI.esc(v || 'General'),
          amount: v => `<b>${UI.money(v)}</b>`,
          expense_date: v => UI.fmtDate(v),
          created_by_name: v => UI.esc(v || '—'),
          _doc: (v, r) => r.attachment ? `<button class="link-btn" onclick="App.views.expenses.openDoc(${r.id})">📎 View</button>` : '<span class="k-sub">—</span>',
          _d: (v, r) => `<button class="link-btn danger" onclick="App.views.expenses.remove(${r.id}, '${UI.esc(r.title)}')">Delete</button>`
        });
    } catch (e) {
      body.innerHTML = `<div class="form-error">${UI.esc(e.message)}</div>`;
    }
  },
  async expenseForm(projectId) {
    const projects = this._projects || [];
    const b = UI.modal('Record Expense', `
      <div class="form-grid" id="ef">
        ${UI.select('project_id', 'Project (leave empty for individual expense)',
          [{ value: '', label: '— Individual expense —' }, ...projects.map(p => ({ value: p.id, label: `${p.code} · ${p.name}` }))], projectId || '')}
        ${UI.field('title', 'Expense Title *')}
        ${UI.select('category', 'Category', ['General', 'Travel', 'Hardware', 'Software', 'Labour', 'Consulting', 'Rent', 'Utilities', 'Vendor Payment'])}
        ${UI.field('amount', 'Amount (₹) *', '', 'number', 'step="any" min="0"')}
        ${UI.field('expense_date', 'Date', new Date().toISOString().slice(0, 10), 'date')}
        ${UI.textarea('notes', 'Notes')}
        <label class="field"><span>Voucher / Invoice (PDF or image, max 10 MB)</span>
          <input type="file" id="ef-file" accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.xls,.xlsx,.csv,.txt"></label>
      </div>`,
      `<button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-primary" id="e-save">Save</button>`);
    let attachment = null;
    b.querySelector('#ef-file').onchange = async e => {
      const f = e.target.files[0];
      if (!f) { attachment = null; return; }
      if (f.size > 10 * 1024 * 1024) { e.target.value = ''; attachment = null; return UI.toast('File too large (max 10 MB)', 'err'); }
      try {
        const fd = new FormData(); fd.append('file', f);
        const res = await fetch('/api/expenses/upload', { method: 'POST', body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        attachment = data.attachment;
        UI.toast(`Attached ${data.name}`, 'ok');
      } catch (ex) { attachment = null; e.target.value = ''; UI.toast(ex.message, 'err'); }
    };
    b.querySelector('#e-save').onclick = async () => {
      const d = UI.formValues('ef');
      if (!d.title || !d.amount) return UI.toast('Title & amount required', 'err');
      if (Number(d.amount) <= 0) return UI.toast('Amount must be greater than 0', 'err');
      if (!d.project_id) delete d.project_id;
      if (attachment) d.attachment = attachment;
      try { await UI.api('/api/expenses', { method: 'POST', body: d }); UI.closeModal(); UI.toast('Expense saved', 'ok'); this.load(); }
      catch (e) { UI.toast(e.message, 'err'); }
    };
  },
  async openDoc(id) {
    window.open(`/api/expenses/${id}/attachment`, '_blank', 'noopener');
  },
  async remove(id, title) {
    UI.confirm(`Delete expense "${title}"?`, async () => {
      try { await UI.api('/api/expenses/' + id, { method: 'DELETE' }); UI.toast('Expense deleted', 'ok'); this.load(); }
      catch (e) { UI.toast(e.message, 'err'); }
    });
  }
});
