App.registerView('crm', {
  data: null,
  async render(params) {
    return `
    <div class="page-head"><div><h1>CRM Lead Tracker</h1><div class="sub">Trello-style Kanban · drag cards across stages · convert Won → order</div></div>
      <button class="btn btn-primary" id="btn-lead">+ New Lead</button></div>
    <div id="kanban" class="kanban"><div class="empty">Loading…</div></div>`;
  },
  async mount(params) {
    document.getElementById('btn-lead').onclick = () => this.leadForm();
    await this.renderBoard();
    if (params.new) this.leadForm();
  },
  async renderBoard() {
    const data = this.data = await UI.api('/api/leads');
    const kb = document.getElementById('kanban');
    kb.innerHTML = data.stages.map(s => {
      const leads = data.leads.filter(l => Number(l.stage_id) === s.id);
      return `
      <div class="kanban-col" data-stage="${s.id}">
        <h3><span style="border-left:4px solid ${UI.esc(s.color)};padding-left:8px">${UI.esc(s.name)}</span><span class="badge b-gray">${leads.length}</span></h3>
        <div class="kc-drop" data-stage="${s.id}">
        ${leads.map(l => `
          <div class="kanban-card" draggable="true" data-lead="${l.id}">
            <div class="kc-top">
              <h4>${UI.esc(l.title)}</h4>
              <span class="kc-actions">
                <button class="icon-btn kc-icon lc-edit" data-lead="${l.id}" title="Edit">✎</button>
                <button class="icon-btn kc-icon danger lc-del" data-lead="${l.id}" title="Delete">✕</button>
              </span>
            </div>
            <div class="kc-meta">${UI.esc(l.company || l.contact_name || '')}</div>
            ${l.phone ? `<div class="kc-meta">📞 ${UI.esc(l.phone)}</div>` : ''}
            <div class="kc-val">${UI.money(l.value)}</div>
            ${s.name === 'Won' ? `<div class="flex mt" style="gap:6px"><button class="link-btn lc-conv" data-lead="${l.id}">Convert →</button></div>` : ''}
          </div>`).join('')}
        </div>
      </div>`;
    }).join('');
    this.wireDnd();
  },
  wireDnd() {
    let dragId = null;
    const ph = document.createElement('div');
    ph.className = 'kc-placeholder';
    const clear = () => {
      ph.remove();
      document.querySelectorAll('.kanban-col').forEach(c => c.classList.remove('drag-over'));
    };
    document.querySelectorAll('.kanban-card').forEach(card => {
      card.addEventListener('dragstart', e => {
        dragId = card.dataset.lead;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', card.dataset.lead); } catch (_) {}
      });
      card.addEventListener('dragend', () => {
        dragId = null;
        card.classList.remove('dragging');
        clear();
      });
      card.addEventListener('dragover', e => {
        if (!dragId || card.dataset.lead === dragId) return;
        e.preventDefault();
        try { e.dataTransfer.dropEffect = 'move'; } catch (_) {}
        const rect = card.getBoundingClientRect();
        const before = (e.clientY - rect.top) < rect.height / 2;
        card.parentElement.insertBefore(ph, before ? card : card.nextSibling);
      });
    });
    document.querySelectorAll('.kanban-col').forEach(col => {
      col.addEventListener('dragover', e => {
        if (!dragId) return;
        e.preventDefault();
        col.classList.add('drag-over');
        const list = col.querySelector('.kc-drop');
        if (!e.target.closest('.kanban-card') && e.target !== ph) list.appendChild(ph);
      });
      col.addEventListener('dragleave', e => {
        if (!col.contains(e.relatedTarget)) col.classList.remove('drag-over');
      });
      col.addEventListener('drop', async e => {
        e.preventDefault();
        if (!dragId) return;
        const list = col.querySelector('.kc-drop');
        const stage = Number(col.dataset.stage);
        const order = [];
        [...list.children].forEach(n => {
          if (n === ph) order.push(dragId);
          else if (n.classList.contains('kanban-card') && n.dataset.lead !== dragId) order.push(n.dataset.lead);
        });
        if (!order.includes(dragId)) order.push(dragId);
        clear();
        dragId = null;
        try {
          await UI.api('/api/leads/reorder', { method: 'POST', body: { stage_id: stage, ids: order } });
          await this.renderBoard();
        } catch (err) { UI.toast(err.message, 'err'); }
      });
    });
    // touch fallback: long-press-less simple move via edit
    document.querySelectorAll('.lc-edit').forEach(b => b.onclick = () => this.leadForm(Number(b.dataset.lead)));
    document.querySelectorAll('.lc-del').forEach(b => b.onclick = () => UI.confirm('Delete this lead?', async () => {
      await UI.api('/api/leads/' + b.dataset.lead, { method: 'DELETE' }); this.renderBoard();
    }));
    document.querySelectorAll('.lc-conv').forEach(b => b.onclick = () => this.convertLead(Number(b.dataset.lead)));
  },
  async leadForm(id) {
    let l = { stage_id: this.data.stages[0] && this.data.stages[0].id };
    if (id) l = this.data.leads.find(x => x.id === id);
    const b = UI.modal(id ? 'Edit Lead' : 'New Lead', `
      <div class="form-grid" id="lf">
        ${UI.field('title', 'Lead Title *', l.title)}
        ${UI.field('company', 'Company', l.company)}
        ${UI.field('contact_name', 'Contact Name', l.contact_name)}
        ${UI.field('phone', 'Phone', l.phone)}
        ${UI.field('email', 'Email', l.email)}
        ${UI.field('value', 'Deal Value (₹)', l.value, 'number', 'step="any"')}
        ${UI.select('stage_id', 'Stage', this.data.stages.map(s => ({ value: s.id, label: s.name })), l.stage_id)}
      </div>${UI.textarea('notes', 'Notes', l.notes)}`,
      `<button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-primary" id="l-save">${id ? 'Save' : 'Create'}</button>`);
    b.querySelector('#l-save').onclick = async () => {
      const d = UI.formValues('lf'); d.notes = b.querySelector('[name=notes]').value;
      d.stage_id = Number(d.stage_id);
      if (!d.title) return UI.toast('Title required', 'err');
      try {
        if (id) await UI.api('/api/leads/' + id, { method: 'PUT', body: d });
        else await UI.api('/api/leads', { method: 'POST', body: d });
        UI.closeModal(); UI.toast('Saved', 'ok'); this.renderBoard();
      } catch (e) { UI.toast(e.message, 'err'); }
    };
  },
  async convertLead(id) {
    const lead = this.data.leads.find(x => x.id === id);
    const b = UI.modal(`Convert "${UI.esc(lead.title)}" → Client Order`, `
      <p class="mb">Creates a customer from <b>${UI.esc(lead.company || lead.title)}</b>${lead.value > 0 ? ` and optionally a GST Tax Invoice of <b>${UI.money(lead.value)}</b>` : ''}.</p>
      <div class="form-grid" id="cvf">
        ${UI.field('gstin', 'Customer GSTIN (optional)')}
        ${UI.field('place_of_supply', 'Place of Supply', 'Maharashtra (27)')}
        ${UI.select('create_invoice', 'Create Tax Invoice now?', [{ value: '1', label: 'Yes — invoice ' + UI.money(lead.value) }, { value: '0', label: 'No — just convert' }])}
      </div>`,
      `<button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-primary" id="cv-save">Convert</button>`);
    b.querySelector('#cv-save').onclick = async () => {
      const d = UI.formValues('cvf');
      try {
        const r = await UI.api(`/api/leads/${id}/convert`, { method: 'POST', body: { ...d, create_invoice: d.create_invoice === '1' } });
        UI.closeModal();
        UI.toast(r.doc ? `Converted! Invoice ${r.doc.doc_no} created` : 'Converted to customer', 'ok');
        this.renderBoard();
      } catch (e) { UI.toast(e.message, 'err'); }
    };
  }
});
