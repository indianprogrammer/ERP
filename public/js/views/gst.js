App.registerView('gst', {
  async render(params) {
    const now = new Date();
    const period = params.period || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return `
    <div class="page-head"><div><h1>GST Portal Sync & Reconciliation</h1>
      <div class="sub">GSTR-2B auto-reconciliation · GSTR-1 / GSTR-3B filing</div></div>
      <div class="flex">
        <input type="month" id="gst-period" class="input-inline" value="${period}">
        <button class="btn btn-primary" id="btn-recon">Run GSTR-2B Reconciliation</button>
      </div></div>
    <div id="gst-body"><div class="empty">Loading…</div></div>`;
  },
  async mount(params) {
    document.getElementById('btn-recon').onclick = () => this.importDialog();
    document.getElementById('gst-period').onchange = () => this.load();
    await this.load();
  },
  async load() {
    const period = document.getElementById('gst-period').value;
    const body = document.getElementById('gst-body');
    const [status, recon, returns] = await Promise.all([
      UI.api('/api/gst/status'),
      UI.api(`/api/gst/gstr2b/reconcile?period=${period}`).catch(() => ({ results: [], missingInPortal: [], summary: { total: 0, matched: 0, mismatch: 0, missingInErp: 0, missingInPortal: 0 } })),
      UI.api('/api/gst/returns').catch(() => ({ returns: [] }))
    ]);
    const s = recon.summary || {};
    body.innerHTML = `
      <div class="cards">
        <div class="card"><div class="k-label">GSTR-2B Lines</div><div class="k-value">${s.total || 0}</div></div>
        <div class="card"><div class="k-label">Matched (Full ITC)</div><div class="k-value good">${s.matched || 0}</div></div>
        <div class="card"><div class="k-label">Tax Mismatch</div><div class="k-value ${s.mismatch ? 'bad' : ''}">${s.mismatch || 0}</div></div>
        <div class="card"><div class="k-label">Missing in ERP</div><div class="k-value ${s.missingInErp ? 'warn' : ''}">${s.missingInErp || 0}</div></div>
        <div class="card"><div class="k-label">Missing in Portal</div><div class="k-value ${s.missingInPortal ? 'warn' : ''}">${s.missingInPortal || 0}</div></div>
        <div class="card"><div class="k-label">Portal Status</div><div class="k-value good" style="font-size:16px">${status.connected ? '🌐 Connected' : ' Offline'}</div><div class="k-sub">${UI.esc(status.gstin)}</div></div>
      </div>
      <div class="grid-2">
        <div class="panel"><h2>GSTR-2B Reconciliation — ${UI.esc(period)}</h2>
          ${(recon.results || []).length || (recon.missingInPortal || []).length ?
        UI.table([{ key: 'invoice_no', label: 'Portal Invoice' }, 'vendor_name', { key: 'invoice_value', label: 'Portal Value', num: true }, { key: 'erp_value', label: 'ERP Value', num: true }, { key: 'match_status', label: 'Status' }],
          [...(recon.results || []), ...(recon.missingInPortal || [])],
          {
            invoice_no: v => `<b>${UI.esc(v)}</b>`, invoice_value: v => UI.money(v),
            erp_value: v => v == null ? '<span class="badge b-red">Not in ERP</span>' : UI.money(v),
            match_status: v => UI.badge(v === 'MissingInPortal' ? 'Unmatched' : v),
            vendor_name: (v, r) => UI.esc(v || r.vendor_name || '')
          })
        : '<div class="empty">No GSTR-2B data imported for this period. Click "Run Reconciliation" to pull from GST Portal.</div>'}
        </div>
        <div class="panel"><h2>Filing Center</h2>
          <div class="flex mb">
            <button class="btn btn-tonal" id="btn-gstr1">⬇ Export GSTR-1 JSON</button>
            <button class="btn btn-tonal" id="btn-gstr3b">⬇ Export GSTR-3B JSON</button>
            <button class="btn btn-primary" id="btn-file">File GSTR-3B (EVC)</button>
          </div>
          <h3>Return History</h3>
          ${UI.table(['return_type', 'period', 'status', 'reference_no', { key: 'filed_at', label: 'Filed' }],
        returns.returns, { status: v => UI.badge(v), filed_at: v => UI.fmtDate(v), reference_no: v => UI.esc(v || '—') })}
        </div>
      </div>`;
    const exp = (type) => fetch(`/api/gst/${type}/export?period=${period}`).then(r => r.blob()).then(blob => {
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${type}_${period}.json`; a.click();
      UI.toast(`${type} JSON downloaded`, 'ok');
    }).catch(e => UI.toast(e.message, 'err'));
    document.getElementById('btn-gstr1').onclick = () => exp('GSTR1');
    document.getElementById('btn-gstr3b').onclick = () => exp('GSTR3B');
    document.getElementById('btn-file').onclick = async () => {
      UI.confirm(`File GSTR-3B for ${period} via EVC (OTP)?`, async () => {
        try { await UI.api(`/api/gst/GSTR3B/file`, { method: 'POST', body: { period, mode: 'EVC' } }); UI.toast('GSTR-3B filed — ACK generated', 'ok'); this.load(); }
        catch (e) { UI.toast(e.message, 'err'); }
      });
    };
  },
  importDialog() {
    const period = document.getElementById('gst-period').value;
    const sample = JSON.stringify([
      { vendor_gstin: '29ABCDE1234F1Z5', vendor_name: 'TechCorp Systems', invoice_no: 'TC-8841', invoice_date: period + '-05', taxable_value: 225000, tax_amount: 40500, invoice_value: 265500 },
      { vendor_gstin: '27AAAAA0000A1Z5', vendor_name: 'Global Supplies', invoice_no: 'GS-2201', invoice_date: period + '-08', taxable_value: 150000, tax_amount: 27000, invoice_value: 177000 },
      { vendor_gstin: '33BBBBB0000B1Z5', vendor_name: 'Apex Distribution', invoice_no: 'APX-119', invoice_date: period + '-12', taxable_value: 50000, tax_amount: 9000, invoice_value: 59000 }
    ], null, 2);
    const b = UI.modal('Pull GSTR-2B from GST Portal', `
      <p class="mb">Simulates a GSP/ASP API pull for <b>${UI.esc(period)}</b>. Paste portal JSON (or use the seeded demo data below):</p>
      ${UI.textarea('payload', 'GSTR-2B JSON', sample)}
      <button class="btn btn-outline btn-sm" id="mk-po">💡 Also create matching ERP POs for demo</button>`,
      `<button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-primary" id="imp-go">Import & Reconcile</button>`);
    let makePo = false;
    b.querySelector('#mk-po').onclick = () => { makePo = !makePo; UI.toast(makePo ? 'Will create demo POs first' : 'PO creation off'); };
    b.querySelector('#imp-go').onclick = async () => {
      let lines;
      try { lines = JSON.parse(b.querySelector('[name=payload]').value); } catch { return UI.toast('Invalid JSON', 'err'); }
      try {
        if (makePo) {
          const { vendors } = await UI.api('/api/vendors');
          for (const ln of lines) {
            const v = vendors.find(x => x.gstin === ln.vendor_gstin);
            if (v) await UI.api('/api/pos', { method: 'POST', body: { vendor_id: v.id, items: [{ description: ln.invoice_no, qty: 1, unit_price: ln.taxable_value, gst_rate: 18 }] } });
          }
        }
        await UI.api('/api/gst/gstr2b/import', { method: 'POST', body: { period, lines } });
        UI.closeModal(); UI.toast(`Imported ${lines.length} portal lines`, 'ok'); this.load();
      } catch (e) { UI.toast(e.message, 'err'); }
    };
  }
});
