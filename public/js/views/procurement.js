App.registerView('procurement', {
  async render(params) {
    const tab = params.tab || 'quotes';
    const tabs = [
      ['quotes', '📊 Quote Comparison'], ['vendors', '🏢 Vendors'], ['pos', '📦 Purchase Orders'], ['warranties', '🛡️ Warranties']
    ];
    return `
    <div class="page-head"><div><h1>Procurement & Vendor Management</h1><div class="sub">RFQs · multi-vendor matrix · POs · shipments · warranty</div></div>
      <div class="flex" id="proc-actions"></div></div>
    <div class="tabs">${tabs.map(([k, l]) => `<button class="${tab === k ? 'active' : ''}" onclick="App.navigate('#/procurement?tab=${k}')">${l}</button>`).join('')}</div>
    <div id="proc-body"><div class="empty">Loading…</div></div>`;
  },
  async mount(params) {
    const tab = params.tab || 'quotes';
    const body = document.getElementById('proc-body');
    const actions = document.getElementById('proc-actions');
    actions.innerHTML = '';
    if (tab === 'quotes') {
      if (params.new) { actions.innerHTML = ''; this.renderNewRfq(body); }
      else {
        actions.innerHTML = '<button class="btn btn-primary" id="btn-new-rfq">+ New RFQ</button>';
        document.getElementById('btn-new-rfq').onclick = () => App.navigate('#/procurement?tab=quotes&new=rfq');
        this.renderQuotes(body, params);
      }
    }
    if (tab === 'vendors') { actions.innerHTML = '<button class="btn btn-primary" id="btn-new-vendor">+ New Vendor</button>'; document.getElementById('btn-new-vendor').onclick = () => this.vendorForm(); this.renderVendors(body); }
    if (tab === 'pos') { actions.innerHTML = '<button class="btn btn-primary" id="btn-new-po">+ New PO</button>'; document.getElementById('btn-new-po').onclick = () => this.poForm(); this.renderPOs(body, params); }
    if (tab === 'warranties') { actions.innerHTML = '<button class="btn btn-primary" id="btn-new-warr">+ Register Serial</button>'; document.getElementById('btn-new-warr').onclick = () => this.warrantyForm(); this.renderWarranties(body); }
  },

  // ---------- Quote matrix ----------
  async renderQuotes(body, params) {
    const { rfqs } = await UI.api('/api/rfqs');
    if (params.rfq) return this.renderMatrix(body, params.rfq);
    body.innerHTML = `
      <div class="panel"><h2>Request for Quotes (RFQ)</h2>
      ${UI.table([{ key: 'rfq_no', label: 'RFQ #' }, 'title', { key: 'vendor_count', label: 'Vendors', num: true }, { key: 'quote_count', label: 'Quotes', num: true }, 'status', { key: 'due_date', label: 'Due' }, { key: '_a', label: '' }],
        rfqs, {
        rfq_no: v => `<b>${UI.esc(v)}</b>`, status: v => UI.badge(v), due_date: v => UI.fmtDate(v),
        _a: (v, r) => `<button class="btn btn-tonal btn-sm" onclick="App.navigate('#/procurement?tab=quotes&rfq=${r.id}')">Compare →</button>`
      })}</div>`;
  },
  async renderMatrix(body, rfqId) {
    const { rfq, items } = await UI.api(`/api/rfqs/${rfqId}/matrix`);
    const vendorCols = [...new Set(items.flatMap(i => i.quotes.map(q => q.vendor_name)))];
    const html = `
      <div class="panel">
        <h2>Multi-Vendor Quote Comparison Matrix — ${UI.esc(rfq.title)}
          <button class="btn btn-outline btn-sm" onclick="App.navigate('#/procurement?tab=quotes')">← All RFQs</button></h2>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>Item / SKU</th>${vendorCols.map(v => `<th class="num">${UI.esc(v)}</th>`).join('')}<th class="num">Best Quote</th></tr></thead>
          <tbody>
          ${items.map(it => {
      const best = it.best;
      return `<tr>
              <td><b>${UI.esc(it.item)}</b><div class="k-sub">Qty ${it.quotes[0]?.qty}</div></td>
              ${vendorCols.map(v => {
        const q = it.quotes.find(x => x.vendor_name === v);
        if (!q) return '<td class="num">—</td>';
        const isBest = best && q.id === best.id;
        return `<td class="num" style="${isBest ? 'background:#E6F4EA;font-weight:700' : ''}">
                    ${UI.money(q.unit_price)}<div class="k-sub">GST ${q.gst_rate}% · ${q.lead_time_days}d</div>
                    <div class="k-sub">Term: ${UI.esc(q.payment_terms || '-')}</div>
                    ${isBest ? '<span class="badge b-green">Lowest</span>' : ''}</td>`;
      }).join('')}
              <td class="num"><b>${best ? UI.esc(best.vendor_name) : '—'}</b><div class="k-sub">${best ? UI.money(best.unit_price) + '/unit' : ''}</div></td>
            </tr>`;
    }).join('')}
          </tbody></table></div>
        <div class="mt flex">
          <label class="field" style="margin:0"><span>Warehouse</span>
            <select id="mx-wh"><option value="1">Mumbai Main</option><option value="2">Pune Depot</option></select></label>
          <button class="btn btn-primary" id="mx-convert">Approve Best Quotes → Create PO</button>
        </div>
        <p class="k-sub mt">Tick quotes to convert (defaults to lowest per item from one vendor). Only single-vendor selections can be converted at once.</p>
        <div id="mx-pick" class="mt"></div>
      </div>`;
    body.innerHTML = html;
    // build picker: choose vendor once (best overall vendor by total grand)
    const totals = {};
    for (const it of items) for (const q of it.quotes) totals[q.vendor_name] = (totals[q.vendor_name] || 0) + q.grand;
    const defaultVendor = Object.entries(totals).sort((a, b) => a[1] - b[1])[0]?.[0];
    const pick = document.getElementById('mx-pick');
    const drawPick = (vendor) => {
      const quotes = items.map(it => it.quotes.find(q => q.vendor_name === vendor)).filter(Boolean);
      pick.innerHTML = `<div class="chip">Vendor: <b>${UI.esc(vendor)}</b> — total ${UI.money(totals[vendor])}</div>
        <div class="mt">${quotes.map(q => `<label class="flex" style="gap:8px;margin:4px 0"><input type="checkbox" class="mx-q" value="${q.id}" checked> ${UI.esc(q.item_desc)} — ${UI.money(q.unit_price * q.qty)} + GST</label>`).join('')}</div>`;
    };
    pick.innerHTML = `<label class="field" style="max-width:280px"><span>Select vendor to approve</span>
      <select id="mx-vendor">${Object.keys(totals).map(v => `<option ${v === defaultVendor ? 'selected' : ''}>${UI.esc(v)}</option>`).join('')}</select></label><div id="mx-lines"></div>`;
    const lines = document.getElementById('mx-lines');
    const drawLines = (vendor) => {
      const quotes = items.map(it => it.quotes.find(q => q.vendor_name === vendor)).filter(Boolean);
      lines.innerHTML = quotes.map(q => `<label class="flex" style="gap:8px;margin:4px 0"><input type="checkbox" class="mx-q" value="${q.id}" checked> ${UI.esc(q.item_desc)} — ${UI.money(q.unit_price * q.qty)} + GST</label>`).join('');
    };
    drawLines(defaultVendor);
    document.getElementById('mx-vendor').onchange = e => drawLines(e.target.value);
    document.getElementById('mx-convert').onclick = async () => {
      const quote_ids = [...document.querySelectorAll('.mx-q:checked')].map(c => Number(c.value));
      if (!quote_ids.length) return UI.toast('Select at least one quote', 'err');
      try {
        const r = await UI.api(`/api/rfqs/${rfqId}/convert`, { method: 'POST', body: { quote_ids, warehouse_id: Number(document.getElementById('mx-wh').value) } });
        UI.toast(`PO ${r.po_no} created & shipment tracking started`, 'ok');
        App.navigate('#/procurement?tab=pos');
      } catch (e) { UI.toast(e.message, 'err'); }
    };
  },

  // ---------- Vendors ----------
  async renderVendors(body) {
    const { vendors } = await UI.api('/api/vendors');
    body.innerHTML = `<div class="panel"><h2>Vendor Directory</h2>
      ${UI.table(['name', 'gstin', 'contact_person', 'phone', 'payment_terms', 'hsn_sac', { key: '_a', label: '' }],
        vendors.filter(v => v.is_active), {
        name: v => `<b>${UI.esc(v)}</b><div class="k-sub">${UI.esc(v.email || '')}</div>`,
        gstin: v => v ? `<span class="chip">${UI.esc(v)}</span>` : '—',
        _a: (v, r) => `<button class="btn btn-outline btn-sm" onclick="App.views.procurement.vendorForm(${r.id})">Edit</button>`
      })}</div>`;
  },
  async vendorForm(id) {
    let v = { payment_terms: 'Net 30' };
    if (id) v = (await UI.api('/api/vendors/' + id)).vendor;
    const b = UI.modal(id ? 'Edit Vendor' : 'New Vendor', `
      <div class="form-grid" id="vf">
        ${UI.field('name', 'Vendor Name *', v.name)}
        ${UI.field('gstin', 'GSTIN', v.gstin)}
        ${UI.field('pan', 'PAN', v.pan)}
        ${UI.field('contact_person', 'Contact Person', v.contact_person)}
        ${UI.field('phone', 'Phone', v.phone)}
        ${UI.field('email', 'Email', v.email)}
        ${UI.field('payment_terms', 'Payment Terms', v.payment_terms)}
        ${UI.field('hsn_sac', 'HSN/SAC Codes', v.hsn_sac)}
        ${UI.field('bank_details', 'Bank Details', v.bank_details)}
      </div>${UI.textarea('address', 'Address', v.address)}`,
      `<button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-primary" id="vf-save">${id ? 'Save' : 'Create'}</button>`);
    b.querySelector('#vf-save').onclick = async () => {
      const d = UI.formValues('vf'); d.address = b.querySelector('[name=address]').value;
      if (!d.name) return UI.toast('Name required', 'err');
      try {
        if (id) await UI.api('/api/vendors/' + id, { method: 'PUT', body: { ...d, is_active: 1 } });
        else await UI.api('/api/vendors', { method: 'POST', body: d });
        UI.closeModal(); UI.toast('Vendor saved', 'ok'); this.renderVendors(document.getElementById('proc-body'));
      } catch (e) { UI.toast(e.message, 'err'); }
    };
  },
  async renderNewRfq(body) {
    const { vendors } = await UI.api('/api/vendors');
    const vs = vendors.filter(v => v.is_active);
    body.innerHTML = `
      <div class="panel">
        <h2>New Request for Quotes (RFQ)
          <button class="btn btn-outline btn-sm" onclick="App.navigate('#/procurement?tab=quotes')">← All RFQs</button></h2>
        <div class="form-grid" id="rq-meta">
          ${UI.field('title', 'RFQ Title *')}
          ${UI.field('due_date', 'Due Date', '', 'date')}
        </div>
        <div id="rq-lines" class="mt"></div>
        <button class="btn btn-outline btn-sm" id="rq-add">+ Add quote line</button>
        <div class="mt flex">
          <button class="btn btn-outline" onclick="App.navigate('#/procurement?tab=quotes')">Cancel</button>
          <button class="btn btn-primary" id="rq-save">Save RFQ</button>
        </div>
      </div>`;
    const lines = document.getElementById('rq-lines');
    const addLine = () => {
      const div = document.createElement('div');
      div.className = 'form-grid card mb';
      div.style.padding = '10px';
      div.innerHTML = `
        ${UI.field('item_desc', 'Item Description *')}
        ${UI.select('vendor_id', 'Vendor', vs.map(v => ({ value: v.id, label: v.name })))}
        ${UI.field('qty', 'Qty', 1, 'number', 'step="any" min="0"')}
        ${UI.field('unit_price', 'Unit Price', '', 'number', 'step="any" min="0"')}
        ${UI.field('gst_rate', 'GST %', 18, 'number', 'step="any"')}
        ${UI.field('lead_time_days', 'Lead Time (days)', 0, 'number')}
        ${UI.field('payment_terms', 'Payment Terms', 'Net 30')}
        <div style="grid-column:1/-1"><button class="link-btn danger rq-rm">Remove</button></div>`;
      div.querySelector('.rq-rm').onclick = () => div.remove();
      lines.appendChild(div);
    };
    addLine(); addLine(); addLine();
    document.getElementById('rq-add').onclick = addLine;
    document.getElementById('rq-save').onclick = async () => {
      const title = document.querySelector('#rq-meta [name=title]').value.trim();
      const due_date = document.querySelector('#rq-meta [name=due_date]').value;
      const quotes = [...lines.querySelectorAll('.form-grid')].map(g => {
        const o = {}; g.querySelectorAll('[name]').forEach(el => o[el.name] = el.type === 'number' ? Number(el.value || 0) : el.value.trim()); return o;
      }).filter(q => q.item_desc);
      if (!title || !quotes.length) return UI.toast('Title and at least one quote line required', 'err');
      try {
        const r = await UI.api('/api/rfqs', { method: 'POST', body: { title, due_date, quotes } });
        UI.toast(`RFQ ${r.rfq_no} created`, 'ok');
        App.navigate(`#/procurement?tab=quotes&rfq=${r.id}`);
      } catch (e) { UI.toast(e.message, 'err'); }
    };
  },

  // ---------- POs ----------
  async renderPOs(body, params) {
    const { pos } = await UI.api('/api/pos');
    body.innerHTML = `<div class="panel"><h2>Purchase Orders & Shipments</h2>
      ${UI.table([{ key: 'po_no', label: 'PO #' }, 'vendor_name', { key: 'grand_total', label: 'Total', num: true }, 'status', { key: 'ship_status', label: 'Tracking' }, { key: 'awb_no', label: 'AWB' }, { key: '_a', label: '' }],
        pos, {
        po_no: v => `<b>${UI.esc(v)}</b>`, grand_total: v => `<b>${UI.money(v)}</b>`,
        status: v => UI.badge(v), ship_status: v => v ? UI.badge(v) : '—',
        _a: (v, r) => `<button class="btn btn-tonal btn-sm" onclick="App.views.procurement.poDetail(${r.id})">Open</button>`
      })}</div>`;
    if (params.po) { const p = pos.find(x => x.po_no === params.po); if (p) this.poDetail(p.id); }
  },
  async poForm() {
    const { vendors } = await UI.api('/api/vendors');
    const { items } = await UI.api('/api/items').catch(() => ({ items: [] }));
    const b = UI.modal('New Purchase Order', `
      ${UI.select('vendor_id', 'Vendor *', vendors.filter(v => v.is_active).map(v => ({ value: v.id, label: v.name })))}
      <div id="po-lines"></div>
      <button class="btn btn-outline btn-sm" id="po-add">+ Add line</button>`,
      `<button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-primary" id="po-save">Create PO</button>`);
    const lines = b.querySelector('#po-lines');
    const addLine = (item) => {
      const div = document.createElement('div');
      div.className = 'form-grid card mb'; div.style.padding = '10px';
      div.innerHTML = `
        ${UI.select('item_id', 'From Item Master', [{ value: '', label: '— custom —' }, ...(items || []).map(i => ({ value: i.id, label: `${i.sku} · ${i.name}` }))])}
        ${UI.field('description', 'Description')}
        ${UI.field('qty', 'Qty', 1, 'number', 'step="any"')}
        ${UI.field('unit_price', 'Unit Price', item?.purchase_price || '', 'number', 'step="any"')}
        ${UI.field('gst_rate', 'GST %', item?.gst_rate ?? 18, 'number', 'step="any"')}
        <div style="grid-column:1/-1"><button class="link-btn danger po-rm">Remove</button></div>`;
      div.querySelector('.po-rm').onclick = () => div.remove();
      div.querySelector('[name=item_id]').onchange = e => {
        const it = (items || []).find(i => String(i.id) === e.target.value);
        if (it) { div.querySelector('[name=description]').value = it.name; div.querySelector('[name=unit_price]').value = it.purchase_price; div.querySelector('[name=gst_rate]').value = it.gst_rate; }
      };
      lines.appendChild(div);
    };
    addLine();
    b.querySelector('#po-add').onclick = () => addLine();
    b.querySelector('#po-save').onclick = async () => {
      const vendor_id = Number(b.querySelector('[name=vendor_id]').value);
      const itemsArr = [...lines.querySelectorAll('.form-grid')].map(g => {
        const o = {}; g.querySelectorAll('[name]').forEach(el => o[el.name] = el.type === 'number' ? Number(el.value || 0) : el.value.trim());
        o.item_id = o.item_id ? Number(o.item_id) : null; return o;
      }).filter(i => i.description || i.item_id);
      if (!vendor_id || !itemsArr.length) return UI.toast('Vendor and lines required', 'err');
      try {
        const r = await UI.api('/api/pos', { method: 'POST', body: { vendor_id, items: itemsArr } });
        UI.closeModal(); UI.toast(`PO ${r.po_no} created`, 'ok'); this.renderPOs(document.getElementById('proc-body'), {});
      } catch (e) { UI.toast(e.message, 'err'); }
    };
  },
  async poDetail(id) {
    const { po, items } = await UI.api('/api/pos/' + id);
    const { items: allItems } = await UI.api('/api/items').catch(() => ({ items: [] }));
    const b = UI.modal(`PO ${po.po_no} — ${po.vendor_name}`, `
      <div class="flex mb">${UI.badge(po.status)} ${po.ship_status ? UI.badge(po.ship_status) : ''} ${po.awb_no ? `<span class="chip">AWB ${UI.esc(po.awb_no)}</span>` : ''} ${po.carrier ? `<span class="chip">${UI.esc(po.carrier)}</span>` : ''}</div>
      <div class="table-wrap"><table class="data"><thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">GST</th><th class="num">Amount</th></tr></thead>
      <tbody>${items.map(i => `<tr><td>${UI.esc(i.description)}</td><td class="num">${i.qty}</td><td class="num">${UI.money(i.unit_price)}</td><td class="num">${i.gst_rate}%</td><td class="num">${UI.money(i.amount)}</td></tr>`).join('')}</tbody></table></div>
      <div class="right mt"><b>Total: ${UI.money(po.grand_total)}</b> (Tax ${UI.money(po.tax_total)})</div>
      <h3>Update Shipment</h3>
      <div class="form-grid" id="shf">
        ${UI.select('status', 'Status', ['Ordered', 'Shipped', 'In-Transit', 'Delivered'], po.ship_status || 'Ordered')}
        ${UI.field('carrier', 'Carrier', po.carrier || '')}
        ${UI.field('awb_no', 'AWB / Tracking #', po.awb_no || '')}
        ${UI.field('expected_delivery', 'Expected Delivery', po.expected_delivery || '', 'date')}
      </div>
      <h3>Record Goods Receipt (GRN → stock IN)</h3>
      <div id="grn-lines">${(allItems || []).slice(0, 3).map(i => `
        <label class="flex" style="gap:8px;margin:4px 0"><input type="checkbox" class="grn-i" value="${i.id}"> ${UI.esc(i.sku)} · ${UI.esc(i.name)}
        <input type="number" class="input-inline grn-q" value="1" min="0" step="any" style="width:80px" data-item="${i.id}"></label>`).join('')}</div>`,
      `<button class="btn btn-outline" onclick="UI.closeModal()">Close</button>
       <button class="btn btn-tonal" id="po-ship">Save Shipment</button>
       <button class="btn btn-primary" id="po-recv">Receive Goods</button>`);
    b.querySelector('#po-ship').onclick = async () => {
      const d = UI.formValues('shf');
      try { await UI.api(`/api/pos/${id}/ship-status`, { method: 'POST', body: d }); UI.closeModal(); UI.toast('Shipment updated', 'ok'); this.renderPOs(document.getElementById('proc-body'), {}); }
      catch (e) { UI.toast(e.message, 'err'); }
    };
    b.querySelector('#po-recv').onclick = async () => {
      const lines = [...b.querySelectorAll('.grn-i:checked')].map(cb => ({
        item_id: Number(cb.value), qty: Number(b.querySelector(`.grn-q[data-item="${cb.value}"]`).value || 0)
      })).filter(l => l.qty > 0);
      if (!lines.length) return UI.toast('Select items with qty', 'err');
      try { await UI.api(`/api/pos/${id}/receive`, { method: 'POST', body: { warehouse_id: po.warehouse_id || 1, lines } }); UI.closeModal(); UI.toast('Goods received — stock updated', 'ok'); this.renderPOs(document.getElementById('proc-body'), {}); }
      catch (e) { UI.toast(e.message, 'err'); }
    };
  },

  // ---------- Warranties ----------
  async renderWarranties(body) {
    const { warranties, alerts } = await UI.api('/api/warranties');
    body.innerHTML = `
      ${alerts.length ? `<div class="panel" style="border-left:4px solid var(--amber)"><h2>⚠️ Warranty Expiring in 30 Days</h2>
        ${UI.table(['item_name', 'serial_no', 'customer_name', { key: 'warranty_end', label: 'Expires' }], alerts,
      { warranty_end: v => UI.fmtDate(v), item_name: v => UI.esc(v || '—') })}</div>` : ''}
      <div class="panel"><h2>Warranty / Serial Register</h2>
      ${UI.table([{ key: 'serial_no', label: 'Serial #' }, 'item_name', 'customer_name', { key: 'warranty_start', label: 'Start' }, { key: 'warranty_end', label: 'Expiry' }, 'status', 'po_no'],
        warranties, {
        serial_no: v => `<b>${UI.esc(v)}</b>`, item_name: v => UI.esc(v || '—'),
        warranty_start: v => UI.fmtDate(v), warranty_end: v => UI.fmtDate(v), status: v => UI.badge(v), po_no: v => UI.esc(v || '—')
      })}</div>`;
  },
  async warrantyForm() {
    const { items } = await UI.api('/api/items').catch(() => ({ items: [] }));
    const b = UI.modal('Register Serial / Warranty', `
      <div class="form-grid" id="wf">
        ${UI.select('item_id', 'Item', [{ value: '', label: '—' }, ...(items || []).map(i => ({ value: i.id, label: `${i.sku} · ${i.name}` }))])}
        ${UI.field('serial_no', 'Serial Number *')}
        ${UI.field('customer_name', 'Customer / Assigned To')}
        ${UI.field('warranty_start', 'Warranty Start', '', 'date')}
        ${UI.field('warranty_end', 'Warranty End', '', 'date')}
      </div>`,
      `<button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-primary" id="wf-save">Register</button>`);
    b.querySelector('#wf-save').onclick = async () => {
      const d = UI.formValues('wf'); d.item_id = d.item_id ? Number(d.item_id) : null;
      if (!d.serial_no) return UI.toast('Serial required', 'err');
      try { await UI.api('/api/warranties', { method: 'POST', body: d }); UI.closeModal(); UI.toast('Registered', 'ok'); this.renderWarranties(document.getElementById('proc-body')); }
      catch (e) { UI.toast(e.message, 'err'); }
    };
  }
});
