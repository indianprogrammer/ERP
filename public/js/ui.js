// UI helpers — shared across views
const App = window.App = { views: {}, registerView(name, view) { this.views[name] = view; } };
const UI = {
  esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); },
  money(n) { const v = Number(n || 0); return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 2 }); },
  fmtDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); },
  toast(msg, kind = '') {
    const t = document.getElementById('toast');
    t.textContent = msg; t.className = 'toast ' + kind; clearTimeout(t._tm);
    t._tm = setTimeout(() => t.classList.add('hidden'), 3200);
  },
  badge(status) {
    const map = {
      'Delivered': 'b-green', 'Paid': 'b-green', 'Matched': 'b-green', 'Won': 'b-green', 'Active': 'b-green', 'Reconciled': 'b-green', 'Filed': 'b-green',
      'In-Transit': 'b-amber', 'Shipped': 'b-amber', 'Pending': 'b-amber', 'Partially Paid': 'b-amber', 'Open': 'b-amber', 'On Hold': 'b-amber', 'Draft': 'b-gray', 'Received': 'b-blue',
      'Overdue': 'b-red', 'Lost': 'b-red', 'TaxMismatch': 'b-red', 'Unmatched': 'b-red', 'MissingInERP': 'b-red', 'Cancelled': 'b-red', 'Pending GSTR-1': 'b-amber',
      'Ordered': 'b-blue', 'TaxInvoice': 'b-blue', 'Proforma': 'b-purple', 'DeliveryChallan': 'b-gray', 'CreditNote': 'b-red', 'DebitNote': 'b-amber', 'Reconciled': 'b-green'
    };
    return `<span class="badge ${map[status] || 'b-gray'}">${UI.esc(status)}</span>`;
  },
  modal(title, bodyHtml, actionsHtml = '') {
    const root = document.getElementById('modal-root');
    root.innerHTML = `<div class="modal-backdrop" id="mbd"><div class="modal"><h2>${title}</h2><div id="modal-body">${bodyHtml}</div>
      <div class="modal-actions">${actionsHtml || '<button class="btn btn-outline" onclick="UI.closeModal()">Close</button>'}</div></div></div>`;
    root.querySelector('#mbd').addEventListener('mousedown', e => { if (e.target.id === 'mbd') UI.closeModal(); });
    return root.querySelector('.modal');
  },
  closeModal() { document.getElementById('modal-root').innerHTML = ''; },
  confirm(msg, onYes) {
    UI.modal('Confirm', `<p>${UI.esc(msg)}</p>`,
      `<button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-primary" id="cf-yes">Confirm</button>`);
    document.getElementById('cf-yes').onclick = () => { UI.closeModal(); onYes(); };
  },
  async api(url, opts = {}) {
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts, body: opts.body ? JSON.stringify(opts.body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (data.error === 'PASSWORD_CHANGE_REQUIRED') { App.showChangePassword(); throw new Error('Password change required'); }
      if (res.status === 401) { App.showLogin(); throw new Error(data.error || 'Not authenticated'); }
      throw new Error(data.error || 'Request failed');
    }
    return data;
  },
  table(cols, rows, renderers = {}) {
    if (!rows.length) return `<div class="empty">No records found</div>`;
    const head = cols.map(c => `<th class="${c.num ? 'num' : ''}">${c.label || c}</th>`).join('');
    const key = c => typeof c === 'string' ? c : c.key;
    const body = rows.map(r => '<tr>' + cols.map(c => {
      const k = key(c);
      const val = renderers[k] ? renderers[k](r[k], r) : UI.esc(r[k] ?? '—');
      return `<td class="${c.num ? 'num' : ''}">${val}</td>`;
    }).join('') + '</tr>').join('');
    return `<div class="table-wrap"><table class="data"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  },
  formValues(id) {
    const out = {};
    document.querySelectorAll(`#${id} [name]`).forEach(el => {
      out[el.name] = el.type === 'number' ? (el.value === '' ? null : Number(el.value)) : el.value.trim();
    });
    return out;
  },
  field(name, label, value = '', type = 'text', extra = '') {
    return `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${UI.esc(value)}" ${extra}></label>`;
  },
  select(name, label, options, selected = '', extra = '') {
    const opts = options.map(o => {
      const v = typeof o === 'string' ? o : o.value, l = typeof o === 'string' ? o : o.label;
      return `<option value="${UI.esc(v)}" ${String(v) === String(selected) ? 'selected' : ''}>${UI.esc(l)}</option>`;
    }).join('');
    return `<label class="field"><span>${label}</span><select name="${name}" ${extra}>${opts}</select></label>`;
  },
  textarea(name, label, value = '') {
    return `<label class="field"><span>${label}</span><textarea name="${name}">${UI.esc(value)}</textarea></label>`;
  }
};
