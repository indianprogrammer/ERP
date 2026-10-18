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
          name: t.name, slug: t.slug, domain: t.domain || '—', plan: t.plan, status: t.status,
          _a: active
            ? `<button class="btn btn-outline btn-sm" onclick="App.views.admin.toggleOrg(${t.id},'suspended')">Disable</button>`
            : `<button class="btn btn-primary btn-sm" onclick="App.views.admin.toggleOrg(${t.id},'active')">Enable</button>`
        };
      });
      body.innerHTML = `<div class="panel"><h2>Organizations (${tenants.length})</h2>
        ${UI.table(['name', 'slug', 'domain', 'plan', { key: 'status', label: 'Status' }, { key: '_a', label: 'Action' }],
          rows, {
          name: v => `<b>${UI.esc(v)}</b>`,
          status: v => UI.badge(v === 'active' || v === 'trial' ? 'Active' : (v === 'suspended' ? 'Suspended' : v)),
          _a: v => v
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
  async orgForm() {
    const b = UI.modal('New Company', `
      <div class="form-grid" id="of">
        ${UI.field('name', 'Company Name *')}
        ${UI.field('slug', 'Slug / Subdomain * (e.g. acme)')}
        ${UI.field('admin_email', 'Admin Email *')}
        ${UI.field('admin_password', 'Admin Password * (min 6)', '', 'password')}
        ${UI.field('admin_full_name', 'Admin Full Name')}
      </div>`,
      `<button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-primary" id="o-save">Create</button>`);
    b.querySelector('#o-save').onclick = async () => {
      const d = UI.formValues('of');
      if (!d.name || !d.slug || !d.admin_email || !d.admin_password) { UI.toast('All fields required', 'err'); return; }
      try {
        await UI.api('/api/auth/register', { method: 'POST', body: { orgName: d.name, slug: d.slug, email: d.admin_email, password: d.admin_password, fullName: d.admin_full_name } });
        UI.closeModal(); UI.toast('Company created', 'ok'); this.renderOrgs();
      } catch (e) { UI.toast(e.message, 'err'); }
    };
  }
});
