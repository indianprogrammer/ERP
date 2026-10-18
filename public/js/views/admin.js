App.registerView('admin', {
  async render() {
    return `
    <div class="page-head"><div><h1>Company Management</h1><div class="sub">Super admin · create, enable/disable organizations</div></div>
      <div class="flex" id="admin-actions"></div></div>
    <div id="admin-body"><div class="empty">Loading…</div></div>`;
  },
  async mount() {
    const actions = document.getElementById('admin-actions');
    actions.innerHTML = '<button class="btn btn-primary" id="btn-new-org">+ New Company</button>';
    document.getElementById('btn-new-org').onclick = () => this.orgForm();
    await this.renderOrgs();
  },
  async renderOrgs() {
    const body = document.getElementById('admin-body');
    try {
      const { tenants } = await UI.api('/api/admin/tenants');
      const rows = tenants.map(t => {
        const active = t.status === 'active' || t.status === 'trial';
        return {
          name: t.name, slug: t.slug, domain: t.domain || '—', plan: t.plan, status: t.status, id: t.id,
          _a: active
            ? `<button class="btn btn-outline btn-sm" onclick="App.views.admin.toggleOrg(${t.id},'suspended')">Disable</button>`
            : `<button class="btn btn-primary btn-sm" onclick="App.views.admin.toggleOrg(${t.id},'active')">Enable</button>`,
          _e: `<button class="btn btn-outline btn-sm" onclick="App.views.admin.orgForm(${t.id})">Edit</button>`
        };
      });
      body.innerHTML = `<div class="panel"><h2>Organizations (${tenants.length})</h2>
        ${UI.table(['name', 'slug', 'domain', 'plan', { key: 'status', label: 'Status' }, { key: '_a', label: 'Action' }, { key: '_e', label: '' }],
          rows, {
          name: v => `<b>${UI.esc(v)}</b>`,
          status: v => UI.badge(v === 'active' || v === 'trial' ? 'Active' : (v === 'suspended' ? 'Suspended' : v)),
          _a: v => v,
          _e: v => v
        })}</div>`;
    } catch (e) { body.innerHTML = `<div class="form-error">${UI.esc(e.message)}</div>`; }
  },
  async toggleOrg(id, status) {
    try {
      await UI.api(`/api/admin/tenants/${id}/status`, { method: 'PATCH', body: { status } });
      UI.toast(`Company ${status === 'active' ? 'enabled' : 'disabled'}`, 'ok');
      this.renderOrgs();
    } catch (e) { UI.toast(e.message, 'err'); }
  },
  async orgForm(id) {
    let t = { name: '', slug: '', domain: '', plan: 'starter', status: 'trial' };
    let title = 'New Company';
    if (id) {
      title = 'Edit Company';
      try {
        const { tenants } = await UI.api('/api/admin/tenants');
        t = tenants.find(x => x.id === id) || t;
      } catch (e) { UI.toast(e.message, 'err'); return; }
    }
    const b = UI.modal(title, `
      <div class="form-grid" id="of">
        ${UI.field('name', 'Company Name *', t.name)}
        ${id ? '' : UI.field('slug', 'Slug / Subdomain * (e.g. acme)', t.slug)}
        ${id ? `<div class="field"><span>Slug / Subdomain</span><input disabled value="${UI.esc(t.slug)}"></div>` : UI.field('slug', 'Slug / Subdomain * (e.g. acme)', t.slug)}
        ${id ? '' : UI.field('admin_email', 'Admin Email *')}
        ${id ? '' : UI.field('admin_password', 'Admin Password * (min 6)', '', 'password')}
        ${UI.field('domain', 'Custom Domain (optional)', t.domain)}
        ${UI.select('plan', 'Plan', [{ value: 'starter', label: 'Starter' }, { value: 'growth', label: 'Growth' }, { value: 'enterprise', label: 'Enterprise' }], t.plan)}
        ${UI.select('status', 'Status', [{ value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' }, { value: 'trial', label: 'Trial' }], t.status)}
      </div>`,
      `<button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-primary" id="o-save">${id ? 'Save Changes' : 'Create Company'}</button>`);
    b.querySelector('#o-save').onclick = async () => {
      const d = UI.formValues('of');
      if (!d.name || !d.slug) { UI.toast('Name and slug required', 'err'); return; }
      if (!id && (!d.admin_email || !d.admin_password)) { UI.toast('Email and password required for new company', 'err'); return; }
      if (!id && d.admin_password.length < 6) { UI.toast('Password must be at least 6 characters', 'err'); return; }
      try {
        if (id) {
          await UI.api(`/api/admin/tenants/${id}`, { method: 'PUT', body: { name: d.name, slug: d.slug, domain: d.domain, plan: d.plan, status: d.status } });
          UI.toast('Company updated', 'ok');
        } else {
          await UI.api('/api/admin/tenants', { method: 'POST', body: { name: d.name, slug: d.slug, email: d.admin_email, password: d.admin_password, fullName: d.admin_full_name || 'Admin', plan: d.plan } });
          UI.toast('Company created', 'ok');
        }
        UI.closeModal(); this.renderOrgs();
      } catch (e) { UI.toast(e.message, 'err'); }
    };
  }
});
