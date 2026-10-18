App.registerView('inventory', {
  async render(params) {
    const tab = params.tab || 'stock';
    const tabs = [['stock', '📦 Stock by Warehouse'], ['items', '🏷️ Item Master'], ['moves', '↕️ Stock Movement Log']];
    return `
    <div class="page-head"><div><h1>Inventory Control Hub</h1><div class="sub">SKU/Barcode · multi-warehouse · auto stock sync on GRN & invoices</div></div>
      <div class="flex" id="inv-actions"></div></div>
    <div class="tabs">${tabs.map(([k, l]) => `<button class="${tab === k ? 'active' : ''}" onclick="App.navigate('#/inventory?tab=${k}')">${l}</button>`).join('')}</div>
    <div id="inv-body"><div class="empty">Loading…</div></div>`;
  },
  async mount(params) {
    const tab = params.tab || 'stock';
    const body = document.getElementById('inv-body');
    const actions = document.getElementById('inv-actions');
    actions.innerHTML = '';
    if (tab === 'stock') {
      actions.innerHTML = '<button class="btn btn-tonal" id="btn-adj">Stock Adjustment</button>';
      document.getElementById('btn-adj').onclick = () => this.adjustForm();
      await this.renderStock(body);
    }
    if (tab === 'items') {
      actions.innerHTML = '<button class="btn btn-primary" id="btn-item">+ New Item</button>';
      document.getElementById('btn-item').onclick = () => this.itemForm();
      await this.renderItems(body);
    }
    if (tab === 'moves') await this.renderMoves(body);
    if (params.sku) UI.toast(`SKU: ${params.sku}`);
  },
  async renderStock(body) {
    const { stock, movements } = await UI.api('/api/stock');
    const { items: low } = await UI.api('/api/items/low-stock').catch(() => ({ items: [] }));
    body.innerHTML = `
      ${low.length ? `<div class="panel" style="border-left:4px solid var(--red)"><h2>🔴 Low Stock Alert: ${low.length} items</h2>
        ${UI.table(['sku', 'name', { key: 'stock', label: 'On Hand', num: true }, { key: 'reorder_level', label: 'Reorder Level', num: true }], low)}</div>` : ''}
      <div class="panel"><h2>Stock Levels — SKU / Barcode Lookup
        <input class="input-inline" id="sku-find" placeholder="Enter SKU..." style="max-width:200px"></h2>
        <div id="sku-res"></div>
        ${UI.table(['sku', 'item_name', 'uom', { key: 'wh_code', label: 'Warehouse' }, { key: 'qty', label: 'Qty', num: true }, { key: 'reorder_level', label: 'Reorder', num: true }],
          stock, {
          sku: v => `<b>${UI.esc(v)}</b>`, qty: (v, r) => `<b style="color:${Number(v) <= Number(r.reorder_level) ? 'var(--red)' : 'var(--text)'}">${v}</b>`
        })}
      </div>`;
    const si = document.getElementById('sku-find'), sr = document.getElementById('sku-res');
    si.addEventListener('input', () => {
      const q = si.value.toLowerCase();
      const hits = q ? stock.filter(s => s.sku.toLowerCase().includes(q) || s.item_name.toLowerCase().includes(q)) : [];
      sr.innerHTML = hits.length ? `<div class="form-success">${hits.map(h => `${h.sku} · ${h.item_name} @ ${h.wh_code}: <b>${h.qty}</b>`).join('<br>')}</div>` : '';
    });
  },
  async renderItems(body) {
    const { items } = await UI.api('/api/items');
    body.innerHTML = `<div class="panel"><h2>Item Master & SKUs</h2>
      ${UI.table(['sku', 'name', 'category', 'uom', 'hsn_sac', { key: 'sale_price', label: 'Sale ₹', num: true }, { key: 'purchase_price', label: 'Purchase ₹', num: true }, { key: 'gst_rate', label: 'GST%', num: true }, { key: 'stock', label: 'Stock', num: true }, { key: '_a', label: '' }],
        items, {
        sku: v => `<b>${UI.esc(v)}</b>`, sale_price: v => UI.money(v), purchase_price: v => UI.money(v),
        stock: (v, r) => `${v} ${Number(v) <= Number(r.reorder_level) && Number(r.reorder_level) > 0 ? UI.badge('Pending') : ''}`,
        _a: (v, r) => `<button class="btn btn-outline btn-sm" onclick="App.views.inventory.itemForm(${r.id})">Edit</button>`
      })}</div>`;
  },
  async renderMoves(body) {
    const { movements } = await UI.api('/api/stock');
    body.innerHTML = `<div class="panel"><h2>Recent Stock Movements</h2>
      ${UI.table([{ key: 'created_at', label: 'When' }, 'sku', 'item_name', { key: 'movement_type', label: 'Type' }, { key: 'qty', label: 'Qty', num: true }, { key: 'wh_code', label: 'WH' }, { key: 'ref_type', label: 'Ref Type' }, { key: 'ref_no', label: 'Ref #' }],
        movements, {
        created_at: v => UI.fmtDate(v), movement_type: v => UI.badge(v === 'IN' ? 'Delivered' : v === 'OUT' ? 'Ordered' : 'Pending'),
        ref_no: v => UI.esc(v || '—'), ref_type: v => UI.esc(v || '—')
      })}</div>`;
  },
  async itemForm(id) {
    let i = { uom: 'Nos', gst_rate: 18, category: 'General' };
    if (id) i = (await UI.api('/api/items')).items.find(x => x.id === id);
    const b = UI.modal(id ? `Edit ${i.sku}` : 'New Item', `
      <div class="form-grid" id="if">
        ${UI.field('sku', 'SKU *', i.sku)}
        ${UI.field('name', 'Name *', i.name)}
        ${UI.field('barcode', 'Barcode / QR', i.barcode)}
        ${UI.select('uom', 'UOM', ['Nos', 'Kg', 'Mtr', 'Box', 'Service', 'Lic'], i.uom)}
        ${UI.field('hsn_sac', 'HSN/SAC', i.hsn_sac)}
        ${UI.field('category', 'Category', i.category)}
        ${UI.field('sale_price', 'Sale Price', i.sale_price, 'number', 'step="any"')}
        ${UI.field('purchase_price', 'Purchase Price', i.purchase_price, 'number', 'step="any"')}
        ${UI.field('gst_rate', 'GST %', i.gst_rate, 'number', 'step="any"')}
        ${UI.field('reorder_level', 'Reorder Level', i.reorder_level, 'number', 'step="any"')}
      </div>`,
      `<button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-primary" id="i-save">${id ? 'Save' : 'Create'}</button>`);
    b.querySelector('#i-save').onclick = async () => {
      const d = UI.formValues('if');
      if (!d.sku || !d.name) return UI.toast('SKU & name required', 'err');
      try {
        if (id) await UI.api('/api/items/' + id, { method: 'PUT', body: d });
        else await UI.api('/api/items', { method: 'POST', body: d });
        UI.closeModal(); UI.toast('Item saved', 'ok'); this.renderItems(document.getElementById('inv-body'));
      } catch (e) { UI.toast(e.message, 'err'); }
    };
  },
  async adjustForm() {
    const [{ items }, { warehouses }] = await Promise.all([UI.api('/api/items'), UI.api('/api/warehouses')]);
    const b = UI.modal('Stock Adjustment', `
      <div class="form-grid" id="af">
        ${UI.select('item_id', 'Item', items.map(i => ({ value: i.id, label: `${i.sku} · ${i.name}` })))}
        ${UI.select('warehouse_id', 'Warehouse', warehouses.map(w => ({ value: w.id, label: w.name })))}
        ${UI.select('movement_type', 'Type', ['IN', 'OUT', 'ADJ'])}
        ${UI.field('qty', 'Quantity', '', 'number', 'step="any"')}
      </div>${UI.textarea('notes', 'Notes')}`,
      `<button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-primary" id="a-save">Apply</button>`);
    b.querySelector('#a-save').onclick = async () => {
      const d = UI.formValues('af'); d.notes = b.querySelector('[name=notes]').value;
      d.item_id = Number(d.item_id); d.warehouse_id = Number(d.warehouse_id);
      if (!d.qty) return UI.toast('Qty required', 'err');
      try { await UI.api('/api/stock/adjust', { method: 'POST', body: d }); UI.closeModal(); UI.toast('Adjusted', 'ok'); this.renderStock(document.getElementById('inv-body')); }
      catch (e) { UI.toast(e.message, 'err'); }
    };
  }
});
