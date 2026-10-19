App.registerView('sales', {
  async render(params) {
    const tab = params.tab || 'docs';
    const tabs = [['docs', '🧾 Document Billing Engine'], ['customers', '👥 Customers'], ['receivables', '💰 Receivables & Aging']];
    return `
    <div class="page-head"><div><h1>Sales & Outward Billing</h1><div class="sub">Proforma · Tax Invoices · Challans · Credit/Debit Notes · E-Way bills</div></div>
      <div class="flex" id="sales-actions"></div></div>
    <div class="tabs">${tabs.map(([k, l]) => `<button class="${tab === k ? 'active' : ''}" onclick="App.navigate('#/sales?tab=${k}')">${l}</button>`).join('')}</div>
    <div id="sales-body"><div class="empty">Loading…</div></div>`;
  },
  async mount(params) {
    const tab = params.tab || 'docs';
    const body = document.getElementById('sales-body');
    const actions = document.getElementById('sales-actions');
    actions.innerHTML = '';
    if (tab === 'docs') {
      actions.innerHTML = `
        <button class="btn btn-outline" id="btn-challan">+ Delivery Challan</button>
        <button class="btn btn-primary" id="btn-invoice">+ New Tax Invoice</button>`;
      document.getElementById('btn-invoice').onclick = () => this.docForm('TaxInvoice');
      document.getElementById('btn-challan').onclick = () => this.docForm('DeliveryChallan');
      await this.renderDocs(body);
      if (params.new) this.docForm(params.new);
      if (params.id) { const d = (await UI.api('/api/salesdocs')).docs.find(x => x.doc_no === params.id); if (d) this.docDetail(d.id); }
    }
    if (tab === 'customers') {
      actions.innerHTML = '<button class="btn btn-primary" id="btn-cust">+ New Customer</button>';
      document.getElementById('btn-cust').onclick = () => this.custForm();
      await this.renderCustomers(body);
    }
    if (tab === 'receivables') await this.renderAging(body);
  },

  async renderDocs(body) {
    const { docs } = await UI.api('/api/salesdocs');
    body.innerHTML = `
      <div class="panel"><h2>Outward Document Billing Engine</h2>
      ${UI.table([
      { key: 'doc_no', label: 'Doc #' }, { key: 'doc_type', label: 'Type' }, 'customer_name',
      { key: 'grand_total', label: 'Amount', num: true }, 'gst_status',
      { key: 'carrier', label: 'Tracking' }, 'status', { key: '_a', label: '' }],
      docs, {
        doc_no: v => `<b>${UI.esc(v)}</b>`, doc_type: v => UI.badge(v), grand_total: v => `<b>${UI.money(v)}</b>`,
        gst_status: v => UI.badge(v), status: v => UI.badge(v),
        carrier: (v, r) => r.eway_awb ? `<span class="chip">${UI.esc(v || '')} ${UI.esc(r.eway_awb)}</span>` : '—',
        _a: (v, r) => `<button class="btn btn-tonal btn-sm" onclick="App.views.sales.docDetail(${r.id})">Open</button>`
      })}</div>`;
  },

  async docForm(doc_type, fromLead) {
    const [{ customers }, { items }, { warehouses }] = await Promise.all([
      UI.api('/api/customers'), UI.api('/api/items').catch(() => ({ items: [] })), UI.api('/api/warehouses').catch(() => ({ warehouses: [] }))
    ]);
    const typeLabels = { Proforma: 'Proforma Invoice', TaxInvoice: 'GST Tax Invoice', DeliveryChallan: 'Delivery Receipt / Challan', CreditNote: 'Credit Note', DebitNote: 'Debit Note' };
    const b = UI.modal(`New ${typeLabels[doc_type] || doc_type}`, `
      <div class="form-grid" id="df">
        ${UI.select('customer_id', 'Customer *', customers.map(c => ({ value: c.id, label: `${c.name} (${c.gstin || 'URP'})` })))}
        ${UI.select('warehouse_id', 'Dispatch Warehouse', warehouses.map(w => ({ value: w.id, label: w.name })), 1)}
        ${UI.field('place_of_supply', 'Place of Supply', 'Maharashtra (27)')}
        ${UI.field('po_ref', 'Customer PO Ref')}
        ${doc_type === 'TaxInvoice' || doc_type === 'DeliveryChallan' ? `
        ${UI.field('carrier', 'Carrier')}
        ${UI.field('eway_awb', 'E-Way Bill / AWB #')}
        ${UI.field('due_date', 'Payment Due Date', '', 'date')}` : ''}
      </div>
      <h3>Items</h3>
      <div id="dl-lines"></div>
      <button class="btn btn-outline btn-sm" id="dl-add">+ Add line</button>
      <div class="card mt" id="dl-totals" style="text-align:right"></div>`,
      `<button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-primary" id="dl-save">Generate ${doc_type === 'TaxInvoice' ? 'Tax Invoice' : 'Document'}</button>`);
    const lines = b.querySelector('#dl-lines');
    const totals = b.querySelector('#dl-totals');
    const recalc = () => {
      let taxable = 0, tax = 0;
      const pos = b.querySelector('[name=place_of_supply]').value;
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
      div.innerHTML = `
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
          div.querySelector('[name=hsn_sac]').value = it.hsn_sac;
          div.querySelector('[name=unit_price]').value = doc_type === 'DeliveryChallan' ? it.purchase_price || it.sale_price : it.sale_price;
          div.querySelector('[name=gst_rate]').value = it.gst_rate;
        }
        recalc();
      };
      div.addEventListener('input', recalc);
      lines.appendChild(div);
      recalc();
    };
    addLine(items[0]);
    b.querySelector('#dl-add').onclick = () => addLine();
    b.querySelector('[name=place_of_supply]').addEventListener('input', recalc);
    recalc();
    b.querySelector('#dl-save').onclick = async () => {
      const head = UI.formValues('df');
      const its = [...lines.querySelectorAll('.form-grid')].map(g => {
        const o = {}; g.querySelectorAll('[name]').forEach(el => o[el.name] = el.type === 'number' ? Number(el.value || 0) : el.value.trim());
        o.item_id = o.item_id ? Number(o.item_id) : null; return o;
      }).filter(i => i.description);
      if (!head.customer_id || !its.length) return UI.toast('Customer and lines required', 'err');
      try {
        const r = await UI.api('/api/salesdocs', { method: 'POST', body: { ...head, doc_type, items: its, from_lead: fromLead } });
        UI.closeModal();
        UI.toast(`${r.doc_no} generated — total ${UI.money(r.grand_total)}${r.gst.inter ? ' (IGST)' : ' (CGST+SGST)'}`, 'ok');
        App.navigate('#/sales?tab=docs');
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
        <button class="btn btn-outline btn-sm" id="d-print">🖨 Print Invoice</button>
        ${doc.doc_type === 'TaxInvoice' ? `
        <button class="btn btn-tonal btn-sm" id="d-eway">⬇ E-Way Bill JSON</button>
        <button class="btn btn-tonal btn-sm" id="d-cn">+ Credit Note</button>
        <button class="btn btn-tonal btn-sm" id="d-dn">+ Debit Note</button>
        <button class="btn btn-primary btn-sm" id="d-pay">Record Payment</button>` : ''}
        <button class="btn btn-outline btn-sm" id="d-ship">Update Shipment</button>
        <button class="btn btn-outline btn-sm" id="d-del">Mark Delivered</button>
      </div>`,
      `<button class="btn btn-outline" onclick="UI.closeModal()">Close</button>`);
    const dl = (url, name) => fetch(url, { headers: {} }).then(r => r.blob()).then(blob => {
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
    }).catch(e => UI.toast(e.message, 'err'));
    b.querySelector('#d-print').onclick = () => App.views.settings.openInvoicePrint(doc, items);
    b.querySelector('#d-eway')?.addEventListener('click', () => dl(`/api/salesdocs/${id}/eway-json`, `${doc.doc_no}_eway.json`));
    b.querySelector('#d-cn')?.addEventListener('click', () => { UI.closeModal(); this.noteForm(id, 'CreditNote'); });
    b.querySelector('#d-dn')?.addEventListener('click', () => { UI.closeModal(); this.noteForm(id, 'DebitNote'); });
    b.querySelector('#d-pay')?.addEventListener('click', () => { UI.closeModal(); this.payForm(id, bal); });
    b.querySelector('#d-ship').onclick = () => { UI.closeModal(); this.shipForm(id); };
    b.querySelector('#d-del').onclick = async () => {
      try { await UI.api(`/api/salesdocs/${id}/deliver`, { method: 'POST' }); UI.closeModal(); UI.toast('Marked delivered', 'ok'); App.navigate('#/sales?tab=docs'); }
      catch (e) { UI.toast(e.message, 'err'); }
    };
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
  }
});
