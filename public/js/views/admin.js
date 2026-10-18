App.registerView('admin', {
  async render() {
    const tab = this._tab || 'companies';
    const tabs = [['companies', '🏢 Companies'], ['plans', '📋 Plans']];
    return `
    <div class="page-head"><div><h1>Super Admin</h1><div class="sub">Manage organizations and SAAS plans</div></div>
      <div class="flex" id="admin-actions"></div></div>
    <div class="tabs">${tabs.map(([k, l]) => `<button class="tab-btn ${tab === k ? 'active' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
    <div id="admin-body" class="tab-panel ${tab}">${tab === 'companies' ? '<div class="empty">Loading…</div>' : ''}</div>`;
  },
  async mount() {
    this._tab = 'companies';
    const actions = document.getElementById('admin-actions');
    actions.innerHTML = '<button class="btn btn-primary" id="btn-new-org">+ New Company</button>';
    document.getElementById('btn-new-org').onclick = () => this.orgForm();
    await this.renderCompanies();
    this._bindTabButtons();
  },
  _bindTabButtons() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const t = btn.dataset.tab;
        this.switchTab(t);
      };
    });
  },
  async switchTab(tab) {
    this._tab = tab;
    // update active class on tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    // fade out panel
    const panel = document.getElementById('admin-body');
    if (panel) {
      panel.classList.remove('fade-in');
      await new Promise(r => setTimeout(r, 120));
    }
    // load content
    if (tab === 'companies') {
      const actions = document.getElementById('admin-actions');
      actions.innerHTML = '<button class="btn btn-primary" id="btn-new-org">+ New Company</button>';
      document.getElementById('btn-new-org').onclick = () => this.orgForm();
      await this.renderCompanies();
    } else {
      const actions = document.getElementById('admin-actions');
      actions.innerHTML = '<button class="btn btn-primary" id="btn-new-plan">+ New Plan</button>';
      document.getElementById('btn-new-plan').onclick = () => this.planForm();
      await this.renderPlans();
    }
    // fade in
    if (panel) {
      panel.classList.add('fade-in');
    }
  },
  // ---------- Companies ----------
  async renderCompanies() {
    const panel = document.getElementById('admin-body');
    if (!panel) return;
    panel.classList.remove('fade-in');
    panel.offsetHeight;
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
      panel.innerHTML = `<div class="panel"><h2>Organizations (${tenants.length})</h2>
        ${UI.table(['name', 'slug', 'domain', 'plan', { key: 'status', label: 'Status' }, { key: '_a', label: 'Action' }, { key: '_e', label: '' }],
          rows, {
          name: v => `<b>${UI.esc(v)}</b>`,
          status: v => UI.badge(v === 'active' || v === 'trial' ? 'Active' : (v === 'suspended' ? 'Suspended' : v)),
          _a: v => v,
          _e: v => v
        })}</div>`;
      panel.classList.add('fade-in');
    } catch (e) { panel.innerHTML = `<div class="form-error">${UI.esc(e.message)}</div>`; }
  },
  async toggleOrg(id, status) {
    try {
      await UI.api(`/api/admin/tenants/${id}/status`, { method: 'PATCH', body: { status } });
      UI.toast(`Company ${status === 'active' ? 'enabled' : 'disabled'}`, 'ok');
      this.renderCompanies();
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
        UI.closeModal(); this.renderCompanies();
      } catch (e) { UI.toast(e.message, 'err'); }
    };
  },
  // ---------- Plans ----------
  async renderPlans() {
    const panel = document.getElementById('admin-body');
    if (!panel) return;
    panel.classList.remove('fade-in');
    panel.offsetHeight;
    try {
      const { plans } = await UI.api('/api/admin/plans');
      const rows = plans.map(p => ({
        name: p.name, slug: p.slug, price: '₹' + Number(p.price_monthly || 0).toLocaleString('en-IN'),
        max_users: p.max_users, max_vendors: p.max_vendors, max_customers: p.max_customers,
        status: p.is_active ? 'Active' : 'Inactive', id: p.id,
        _a: `<button class="btn btn-outline btn-sm" onclick="App.views.admin.planForm(${p.id})">Edit</button>
             <button class="btn btn-outline btn-sm" onclick="App.views.admin.deletePlan(${p.id})" style="color:var(--red)">Delete</button>`
      }));
      panel.innerHTML = `<div class="panel"><h2>SAAS Plans (${plans.length})</h2>
        ${UI.table(['name', 'slug', 'price', 'max_users', 'max_vendors', 'max_customers', { key: 'status', label: 'Status' }, { key: '_a', label: 'Action' }],
          rows, {
          name: v => `<b>${UI.esc(v)}</b>`,
          price: v => `<b>${v}</b>`,
          status: v => UI.badge(v === 'Active' ? 'Active' : 'Inactive'),
          _a: v => v
        })}</div>`;
      panel.classList.add('fade-in');
    } catch (e) { panel.innerHTML = `<div class="form-error">${UI.esc(e.message)}</div>`; }
  },
  async deletePlan(id) {
    if (!confirm('Delete this plan?')) return;
    try {
      await UI.api(`/api/admin/plans/${id}`, { method: 'DELETE' });
      UI.toast('Plan deleted', 'ok');
      this.renderPlans();
    } catch (e) { UI.toast(e.message, 'err'); }
  },
  async planForm(id) {
    let p = { name: '', slug: '', price_monthly: '', max_users: 5, max_vendors: 50, max_customers: 50, features: '', is_active: 1 };
    let title = 'New Plan';
    if (id) {
      title = 'Edit Plan';
      try {
        const { plans } = await UI.api('/api/admin/plans');
        p = plans.find(x => x.id === id) || p;
      } catch (e) { UI.toast(e.message, 'err'); return; }
    }
    const featuresDefault = p.features ? JSON.stringify(JSON.parse(p.features), null, 2) : '{}';
    const b = UI.modal(title, `
      <div class="form-grid" id="pf">
        ${id ? `<div class="field"><span>Plan ID</span><input disabled value="${p.id}"></div>` : UI.field('name', 'Plan Name *', p.name)}
        ${UI.field('slug', 'Slug *', p.slug)}
        ${UI.field('price_monthly', 'Price / month (₹)', p.price_monthly, 'number')}
        ${UI.field('max_users', 'Max Users', p.max_users, 'number')}
        ${UI.field('max_vendors', 'Max Vendors', p.max_vendors, 'number')}
        ${UI.field('max_customers', 'Max Customers', p.max_customers, 'number')}
        ${UI.field('features', 'Features (JSON)', featuresDefault, 'textarea')}
        ${UI.select('is_active', 'Active', [{ value: 1, label: 'Yes' }, { value: 0, label: 'No' }], p.is_active)}
      </div>`,
      `<button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-primary" id="p-save">${id ? 'Save Changes' : 'Create Plan'}</button>`);
    b.querySelector('#p-save').onclick = async () => {
      const d = UI.formValues('pf');
      if (!d.name || !d.slug) { UI.toast('Name and slug required', 'err'); return; }
      try {
        const body = {
          name: d.name, slug: d.slug,
          price_monthly: Number(d.price_monthly || 0),
          max_users: Number(d.max_users || 5),
          max_vendors: Number(d.max_vendors || 50),
          max_customers: Number(d.max_customers || 50),
          features: d.features ? JSON.parse(d.features || '{}') : {},
          is_active: Number(d.is_active)
        };
        if (id) await UI.api(`/api/admin/plans/${id}`, { method: 'PUT', body });
        else await UI.api('/api/admin/plans', { method: 'POST', body });
        UI.closeModal(); UI.toast(id ? 'Plan updated' : 'Plan created', 'ok'); this.renderPlans();
      } catch (e) { UI.toast(e.message, 'err'); }
    };
  }
});
