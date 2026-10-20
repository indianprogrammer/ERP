App.registerView('sales', {
  async render(params) {
    if (params.new === 'Quotation' || params.quote) return await this.renderQuoteForm(params);
    if (params.new) return await this.renderDocForm(params.new, params.cust, params.source);
    const tab = params.tab || 'docs';
    const tabs = [['quotations', '💼 Quotations'], ['docs', '🧾 Document Billing Engine'], ['requirements', '📋 Requirements'], ['customers', '👥 Customers'], ['receivables', '💰 Receivables & Aging'], ['ledger', '📒 Ledger']];
    return `
    <div class="page-head"><div><h1>Sales & Outward Billing</h1><div class="sub">Requirements · Quotations · Tax Invoices · Challans · Credit/Debit Notes · E-Way bills</div></div>
      <div class="flex" id="sales-actions"></div></div>
    <div class="tabs">${tabs.map(([k, l]) => `<button class="${tab === k ? 'active' : ''}" onclick="App.navigate('#/sales?tab=${k}')">${l}</button>`).join('')}</div>
    <div id="sales-body"><div class="empty">Loading…</div></div>`;
  },
  async mount(params) {
    if (params.new === 'Quotation' || params.quote) return await this.mountQuoteForm(params);
    if (params.new) return await this.mountDocForm(params.new, params.source);
    const tab = params.tab || 'docs';
    const body = document.getElementById('sales-body');
    const actions = document.getElementById('sales-actions');
    actions.innerHTML = '';
    if (tab === 'quotations') {
      actions.innerHTML = '<button class="btn btn-primary" id="btn-qnew">+ New Quotation</button>';
      document.getElementById('btn-qnew').onclick = () => App.navigate('#/sales?quote=new');
      await this.renderQuotations(body);
    }
    if (tab === 'docs') {
      actions.innerHTML = `
        <button class="btn btn-outline" id="btn-req">+ Requirements</button>
        <button class="btn btn-outline" id="btn-challan">+ Delivery Challan</button>
        <button class="btn btn-outline" id="btn-quote">+ Quotation</button>
        <button class="btn btn-outline" id="btn-invoice">+ Invoice</button>
        <button class="btn btn-primary" id="btn-taxinvoice">+ New Tax Invoice</button>`;
      document.getElementById('btn-req').onclick = () => App.navigate('#/sales?new=Requirement');
      document.getElementById('btn-taxinvoice').onclick = () => App.navigate('#/sales?new=TaxInvoice');
      document.getElementById('btn-invoice').onclick = () => App.navigate('#/sales?new=Invoice');
      document.getElementById('btn-quote').onclick = () => App.navigate('#/sales?new=Quotation');
      document.getElementById('btn-challan').onclick = () => App.navigate('#/sales?new=DeliveryChallan');
      await this.renderDocs(body);
      if (params.id) { const d = (await UI.api('/api/salesdocs')).docs.find(x => x.doc_no === params.id); if (d) this.docDetail(d.id); }
    }
    if (tab === 'requirements') {
      actions.innerHTML = '<button class="btn btn-primary" id="btn-reqnew">+ New Requirement</button>';
      document.getElementById('btn-reqnew').onclick = () => App.navigate('#/sales?new=Requirement');
      await this.renderRequirements(body);
      if (params.id) this.reqDetail(Number(params.id));
    }
    if (tab === 'customers') {
      actions.innerHTML = '<button class="btn btn-primary" id="btn-cust">+ New Customer</button>';
      document.getElementById('btn-cust').onclick = () => this.custForm();
      await this.renderCustomers(body);
    }
    if (tab === 'receivables') await this.renderAging(body);
    if (tab === 'ledger') await this.renderLedger(body, params);
  },

  // ---------- Odoo-style quotation list view ----------
  async renderQuotations(body) {
    const { docs } = await UI.api('/api/salesdocs?type=Quotation');
    this._qlist = { docs, q: '', filters: new Set(['mine']), group: '', collapsed: new Set() };
    body.innerHTML = `
      <div class="panel">
        <div class="odo-searchbar">
          <input type="search" id="q-search" placeholder="Search quotation # / customer…">
          <span class="k-sub">Filters:</span>
          ${[['mine', 'My Quotations'], ['Draft', 'Draft'], ['Sent', 'Sent'], ['Accepted', 'Accepted'], ['Rejected', 'Rejected'], ['expired', 'Expired']].map(([k, l]) =>
      `<span class="odo-chip ${k === 'mine' ? 'on' : ''}" data-f="${k}">${l}</span>`).join('')}
          <span class="k-sub">Group By:</span>
          <span class="odo-chip"><select id="q-group">
            <option value="">None</option><option value="customer">Customer</option><option value="status">Status</option><option value="month">Month</option>
          </select></span>
          <button class="link-btn" id="q-clear">Clear</button>
        </div>
        <div id="q-out"></div>
      </div>`;
    const out = document.getElementById('q-out');
    const st = this._qlist;
    const paint = () => { out.innerHTML = this.qlistTable(); this.wireQlist(out); };
    document.getElementById('q-search').addEventListener('input', e => { st.q = e.target.value.trim().toLowerCase(); paint(); });
    document.getElementById('q-group').addEventListener('change', e => { st.group = e.target.value; st.collapsed.clear(); paint(); });
    document.getElementById('q-clear').onclick = () => {
      st.q = ''; st.filters = new Set(['mine']); st.group = ''; st.collapsed.clear();
      document.getElementById('q-search').value = ''; document.getElementById('q-group').value = '';
      body.querySelectorAll('.odo-chip[data-f]').forEach(c => c.classList.toggle('on', st.filters.has(c.dataset.f)));
      paint();
    };
    body.querySelectorAll('.odo-chip[data-f]').forEach(c => c.onclick = () => {
      const f = c.dataset.f;
      st.filters.has(f) ? st.filters.delete(f) : st.filters.add(f);
      c.classList.toggle('on', st.filters.has(f));
      st.collapsed.clear(); paint();
    });
    paint();
  },
  qlistFiltered() {
    const st = this._qlist;
    const today = new Date().toISOString().slice(0, 10);
    return st.docs.filter(d => {
      if (st.q && !(`${d.doc_no} ${d.customer_name || ''}`.toLowerCase().includes(st.q))) return false;
      if (st.filters.has('mine') && String(d.created_by) !== String(App.user?.id)) return false;
      const statuses = ['Draft', 'Sent', 'Accepted', 'Rejected'].filter(s => st.filters.has(s));
      if (statuses.length && !statuses.includes(d.status)) return false;
      if (st.filters.has('expired') && !(d.due_date && d.due_date < today && d.status !== 'Accepted')) return false;
      return true;
    });
  },
  qlistTable() {
    const st = this._qlist;
    const rows = this.qlistFiltered();
    const cols = `<thead><tr><th>Quotation #</th><th>Customer</th><th>Date</th><th>Valid Until</th><th>Client PO</th><th>Status</th><th class="num">Total</th></tr></thead>`;
    const line = d => `<tr data-q="${d.id}" style="cursor:pointer">
      <td><b>${UI.esc(d.doc_no)}</b></td><td>${UI.esc(d.customer_name)}</td>
      <td>${UI.fmtDate(d.doc_date)}</td><td>${d.due_date ? UI.fmtDate(d.due_date) : '<span class="k-sub">—</span>'}</td>
      <td>${d.po_ref ? `<span class="chip">${UI.esc(d.po_ref)}</span>` : '—'}</td>
      <td>${UI.badge(d.status)}</td><td class="num"><b>${UI.money(d.grand_total)}</b></td></tr>`;
    if (!rows.length) return `<div class="empty">No quotations match. Adjust filters or click "+ New Quotation".</div>`;
    if (!st.group) {
      const sum = rows.reduce((a, d) => a + Number(d.grand_total), 0);
      return `<div class="k-sub mb">${rows.length} quotation${rows.length > 1 ? 's' : ''} · ${UI.money(sum)}</div>
        <div class="table-wrap"><table class="data">${cols}<tbody>${rows.map(line).join('')}</tbody></table></div>`;
    }
    const keyOf = d => st.group === 'customer' ? (d.customer_name || '—')
      : st.group === 'status' ? d.status
        : (d.doc_date ? String(d.doc_date).slice(0, 7) : '—');
    const labelOf = k => st.group === 'month'
      ? new Date(k + '-01').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : k;
    const groups = {};
    rows.forEach(d => (groups[keyOf(d)] = groups[keyOf(d)] || []).push(d));
    const body2 = Object.keys(groups).sort().map(k => {
      const g = groups[k], sum = g.reduce((a, d) => a + Number(d.grand_total), 0);
      const open = !st.collapsed.has(k);
      return `<tr class="odo-group"><td colspan="7"><span class="g-toggle" data-g="${UI.esc(k)}">${open ? '▾' : '▸'} ${UI.esc(labelOf(k))}</span>
        <span class="g-sum"> — ${g.length} record${g.length > 1 ? 's' : ''} · ${UI.money(sum)}</span></td></tr>
        ${open ? g.map(line).join('') : ''}`;
    }).join('');
    return `<div class="table-wrap"><table class="data">${cols}<tbody>${body2}</tbody></table></div>`;
  },
  wireQlist(out) {
    out.querySelectorAll('tr[data-q]').forEach(tr => tr.onclick = () => App.navigate('#/sales?quote=' + tr.dataset.q));
    out.querySelectorAll('.g-toggle').forEach(t => t.onclick = () => {
      const st = this._qlist, k = t.dataset.g;
      st.collapsed.has(k) ? st.collapsed.delete(k) : st.collapsed.add(k);
      const body2 = out.querySelector('.table-wrap');
      if (body2) body2.outerHTML = this.qlistTable();
      this.wireQlist(out);
    });
  },

  // ---------- Odoo-style quotation form view ----------
  async renderQuoteForm(params) {
    const id = params.quote && params.quote !== 'new' ? Number(params.quote) : null;
    const [{ customers }, { items: master }, { warehouses }] = await Promise.all([
      UI.api('/api/customers'), UI.api('/api/items').catch(() => ({ items: [] })), UI.api('/api/warehouses').catch(() => ({ warehouses: [] }))
    ]);
    let doc = null, lines = [], source = null, project = null;
    if (id) {
      const r = await UI.api('/api/salesdocs/' + id);
      doc = r.doc; lines = r.items || [];
      if (doc.project_id) project = (await UI.api('/api/projects').catch(() => ({ projects: [] }))).projects?.find(p => p.id === doc.project_id) || null;
    } else if (params.source) {
      const r = await UI.api('/api/salesdocs/' + params.source).catch(() => null);
      if (r) { source = { doc: r.doc, items: r.items || [] }; lines = source.items.map(i => ({ ...i })); }
    }
    if (params.cust && !doc) {
      const c = customers.find(x => String(x.id) === String(params.cust));
      if (c) doc = { customer_id: c.id, place_of_supply: c.place_of_supply, due_date: null, po_ref: '', notes: source?.doc?.notes || '', status: 'Draft' };
    }
    const editable = !id || ['Draft', 'Sent'].includes(doc?.status);
    this._qf = { id, doc, lines, master, customers, warehouses, source, project, dirty: false, editable, tab: 'lines' };
    const cur = id ? (doc.project_id ? 3 : doc.status === 'Accepted' ? 2 : doc.status === 'Sent' ? 1 : 0) : 0;
    const title = id ? doc.doc_no : 'New Quotation';
    const steps = [['Draft', 0], ['Sent', 1], ['Accepted', 2], ['Project', 3]];
    return `
    <div class="odo-cp">
      <div>
        <div class="odo-crumb">
          <a onclick="App.navigate('#/sales?tab=quotations')">Sales</a><span class="sep">/</span>
          <a onclick="App.navigate('#/sales?tab=quotations')">Quotations</a><span class="sep">/</span>
          <span class="cur">${UI.esc(title)}</span>
          ${doc?.status === 'Rejected' ? UI.badge('Rejected') : ''}
        </div>
        <div class="odo-status" id="q-status">
          ${steps.map(([s, i]) => `<button data-s="${s}" class="${i === cur ? 'cur' : (i < cur ? 'done' : '')}">${s}${i === 3 && doc?.project_id ? ' ✓' : ''}</button>`).join('')}
        </div>
      </div>
      <div class="odo-cp-actions" id="q-actions"></div>
    </div>
    ${this.quoteSmartHtml(doc, source, project)}
    <div class="panel">
      <div id="q-head">
        <div class="form-grid">
          ${UI.select('customer_id', 'Customer *', [{ value: '', label: '— select —' }, ...customers.map(c => ({ value: c.id, label: `${c.name} (${c.gstin || 'URP'})` }))], doc?.customer_id)}
          ${editable ? UI.field('new_customer', 'Or add new customer', '', 'text', 'placeholder="Type a new company name to create one"') : ''}
          ${UI.field('place_of_supply', 'Place of Supply', doc?.place_of_supply || 'Maharashtra (27)')}
          ${UI.field('po_ref', 'Customer PO Ref', doc?.po_ref || '')}
          ${UI.field('due_date', 'Valid Until', doc?.due_date ? String(doc.due_date).slice(0, 10) : '', 'date')}
          ${UI.select('warehouse_id', 'Dispatch Warehouse', warehouses.map(w => ({ value: w.id, label: w.name })), doc?.warehouse_id || 1)}
        </div>
        <div class="odo-ntabs">
          <button class="active" data-t="lines">Order Lines</button>
          <button data-t="info">Other Info</button>
        </div>
        <div id="tab-lines">
          <div class="table-wrap"><table class="odo-lines" id="q-lines">
            <thead><tr><th style="min-width:150px">Product</th><th style="min-width:180px">Description</th><th style="min-width:90px">HSN/SAC</th>
              <th class="num" style="width:70px">Qty</th><th class="num" style="width:100px">Unit Price</th><th class="num" style="width:70px">GST %</th>
              <th class="num" style="width:110px">Amount</th><th style="width:34px"></th></tr></thead>
            <tbody id="q-lbody"></tbody>
          </table></div>
          ${editable ? '<button class="odo-add" id="q-add">+ Add Line</button>' : ''}
          <div class="odo-totals mt" id="q-totals"></div>
        </div>
        <div id="tab-info" class="hidden">
          <div class="form-grid">
            ${id ? `<div class="field"><span>Created</span><div class="odo-ro">${UI.fmtDate(doc.created_at)} by ${UI.esc(doc.created_by || '—')}</div></div>` : ''}
            ${source ? `<div class="field"><span>Source Requirement</span><div class="odo-ro"><button class="link-btn" onclick="App.views.sales.reqDetail(${source.doc.id})">${UI.esc(source.doc.doc_no)}</button></div></div>` : ''}
            ${id && doc.po_ref ? `<div class="field"><span>Client PO</span><div class="odo-ro">${UI.esc(doc.po_ref)}${doc.customer_po_date ? ' · ' + UI.fmtDate(doc.customer_po_date) : ''}</div></div>` : ''}
            ${id ? `<div class="field"><span>Status</span><div class="odo-ro">${UI.badge(doc.status)} ${doc.project_id ? UI.badge('Active') : ''}</div></div>` : ''}
          </div>
          ${UI.textarea('notes', 'Notes / Scope of Work', doc?.notes || '')}
        </div>
      </div>
    </div>`;
  },
  quoteSmartHtml(doc, source, project) {
    const bits = [];
    if (doc?.id) {
      bits.push(`<div class="odo-stat plain">Total<b>${UI.money(doc.grand_total)}</b></div>`);
      if (doc.po_ref) bits.push(`<div class="odo-stat plain">Client PO<b>${UI.esc(doc.po_ref)}</b></div>`);
      if (source) bits.push(`<div class="odo-stat clickable" onclick="App.views.sales.reqDetail(${source.doc.id})">Requirement<b>${UI.esc(source.doc.doc_no)}</b></div>`);
      if (project) bits.push(`<div class="odo-stat clickable" onclick="App.navigate('#/projects?id=${project.id}')">Project<b>${UI.esc(project.code)}</b></div>`);
    }
    return bits.length ? `<div class="odo-smart">${bits.join('')}</div>` : '';
  },
  async mountQuoteForm(params) {
    const st = this._qf;
    if (!st) return;
    const qrecalc = () => {
      let taxable = 0, tax = 0;
      const pos = document.querySelector('[name=place_of_supply]')?.value || '';
      const inter = !pos.startsWith('Maharashtra');
      document.querySelectorAll('#q-lbody tr').forEach(tr => {
        const qty = Number(tr.querySelector('[name=qty]').value || 0);
        const rate = Number(tr.querySelector('[name=unit_price]').value || 0);
        const gst = Number(tr.querySelector('[name=gst_rate]').value || 0);
        const amt = qty * rate;
        tr.querySelector('.amt').textContent = UI.money(amt);
        taxable += amt; tax += amt * gst / 100;
      });
      const t = document.getElementById('q-totals');
      if (t) t.innerHTML = `Taxable: <b>${UI.money(taxable)}</b><br>
        ${inter ? `IGST: <b>${UI.money(tax)}</b>` : `CGST: <b>${UI.money(tax / 2)}</b> · SGST: <b>${UI.money(tax / 2)}</b>`}<br>
        <div class="grand">Total: <b>${UI.money(taxable + tax)}</b></div>
        <div class="k-sub">${inter ? 'Inter-state supply → IGST' : 'Intra-state supply → CGST + SGST'}</div>`;
    };
    const markDirty = () => {
      if (!st.editable) return;
      st.dirty = true;
      document.getElementById('q-save')?.removeAttribute('disabled');
      document.getElementById('q-discard')?.removeAttribute('disabled');
    };
    const addLine = (ln) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><select name="item_id"><option value="">— custom —</option>${st.master.map(i => `<option value="${i.id}" ${String(i.id) === String(ln?.item_id || '') ? 'selected' : ''}>${UI.esc(i.sku)} · ${UI.esc(i.name)}</option>`).join('')}</select></td>
        <td><input name="description" value="${UI.esc(ln?.description || '')}"></td>
        <td><input name="hsn_sac" value="${UI.esc(ln?.hsn_sac || '')}"></td>
        <td class="num"><input name="qty" type="number" step="any" value="${ln?.qty ?? 1}"></td>
        <td class="num"><input name="unit_price" type="number" step="any" value="${ln?.unit_price ?? ''}"></td>
        <td class="num"><input name="gst_rate" type="number" step="any" value="${ln?.gst_rate ?? 18}"></td>
        <td class="num amt">${UI.money(0)}</td>
        <td>${st.editable ? '<button class="odo-rm" title="Remove line">✕</button>' : ''}</td>`;
      tr.querySelector('[name=item_id]').onchange = e => {
        const it = st.master.find(i => String(i.id) === e.target.value);
        if (it) {
          tr.querySelector('[name=description]').value = it.name;
          tr.querySelector('[name=hsn_sac]').value = it.hsn_sac || '';
          tr.querySelector('[name=unit_price]').value = it.sale_price || '';
          tr.querySelector('[name=gst_rate]').value = it.gst_rate ?? 18;
        }
        qrecalc(); markDirty();
      };
      tr.querySelector('.odo-rm')?.addEventListener('click', () => { tr.remove(); qrecalc(); markDirty(); });
      tr.addEventListener('input', () => { qrecalc(); markDirty(); });
      document.getElementById('q-lbody').appendChild(tr);
      qrecalc();
    };
    (st.lines.length ? st.lines : [null]).forEach(ln => addLine(ln));
    document.getElementById('q-add')?.addEventListener('click', () => { addLine(); markDirty(); });
    document.querySelector('[name=place_of_supply]').addEventListener('input', () => { qrecalc(); markDirty(); });
    document.getElementById('q-head').addEventListener('input', markDirty);
    document.getElementById('q-head').addEventListener('change', markDirty);
    // notebook tabs
    document.querySelectorAll('.odo-ntabs button').forEach(b => b.onclick = () => {
      st.tab = b.dataset.t;
      document.querySelectorAll('.odo-ntabs button').forEach(x => x.classList.toggle('active', x === b));
      document.getElementById('tab-lines').classList.toggle('hidden', st.tab !== 'lines');
      document.getElementById('tab-info').classList.toggle('hidden', st.tab !== 'info');
    });
    // control panel actions
    const acts = document.getElementById('q-actions');
    const btn = (id, label, cls) => `<button class="btn ${cls}" id="${id}" ${id === 'q-save' || id === 'q-discard' ? 'disabled' : ''}>${label}</button>`;
    acts.innerHTML = [
      st.editable ? btn('q-save', st.id ? 'Save' : 'Create Quotation', 'btn-primary') : '',
      st.editable ? btn('q-discard', 'Discard', 'btn-outline') : '',
      st.id ? btn('q-print', '🖨 Print', 'btn-outline') : '',
      st.id && st.doc.status === 'Draft' ? btn('q-send', 'Send', 'btn-tonal') : '',
      st.id && st.doc.status === 'Sent' ? btn('q-todraft', 'Set to Draft', 'btn-outline') + btn('q-accept', '✓ Confirm Sale — Record Client PO', 'btn-primary') : '',
      st.id && st.doc.status === 'Rejected' ? btn('q-todraft', 'Set to Draft', 'btn-tonal') : '',
      st.id && st.doc.status === 'Accepted' && !st.doc.project_id ? btn('q-project', '📂 Create Project', 'btn-primary') : ''
    ].join('');
    const reload = () => App.navigate('#/sales?quote=' + st.id);
    acts.querySelector('#q-print')?.addEventListener('click', () => App.views.settings.openInvoicePrint(st.doc, st.lines));
    acts.querySelector('#q-send')?.addEventListener('click', async () => {
      try { await UI.api(`/api/salesdocs/${st.id}/status`, { method: 'POST', body: { status: 'Sent' } }); UI.toast('Quotation marked Sent', 'ok'); reload(); }
      catch (e) { UI.toast(e.message, 'err'); }
    });
    acts.querySelector('#q-todraft')?.addEventListener('click', async () => {
      try { await UI.api(`/api/salesdocs/${st.id}/status`, { method: 'POST', body: { status: 'Draft' } }); UI.toast('Back to Draft', 'ok'); reload(); }
      catch (e) { UI.toast(e.message, 'err'); }
    });
    acts.querySelector('#q-accept')?.addEventListener('click', () => this.acceptForm(st.id, 'form'));
    acts.querySelector('#q-project')?.addEventListener('click', () => this.projectFromQuote(st.id, st.doc));
    acts.querySelector('#q-discard')?.addEventListener('click', () => App.navigate('#/sales?tab=quotations'));
    const save = async () => {
      if (!st.editable) return;
      const head = UI.formValues('q-head');
      head.notes = (document.querySelector('textarea[name=notes]')?.value || '').trim();
      const newName = (head.new_customer || '').trim();
      delete head.new_customer;
      const its = [...document.querySelectorAll('#q-lbody tr')].map(tr => {
        const o = {};
        tr.querySelectorAll('[name]').forEach(el => o[el.name] = el.type === 'number' ? Number(el.value || 0) : el.value.trim());
        o.item_id = o.item_id ? Number(o.item_id) : null;
        return o;
      }).filter(i => i.description);
      if (!its.length) return UI.toast('Add at least one line item', 'err');
      try {
        if (newName) {
          const { id: cid } = await UI.api('/api/customers', { method: 'POST', body: { name: newName } });
          head.customer_id = cid;
          UI.toast(`Customer "${newName}" created`, 'ok');
        }
        if (!head.customer_id) return UI.toast('Select or add a customer', 'err');
        if (st.id) {
          const r = await UI.api('/api/salesdocs/' + st.id, { method: 'PUT', body: { ...head, items: its } });
          UI.toast(`Saved — total ${UI.money(r.grand_total)}`, 'ok');
          st.dirty = false;
          reload();
        } else {
          const body2 = { ...head, doc_type: 'Quotation', items: its };
          if (st.source) body2.source_doc_id = st.source.doc.id;
          const r = await UI.api('/api/salesdocs', { method: 'POST', body: body2 });
          UI.toast(`${r.doc_no} created — total ${UI.money(r.grand_total)}`, 'ok');
          st.dirty = false;
          App.navigate('#/sales?quote=' + r.id);
        }
      } catch (e) { UI.toast(e.message, 'err'); }
    };
    acts.querySelector('#q-save')?.addEventListener('click', save);
    // statusbar step clicks: Draft→Sent, Sent/Rejected→Draft
    document.querySelectorAll('#q-status button').forEach(b => b.onclick = async () => {
      if (!st.id) return;
      const s = b.dataset.s;
      try {
        if (s === 'Sent' && st.doc.status === 'Draft') { await UI.api(`/api/salesdocs/${st.id}/status`, { method: 'POST', body: { status: 'Sent' } }); UI.toast('Quotation marked Sent', 'ok'); reload(); }
        else if (s === 'Draft' && ['Sent', 'Rejected'].includes(st.doc.status)) { await UI.api(`/api/salesdocs/${st.id}/status`, { method: 'POST', body: { status: 'Draft' } }); UI.toast('Back to Draft', 'ok'); reload(); }
      } catch (e) { UI.toast(e.message, 'err'); }
    });
    // Ctrl/Cmd+S saves; Esc discards when dirty
    this._qfKey = e => {
      if (!document.getElementById('q-lines')) { document.removeEventListener('keydown', this._qfKey); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); }
      if (e.key === 'Escape' && st.dirty && st.editable && !document.querySelector('.modal-backdrop')) {
        if (confirm('Discard unsaved changes?')) App.navigate('#/sales?tab=quotations');
      }
    };
    document.addEventListener('keydown', this._qfKey);
    qrecalc();
  },

  async renderDocs(body) {
    const { docs } = await UI.api('/api/salesdocs');
    const list = docs.filter(d => d.doc_type !== 'Requirement');
    body.innerHTML = `
      <div class="panel"><h2>Outward Document Billing Engine</h2>
      ${UI.table([
      { key: 'doc_no', label: 'Doc #' }, { key: 'doc_type', label: 'Type' }, 'customer_name',
      { key: 'grand_total', label: 'Amount', num: true }, 'gst_status',
      { key: 'carrier', label: 'Tracking' }, 'status', { key: '_a', label: '' }],
      list, {
        doc_no: v => `<b>${UI.esc(v)}</b>`, doc_type: v => UI.badge(v), grand_total: v => `<b>${UI.money(v)}</b>`,
        gst_status: v => UI.badge(v), status: v => UI.badge(v),
        carrier: (v, r) => r.eway_awb ? `<span class="chip">${UI.esc(v || '')} ${UI.esc(r.eway_awb)}</span>` : '—',
        _a: (v, r) => `<button class="btn btn-tonal btn-sm" onclick="App.views.sales.docDetail(${r.id})">Open</button>`
      })}</div>`;
  },

  async renderRequirements(body) {
    const { docs } = await UI.api('/api/salesdocs?type=Requirement');
    body.innerHTML = `<div class="panel"><h2>Client Requirements</h2>
      <div class="k-sub mb">Every inbound client request is captured here first — turn it into a Quotation, or forward it to vendors as an RFQ / Purchase Order.</div>
      ${docs.length ? UI.table([
      { key: 'doc_no', label: 'Req #' }, { key: 'customer_name', label: 'Client' },
      { key: 'required_by', label: 'Required By' }, { key: 'grand_total', label: 'Est. Value', num: true },
      { key: 'status', label: 'Status' }, { key: 'documents', label: 'Documents' }, { key: '_a', label: '' }
    ], docs, {
        doc_no: v => `<b>${UI.esc(v)}</b>`,
        customer_name: v => UI.esc(v),
        required_by: (v, r) => r.due_date ? UI.fmtDate(r.due_date) : '<span class="k-sub">—</span>',
        grand_total: v => UI.money(v),
        status: v => UI.badge(v),
        documents: (v, r) => (r.links || []).length
          ? (r.links || []).map(l => `<button class="link-btn" style="margin-right:8px" onclick="App.views.sales.openLink('${l.src}',${l.id})">${UI.esc(l.doc_no)}</button>`).join('')
          : '<span class="k-sub">not quoted yet</span>',
        _a: (v, r) => `<button class="btn btn-tonal btn-sm" onclick="App.views.sales.reqDetail(${r.id})">Open</button>`
      }) : '<div class="empty">No requirements yet — click "+ New Requirement" to log a client request.</div>'}</div>`;
  },

  async openLink(src, id) {
    if (src === 'po') { UI.closeModal(); App.navigate('#/procurement?tab=pos&po_id=' + id); }
    else this.docDetail(id);
  },

  async reqDetail(id) {
    const { doc, items, children } = await UI.api('/api/salesdocs/' + id);
    const rows = children || [];
    const b = UI.modal(`${doc.doc_no} — ${doc.customer_name}`, `
      <div class="flex mb">${UI.badge(doc.doc_type)} ${UI.badge(doc.status)}
        ${doc.due_date ? `<span class="chip">Required by ${UI.fmtDate(doc.due_date)}</span>` : ''}</div>
      <div class="k-sub mb">GSTIN: ${UI.esc(doc.customer_gstin || 'URP')} · Place of Supply: ${UI.esc(doc.place_of_supply)} · Logged: ${UI.fmtDate(doc.doc_date)}</div>
      <div class="table-wrap"><table class="data"><thead><tr><th>Product</th><th>HSN</th><th class="num">Qty</th><th class="num">Est. Rate</th><th class="num">Est. Amount</th></tr></thead>
      <tbody>${items.map(i => `<tr><td>${UI.esc(i.description)}</td><td>${UI.esc(i.hsn_sac || '')}</td><td class="num">${i.qty}</td><td class="num">${UI.money(i.unit_price)}</td><td class="num">${UI.money(i.amount)}</td></tr>`).join('')}</tbody></table></div>
      <div class="right mt"><b>Estimated value: ${UI.money(doc.grand_total)}</b></div>
      ${doc.notes ? `<div class="k-sub mt">Scope: ${UI.esc(doc.notes)}</div>` : ''}
      <h3>Raised Documents</h3>
      ${rows.length ? rows.map(l => `<div class="flex" style="gap:10px;margin:6px 0">
          ${UI.badge(l.doc_type === 'PurchaseOrder' ? 'PurchaseOrder' : l.doc_type)} <b>${UI.esc(l.doc_no)}</b>
          <span class="k-sub">${UI.money(l.grand_total)}</span> ${UI.badge(l.status)}
          <button class="link-btn" onclick="App.views.sales.openLink('${l.src}',${l.id})">Open</button></div>`).join('')
        : '<div class="k-sub">Nothing raised from this requirement yet.</div>'}
      <div class="pill-group mt">
        <button class="btn btn-primary btn-sm" id="rq-quote">🧾 Create Quotation</button>
        <button class="btn btn-outline btn-sm" id="rq-rfq">📊 Send to Vendors (RFQ)</button>
        <button class="btn btn-outline btn-sm" id="rq-po">📦 Create Purchase Order</button>
      </div>`,
      `<button class="btn btn-outline" onclick="UI.closeModal()">Close</button>`);
    b.querySelector('#rq-quote').onclick = () => { UI.closeModal(); App.navigate(`#/sales?new=Quotation&cust=${doc.customer_id}&source=${doc.id}`); };
    b.querySelector('#rq-rfq').onclick = () => { UI.closeModal(); App.navigate(`#/procurement?tab=quotes&new=rfq&source=${doc.id}`); };
    b.querySelector('#rq-po').onclick = () => { UI.closeModal(); App.navigate(`#/procurement?tab=pos&new=po&source=${doc.id}`); };
  },

  async renderDocForm(doc_type, custId, sourceId) {
    this._source = null;
    if (sourceId) {
      const { doc: src, items } = await UI.api('/api/salesdocs/' + sourceId).catch(() => ({ doc: null, items: [] }));
      if (src) this._source = { doc: src, items: items || [] };
    }
    const [{ customers }, { items }, { warehouses }] = await Promise.all([
      UI.api('/api/customers'), UI.api('/api/items').catch(() => ({ items: [] })), UI.api('/api/warehouses').catch(() => ({ warehouses: [] }))
    ]);
    const typeLabels = { Requirement: 'Client Requirement', Quotation: 'Quotation', Proforma: 'Proforma Invoice', TaxInvoice: 'GST Tax Invoice', Invoice: 'Invoice', DeliveryChallan: 'Delivery Receipt / Challan', CreditNote: 'Credit Note', DebitNote: 'Debit Note' };
    const label = typeLabels[doc_type] || doc_type;
    const srcSub = this._source ? `From requirement ${this._source.doc.doc_no} — review & adjust before sending` : '';
    const subByType = {
      Requirement: 'Log what the client needs — products & quantities · convert to a quotation or a vendor purchase order later',
      Quotation: 'Send to client · accept to record their purchase order'
    };
    return `
    <div class="page-head">
      <div><h1>New ${doc_type === 'TaxInvoice' ? 'Tax Invoice' : UI.esc(label)}</h1><div class="sub">${srcSub || subByType[doc_type] || 'Enter line items; taxes and totals update live'}</div></div>
      <div class="flex">
        <button class="btn btn-outline" id="df-cancel">← Back to Sales</button>
        <button class="btn btn-primary" id="dl-save">Generate ${doc_type === 'TaxInvoice' ? 'Tax Invoice' : (UI.esc(label) || 'Document')}</button>
      </div></div>
    <div class="panel"><h2>Document Details</h2>
      <div class="form-grid" id="df">
        ${UI.select('customer_id', 'Customer *', customers.map(c => ({ value: c.id, label: `${c.name} (${c.gstin || 'URP'})` })), custId)}
        ${UI.field('new_customer', 'Or add new customer / company', '', 'text', 'placeholder="Type a new company name to create one"')}
        ${UI.select('warehouse_id', 'Dispatch Warehouse', warehouses.map(w => ({ value: w.id, label: w.name })), 1)}
        ${UI.field('place_of_supply', 'Place of Supply', 'Maharashtra (27)')}
        ${doc_type !== 'Requirement' ? UI.field('po_ref', 'Customer PO Ref') : ''}
        ${doc_type === 'Quotation' ? UI.field('due_date', 'Valid Until', '', 'date') : ''}
        ${doc_type === 'Requirement' ? UI.field('due_date', 'Required By', '', 'date') : ''}
        ${doc_type === 'TaxInvoice' || doc_type === 'Invoice' || doc_type === 'DeliveryChallan' ? `
        ${UI.field('carrier', 'Carrier')}
        ${UI.field('eway_awb', 'E-Way Bill / AWB #')}
        ${UI.field('due_date', 'Payment Due Date', '', 'date')}` : ''}
      </div>
      ${doc_type === 'Requirement' || doc_type === 'Quotation'
        ? UI.textarea('notes', doc_type === 'Requirement' ? 'Scope / what the client asked for' : 'Notes / Scope of Work', this._source?.doc?.notes || '')
        : ''}
      </div>
    <div class="panel"><h2>Line Items <button class="btn btn-outline btn-sm" id="dl-add">+ Add line</button></h2>
      ${doc_type === 'Requirement' ? '<div class="k-sub mb">Add the products/quantities the client asked for. Pricing is added later on the quotation.</div>' : ''}
      <div id="dl-lines"></div></div>
    ${doc_type === 'Requirement' ? '' : '<div class="panel" id="dl-totals" style="text-align:right"></div>'}`;
  },

  async mountDocForm(doc_type, sourceId) {
    const isReq = doc_type === 'Requirement';
    const [{ items }] = await Promise.all([UI.api('/api/items').catch(() => ({ items: [] }))]);
    const lines = document.querySelector('#dl-lines');
    const totals = document.querySelector('#dl-totals');
    const recalc = () => {
      if (isReq || !totals) return;
      let taxable = 0, tax = 0;
      const pos = document.querySelector('[name=place_of_supply]').value;
      const inter = !pos.startsWith('Maharashtra');
      lines.querySelectorAll('.form-grid').forEach(g => {
        const qty = Number(g.querySelector('[name=qty]').value || 0), rate = Number(g.querySelector('[name=unit_price]').value || 0), gst = Number(g.querySelector('[name=gst_rate]').value || 0);
        taxable += qty * rate; tax += qty * rate * gst / 100;
      });
      totals.innerHTML = `Taxable: <b>${UI.money(taxable)}</b><br>
        ${inter ? `IGST: <b>${UI.money(tax)}</b>` : `CGST: <b>${UI.money(tax / 2)}</b> · SGST: <b>${UI.money(tax / 2)}</b>`}<br>
        <span style="font-size:16px">Grand Total: <b>${UI.money(taxable + tax)}</b></span>
        <div class="k-sub">${inter ? 'Inter-state supply → IGST' : 'Intra-state supply → CGST + SGST'}</div>`;
    };
    const addLine = (item) => {
      const div = document.createElement('div');
      div.className = 'form-grid card mb'; div.style.padding = '10px';
      div.innerHTML = isReq ? `
        ${UI.select('item_id', 'Item', [{ value: '', label: '— custom —' }, ...items.map(i => ({ value: i.id, label: `${i.sku} · ${i.name}` }))])}
        ${UI.field('description', 'Description', item?.name || '')}
        ${UI.field('qty', 'Qty', 1, 'number', 'step="any"')}
        <div style="grid-column:1/-1"><button class="link-btn danger dl-rm">Remove</button></div>` : `
        ${UI.select('item_id', 'Item', [{ value: '', label: '— custom —' }, ...items.map(i => ({ value: i.id, label: `${i.sku} · ${i.name}` }))])}
        ${UI.field('description', 'Description', item?.name || '')}
        ${UI.field('hsn_sac', 'HSN/SAC', item?.hsn_sac || '')}
        ${UI.field('qty', 'Qty', 1, 'number', 'step="any"')}
        ${UI.field('unit_price', 'Unit Price', item?.sale_price || '', 'number', 'step="any"')}
        ${UI.field('gst_rate', 'GST %', item?.gst_rate ?? 18, 'number', 'step="any"')}
        <div style="grid-column:1/-1"><button class="link-btn danger dl-rm">Remove</button></div>`;
      div.querySelector('.dl-rm').onclick = () => { div.remove(); recalc(); };
      div.querySelector('[name=item_id]').onchange = e => {
        const it = items.find(i => String(i.id) === e.target.value);
        if (it) {
          div.querySelector('[name=description]').value = it.name;
          if (!isReq) {
            div.querySelector('[name=hsn_sac]').value = it.hsn_sac;
            div.querySelector('[name=unit_price]').value = doc_type === 'DeliveryChallan' ? it.purchase_price || it.sale_price : it.sale_price;
            div.querySelector('[name=gst_rate]').value = it.gst_rate;
          }
        }
        recalc();
      };
      div.addEventListener('input', recalc);
      lines.appendChild(div);
      recalc();
    };
    addLine(items[0]);
    if (this._source) {
      // Requirements/quotes carry multiple products — clone one line per source line
      const src = this._source.items;
      const first = lines.firstElementChild;
      if (src.length && first) {
        const fill = (div, s) => {
          div.querySelector('[name=item_id]').value = s.item_id || '';
          div.querySelector('[name=description]').value = s.description || '';
          div.querySelector('[name=qty]').value = s.qty || 1;
          if (!isReq) {
            div.querySelector('[name=hsn_sac]').value = s.hsn_sac || '';
            div.querySelector('[name=unit_price]').value = s.unit_price || '';
            div.querySelector('[name=gst_rate]').value = s.gst_rate ?? 18;
          }
        };
        fill(first, src[0]);
        for (let i = 1; i < src.length; i++) { addLine(); fill(lines.lastElementChild, src[i]); }
        recalc();
      }
    }
    document.querySelector('#dl-add').onclick = () => addLine();
    document.querySelector('#df-cancel').onclick = () => App.navigate(sourceId || doc_type === 'Requirement' ? '#/sales?tab=requirements' : '#/sales?tab=docs');
    document.querySelector('[name=place_of_supply]').addEventListener('input', recalc);
    recalc();
    document.querySelector('#dl-save').onclick = async () => {
      const head = UI.formValues('df');
      head.notes = (document.querySelector('textarea[name=notes]')?.value || '').trim();
      delete head.new_customer;
      const its = [...lines.querySelectorAll('.form-grid')].map(g => {
        const o = {}; g.querySelectorAll('[name]').forEach(el => o[el.name] = el.type === 'number' ? Number(el.value || 0) : el.value.trim());
        o.item_id = o.item_id ? Number(o.item_id) : null; return o;
      }).filter(i => i.description);
      if (!its.length) return UI.toast('Add at least one line item', 'err');
      const newName = (document.querySelector('[name=new_customer]')?.value || '').trim();
      try {
        if (newName) {
          const { id: cid } = await UI.api('/api/customers', { method: 'POST', body: { name: newName } });
          head.customer_id = cid;
          UI.toast(`Customer "${newName}" created`, 'ok');
        }
        if (!head.customer_id) return UI.toast('Select or add a customer', 'err');
        const body = { ...head, doc_type, items: its };
        if (sourceId) body.source_doc_id = Number(sourceId);
        const r = await UI.api('/api/salesdocs', { method: 'POST', body });
        UI.toast(`${r.doc_no} generated — total ${UI.money(r.grand_total)}${r.gst.inter ? ' (IGST)' : ' (CGST+SGST)'}`, 'ok');
        App.navigate(doc_type === 'Requirement' || sourceId ? '#/sales?tab=requirements' : '#/sales?tab=docs');
      } catch (e) { UI.toast(e.message, 'err'); }
    };
  },

  async docDetail(id) {
    const { doc, items, receipts } = await UI.api('/api/salesdocs/' + id);
    const totalPaid = receipts.reduce((s, r) => s + Number(r.amount), 0);
    const bal = Number(doc.grand_total) - Number(doc.paid_amount);
    const b = UI.modal(`${doc.doc_no} — ${doc.customer_name}`, `
      <div class="flex mb">${UI.badge(doc.doc_type)} ${UI.badge(doc.status)} ${UI.badge(doc.gst_status)}
        ${doc.eway_awb ? `<span class="chip">E-Way/AWB: ${UI.esc(doc.eway_awb)}</span>` : ''}
        ${doc.carrier ? `<span class="chip">${UI.esc(doc.carrier)}</span>` : ''}
        ${doc.po_ref ? `<span class="chip">Cust PO: ${UI.esc(doc.po_ref)}</span>` : ''}</div>
      <div class="k-sub mb">GSTIN: ${UI.esc(doc.customer_gstin || 'URP')} · Place of Supply: ${UI.esc(doc.place_of_supply)} · Date: ${UI.fmtDate(doc.doc_date)}</div>
      <div class="table-wrap"><table class="data"><thead><tr><th>Description</th><th>HSN</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">GST</th><th class="num">Amount</th></tr></thead>
      <tbody>${items.map(i => `<tr><td>${UI.esc(i.description)}</td><td>${UI.esc(i.hsn_sac || '')}</td><td class="num">${i.qty}</td><td class="num">${UI.money(i.unit_price)}</td><td class="num">${i.gst_rate}%</td><td class="num">${UI.money(i.amount)}</td></tr>`).join('')}</tbody></table></div>
      <div class="right mt">
        Taxable: ${UI.money(doc.taxable_value)}<br>
        ${Number(doc.igst) > 0 ? `IGST: ${UI.money(doc.igst)}` : `CGST: ${UI.money(doc.cgst)} · SGST: ${UI.money(doc.sgst)}`}<br>
        <b style="font-size:15px">Grand Total: ${UI.money(doc.grand_total)}</b><br>
        Paid: ${UI.money(doc.paid_amount)} · Balance: <b style="color:${bal > 0 ? 'var(--red)' : 'var(--green)'}">${UI.money(bal)}</b>
      </div>
      <div class="pill-group mt">
        ${doc.doc_type === 'Requirement' ? `
        <button class="btn btn-primary btn-sm" id="rq-quote">🧾 Create Quotation</button>
        <button class="btn btn-outline btn-sm" id="rq-rfq">📊 Send to Vendors (RFQ)</button>
        <button class="btn btn-outline btn-sm" id="rq-po">📦 Create Purchase Order</button>` : `
        <button class="btn btn-outline btn-sm" id="d-print">🖨 Print${doc.doc_type === 'Quotation' ? ' Quotation' : ' Invoice'}</button>
        ${doc.doc_type === 'Quotation' ? (doc.status === 'Accepted' ? `
        <button class="btn btn-primary btn-sm" id="q-project">📂 Create Project</button>` : `
        ${doc.status === 'Draft' ? `<button class="btn btn-outline btn-sm" id="q-send">Mark Sent</button>` : ''}
        <button class="btn btn-primary btn-sm" id="q-accept">✓ Accept — Record Client PO</button>
        <button class="btn btn-outline btn-sm" id="q-reject">Reject</button>`) : ''}
        ${doc.doc_type === 'TaxInvoice' ? `
        <button class="btn btn-tonal btn-sm" id="d-eway">⬇ E-Way Bill JSON</button>
        <button class="btn btn-tonal btn-sm" id="d-cn">+ Credit Note</button>
        <button class="btn btn-tonal btn-sm" id="d-dn">+ Debit Note</button>` : ''}
        ${doc.doc_type === 'TaxInvoice' || doc.doc_type === 'Invoice' ? `
        <button class="btn btn-primary btn-sm" id="d-pay">Record Payment</button>` : ''}
        ${doc.doc_type === 'Quotation' ? '' : `
        <button class="btn btn-outline btn-sm" id="d-ship">Update Shipment</button>
        <button class="btn btn-outline btn-sm" id="d-del">Mark Delivered</button>`}`}
      </div>`,
      `<button class="btn btn-outline" onclick="UI.closeModal()">Close</button>`);
    const dl = (url, name) => fetch(url, { headers: {} }).then(r => r.blob()).then(blob => {
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
    }).catch(e => UI.toast(e.message, 'err'));
    b.querySelector('#rq-quote')?.addEventListener('click', () => { UI.closeModal(); App.navigate(`#/sales?new=Quotation&cust=${doc.customer_id}&source=${doc.id}`); });
    b.querySelector('#rq-rfq')?.addEventListener('click', () => { UI.closeModal(); App.navigate(`#/procurement?tab=quotes&new=rfq&source=${doc.id}`); });
    b.querySelector('#rq-po')?.addEventListener('click', () => { UI.closeModal(); App.navigate(`#/procurement?tab=pos&new=po&source=${doc.id}`); });
    b.querySelector('#d-print')?.addEventListener('click', () => App.views.settings.openInvoicePrint(doc, items));
    b.querySelector('#q-send')?.addEventListener('click', () => this.setQuoteStatus(id, 'Sent'));
    b.querySelector('#q-reject')?.addEventListener('click', () => this.setQuoteStatus(id, 'Rejected'));
    b.querySelector('#q-accept')?.addEventListener('click', () => { UI.closeModal(); this.acceptForm(id); });
    b.querySelector('#q-project')?.addEventListener('click', () => { UI.closeModal(); this.projectFromQuote(id, doc); });
    b.querySelector('#d-eway')?.addEventListener('click', () => dl(`/api/salesdocs/${id}/eway-json`, `${doc.doc_no}_eway.json`));
    b.querySelector('#d-cn')?.addEventListener('click', () => { UI.closeModal(); this.noteForm(id, 'CreditNote'); });
    b.querySelector('#d-dn')?.addEventListener('click', () => { UI.closeModal(); this.noteForm(id, 'DebitNote'); });
    b.querySelector('#d-pay')?.addEventListener('click', () => { UI.closeModal(); this.payForm(id, bal); });
    b.querySelector('#d-ship')?.addEventListener('click', () => { UI.closeModal(); this.shipForm(id); });
    b.querySelector('#d-del')?.addEventListener('click', async () => {
      try { await UI.api(`/api/salesdocs/${id}/deliver`, { method: 'POST' }); UI.closeModal(); UI.toast('Marked delivered', 'ok'); App.navigate('#/sales?tab=docs'); }
      catch (e) { UI.toast(e.message, 'err'); }
    });
  },
  async noteForm(id, note_type) {
    const b = UI.modal(note_type === 'CreditNote' ? 'Issue Credit Note' : 'Issue Debit Note', `
      ${UI.textarea('reason', 'Reason (mandatory as per GST)')}
      <p class="k-sub">Full invoice values will be reversed/re-issued. Credit notes reduce the customer's receivable.</p>`,
      `<button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-primary" id="n-save">Issue ${note_type === 'CreditNote' ? 'Credit' : 'Debit'} Note</button>`);
    b.querySelector('#n-save').onclick = async () => {
      const reason = b.querySelector('[name=reason]').value.trim();
      if (!reason) return UI.toast('Reason required', 'err');
      try {
        const r = await UI.api(`/api/salesdocs/${id}/credit-debit`, { method: 'POST', body: { note_type, reason } });
        UI.closeModal(); UI.toast(`${r.doc_no} issued`, 'ok'); App.navigate('#/sales?tab=docs');
      } catch (e) { UI.toast(e.message, 'err'); }
    };
  },
  async payForm(id, bal) {
    const b = UI.modal('Record Payment Receipt', `
      <div class="form-grid" id="pf">
        ${UI.field('amount', 'Amount', bal > 0 ? bal : '', 'number', 'step="any" min="0"')}
        ${UI.select('mode', 'Mode', ['Bank', 'Cash', 'UPI', 'Cheque'], 'Bank')}
        ${UI.field('ref_no', 'Reference / UTR No')}
        ${UI.field('receipt_date', 'Receipt Date', new Date().toISOString().slice(0, 10), 'date')}
      </div>`,
      `<button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-primary" id="p-save">Save Receipt</button>`);
    b.querySelector('#p-save').onclick = async () => {
      const d = UI.formValues('pf');
      if (!d.amount) return UI.toast('Amount required', 'err');
      try {
        const r = await UI.api(`/api/salesdocs/${id}/receive-payment`, { method: 'POST', body: d });
        UI.closeModal(); UI.toast(`Receipt ${r.receipt_no} recorded`, 'ok');
        if (r.receipt) UI.confirm(`Print receipt ${r.receipt_no}?`, () => App.views.settings.openReceiptPrint(r.receipt));
        else App.navigate('#/sales?tab=docs');
      } catch (e) { UI.toast(e.message, 'err'); }
    };
  },
  async shipForm(id) {
    const b = UI.modal('Update Outward Shipment', `
      <div class="form-grid" id="sf">
        ${UI.field('carrier', 'Carrier (DTDC/BlueDart...)')}
        ${UI.field('awb_no', 'AWB / Tracking #')}
      </div>`,
      `<button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-primary" id="s-save">Save</button>`);
    b.querySelector('#s-save').onclick = async () => {
      try { await UI.api(`/api/salesdocs/${id}/ship`, { method: 'POST', body: UI.formValues('sf') }); UI.closeModal(); UI.toast('Shipment updated', 'ok'); App.navigate('#/sales?tab=docs'); }
      catch (e) { UI.toast(e.message, 'err'); }
    };
  },
  async setQuoteStatus(id, status) {
    try { await UI.api(`/api/salesdocs/${id}/status`, { method: 'POST', body: { status } }); UI.closeModal(); UI.toast(`Quotation marked ${status}`, 'ok'); this.docDetail(id); }
    catch (e) { UI.toast(e.message, 'err'); }
  },
  async acceptForm(id, ret) {
    const back = () => ret === 'form' ? App.navigate('#/sales?quote=' + id) : this.docDetail(id);
    const b = UI.modal('Accept Quotation — Record Client PO', `
      <p class="k-sub">Enter the purchase order your client issued against this quotation.</p>
      <div class="form-grid" id="af">
        ${UI.field('po_ref', 'Client PO Number')}
        ${UI.field('customer_po_date', 'Client PO Date', new Date().toISOString().slice(0, 10), 'date')}
      </div>${UI.textarea('notes', 'Notes (optional)')}`,
      `<button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-primary" id="a-save">Accept Quotation</button>`);
    b.querySelector('#a-save').onclick = async () => {
      const d = UI.formValues('af'); d.notes = b.querySelector('[name=notes]').value;
      if (!d.po_ref) return UI.toast('Client PO number required', 'err');
      try { await UI.api(`/api/salesdocs/${id}/accept`, { method: 'POST', body: d }); UI.closeModal(); UI.toast('Quotation accepted', 'ok'); back(); }
      catch (e) { UI.toast(e.message, 'err'); }
    };
  },
  async projectFromQuote(id, doc) {
    const { projects } = await UI.api('/api/projects').catch(() => ({ projects: [] }));
    let max = 0;
    projects.forEach(p => { const m = /^PRJ-(\d+)$/.exec(p.code || ''); if (m) max = Math.max(max, Number(m[1])); });
    const b = UI.modal('Create Project from Quotation', `
      <p class="k-sub">${UI.esc(doc.doc_no)} · ${UI.esc(doc.customer_name)}${doc.po_ref ? ' · Client PO ' + UI.esc(doc.po_ref) : ''}</p>
      <div class="form-grid" id="qp">
        ${UI.field('code', 'Project Code *', 'PRJ-' + (max + 1))}
        ${UI.field('name', 'Project Name *', `${doc.customer_name} — ${doc.doc_no}`)}
        ${UI.field('client_name', 'Client', doc.customer_name)}
        ${UI.field('budget', 'Budget (₹)', doc.grand_total, 'number', 'step="any"')}
        ${UI.field('start_date', 'Start Date', new Date().toISOString().slice(0, 10), 'date')}
      </div>${UI.textarea('notes', 'Notes', '')}`,
      `<button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-primary" id="qp-save">Create Project</button>`);
    b.querySelector('#qp-save').onclick = async () => {
      const d = UI.formValues('qp'); d.notes = b.querySelector('[name=notes]').value;
      if (!d.code || !d.name) return UI.toast('Code & name required', 'err');
      try {
        const r = await UI.api(`/api/salesdocs/${id}/create-project`, { method: 'POST', body: d });
        UI.closeModal(); UI.toast(`Project ${d.code} created`, 'ok'); App.navigate('#/projects?id=' + r.id);
      } catch (e) { UI.toast(e.message, 'err'); }
    };
  },

  async renderCustomers(body) {
    const { customers } = await UI.api('/api/customers');
    body.innerHTML = `<div class="panel"><h2>Customer Directory</h2>
      ${UI.table(['name', 'gstin', 'place_of_supply', 'contact_person', 'phone', 'payment_terms', { key: '_a', label: '' }],
        customers, {
        name: v => `<b>${UI.esc(v)}</b>`, gstin: v => v ? `<span class="chip">${UI.esc(v)}</span>` : '<span class="chip">URP</span>',
        _a: (v, r) => `<button class="btn btn-outline btn-sm" onclick="App.views.sales.custForm(${r.id})">Edit</button>`
      })}</div>`;
  },
  async custForm(id) {
    let c = { state_code: '27', place_of_supply: 'Maharashtra', payment_terms: 'Net 30' };
    if (id) c = (await UI.api('/api/customers/' + id)).customer;
    const b = UI.modal(id ? 'Edit Customer' : 'New Customer', `
      <div class="form-grid" id="cf">
        ${UI.field('name', 'Customer Name *', c.name)}
        ${UI.field('gstin', 'GSTIN', c.gstin)}
        ${UI.field('pan', 'PAN', c.pan)}
        ${UI.field('contact_person', 'Contact Person', c.contact_person)}
        ${UI.field('phone', 'Phone', c.phone)}
        ${UI.field('email', 'Email', c.email)}
        ${UI.field('state_code', 'State Code (GST)', c.state_code)}
        ${UI.field('place_of_supply', 'Place of Supply', c.place_of_supply)}
        ${UI.field('payment_terms', 'Payment Terms', c.payment_terms)}
      </div>${UI.textarea('address', 'Address', c.address)}`,
      `<button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-primary" id="c-save">${id ? 'Save' : 'Create'}</button>`);
    b.querySelector('#c-save').onclick = async () => {
      const d = UI.formValues('cf'); d.address = b.querySelector('[name=address]').value;
      if (!d.name) return UI.toast('Name required', 'err');
      try {
        if (id) await UI.api('/api/customers/' + id, { method: 'PUT', body: d });
        else await UI.api('/api/customers', { method: 'POST', body: d });
        UI.closeModal(); UI.toast('Saved', 'ok'); this.renderCustomers(document.getElementById('sales-body'));
      } catch (e) { UI.toast(e.message, 'err'); }
    };
  },

  async renderAging(body) {
    const { rows, buckets } = await UI.api('/api/salesdocs/aging');
    const total = Object.values(buckets).reduce((a, b2) => a + b2, 0);
    body.innerHTML = `
      <div class="cards">
        ${Object.entries(buckets).map(([k, v]) => `<div class="card"><div class="k-label">${k === 'Current' ? 'Not Due' : k + ' days overdue'}</div>
          <div class="k-value ${k === 'Current' ? 'good' : (k === '90+' || k === '61-90' ? 'bad' : 'warn')}">${UI.money(v)}</div></div>`).join('')}
        <div class="card"><div class="k-label">Total Outstanding</div><div class="k-value">${UI.money(total)}</div></div>
      </div>
      <div class="panel"><h2>Receivables Aging (30/60/90)</h2>
      ${UI.table(['doc_no', 'customer', { key: 'doc_date', label: 'Invoice Date' }, { key: 'due_date', label: 'Due Date' }, { key: 'outstanding', label: 'Outstanding', num: true }, { key: 'bucket', label: 'Bucket' }],
        rows, { outstanding: v => `<b>${UI.money(v)}</b>`, doc_date: v => UI.fmtDate(v), due_date: v => UI.fmtDate(v), bucket: v => UI.badge(v === 'Current' ? 'Active' : v === '90+' ? 'Overdue' : 'Pending') })}
      </div>`;
  },
  async renderLedger(body, params = {}) {
    const { customers } = await UI.api('/api/customers');
    const cid = params.customer_id || '';
    body.innerHTML = `
      <div class="panel"><h2>Party Ledger</h2>
        <div class="flex" style="gap:12px;align-items:flex-end;flex-wrap:wrap">
          <label class="field" style="min-width:300px;margin:0"><span>Customer</span>
            <select id="lg-cust">
              <option value="">All customers — outstanding summary</option>
              ${customers.map(c => `<option value="${c.id}" ${String(c.id) === String(cid) ? 'selected' : ''}>${UI.esc(c.name)}</option>`).join('')}
            </select></label>
          <button class="btn btn-outline" id="lg-print">Print</button>
        </div>
        <div id="lg-out" class="mt"></div>
      </div>`;
    const out = document.getElementById('lg-out');
    const load = async () => {
      out.innerHTML = '<div class="empty">Loading…</div>';
      const v = document.getElementById('lg-cust').value;
      out.innerHTML = v ? await this.ledgerDetail(Number(v)) : await this.ledgerSummary();
    };
    document.getElementById('lg-cust').onchange = load;
    document.getElementById('lg-print').onclick = () => {
      const name = document.getElementById('lg-cust').selectedOptions[0].textContent;
      const w = window.open('', '_blank');
      if (!w) return UI.toast('Allow popups to print', 'err');
      w.document.write(`<html><head><title>Ledger — ${UI.esc(name)}</title>${this.ledgerCss()}</head><body><h2>Ledger — ${UI.esc(name)}</h2>${out.innerHTML}</body></html>`);
      w.document.close();
      setTimeout(() => w.print(), 250);
    };
    await load();
  },
  async ledgerSummary() {
    const { summary } = await UI.api('/api/salesdocs/ledger');
    const t = summary.reduce((a, r) => ({ debit: a.debit + r.debit, credit: a.credit + r.credit, balance: a.balance + r.balance }), { debit: 0, credit: 0, balance: 0 });
    return UI.table(['name', { key: 'debit', label: 'Total Billed', num: true }, { key: 'credit', label: 'Received', num: true }, { key: 'balance', label: 'Balance Due', num: true }],
      summary, {
      name: v => `<b>${UI.esc(v)}</b>`, debit: v => UI.money(v), credit: v => UI.money(v),
      balance: v => `<b style="color:${Number(v) > 0 ? 'var(--red)' : 'inherit'}">${UI.money(v)}</b>`
    }) + `<div class="k-sub mt">Total billed ${UI.money(t.debit)} · received ${UI.money(t.credit)} · outstanding ${UI.money(t.balance)}</div>`;
  },
  async ledgerDetail(cid) {
    const d = await UI.api('/api/salesdocs/ledger?customer_id=' + cid);
    const rows = d.entries.map(e => `<tr>
      <td>${UI.fmtDate(e.date)}</td><td><b>${UI.esc(e.doc_no)}</b></td><td>${UI.badge(e.type)}</td>
      <td class="num">${e.debit ? UI.money(e.debit) : '—'}</td>
      <td class="num">${e.credit ? UI.money(e.credit) : '—'}</td>
      <td class="num"><b>${UI.money(e.balance)}</b></td></tr>`).join('');
    const openRow = d.opening ? `<tr><td colspan="5"><b>Opening Balance</b></td><td class="num"><b>${UI.money(d.opening)}</b></td></tr>` : '';
    return `
      <div class="k-sub mb">${UI.esc(d.customer.name)}${d.customer.gstin ? ' · GSTIN ' + UI.esc(d.customer.gstin) : ''}${d.customer.place_of_supply ? ' · ' + UI.esc(d.customer.place_of_supply) : ''}</div>
      <div class="table-wrap"><table class="data"><thead><tr>
        <th>Date</th><th>Doc #</th><th>Type</th><th class="num">Debit</th><th class="num">Credit</th><th class="num">Balance</th>
      </tr></thead><tbody>${openRow}${rows || '<tr><td colspan="6">No transactions</td></tr>'}</tbody>
      <tfoot><tr><td colspan="3"><b>Totals</b></td>
        <td class="num"><b>${UI.money(d.totals.debit)}</b></td>
        <td class="num"><b>${UI.money(d.totals.credit)}</b></td>
        <td class="num"><b>${UI.money(d.closing)}</b></td></tr></tfoot></table></div>`;
  },
  ledgerCss() {
    return `<style>body{font-family:Arial,Helvetica,sans-serif;color:#202124;padding:24px;font-size:13px}
      h2{margin:0 0 16px}.data{width:100%;border-collapse:collapse}.data th,.data td{border:1px solid #dadce0;padding:6px 8px;text-align:left}
      .data .num{text-align:right}.data th{background:#f1f3f4}.k-sub{color:#5f6368;margin-bottom:10px}</style>`;
  }
});
