App.registerView('dashboard', {
  async render() {
    const { companyCount, tenant, isSuperAdmin, activeCompanies, suspendedCompanies, totalPlans, recentTenants, planUsage } = await UI.api('/api/dashboard');

    if (isSuperAdmin) {
      const cards = [
        { label: 'Total Companies', value: companyCount, sub: 'Organizations registered', cls: 'good' },
        { label: 'Active Companies', value: activeCompanies, sub: 'Active or on trial', cls: 'good' },
        { label: 'Suspended Companies', value: suspendedCompanies, sub: 'Disabled accounts', cls: suspendedCompanies > 0 ? 'bad' : 'good' },
        { label: 'SAAS Plans', value: totalPlans, sub: 'Pricing tiers configured', cls: 'good' }
      ];
      return `
      <div class="page-head"><div><h1>Super Admin Dashboard</h1><div class="sub">Overview of all organizations on X3M ERP SAAS</div></div></div>
      <div class="cards">${cards.map(c => `
        <div class="card"><div class="k-label">${c.label}</div><div class="k-value ${c.cls || ''}">${c.value}</div><div class="k-sub">${c.sub}</div></div>`).join('')}
      </div>
      <div class="grid-2">
        <div class="panel">
          <h2>Recent Companies <a href="#/admin">Manage →</a></h2>
          ${recentTenants && recentTenants.length ? UI.table(['name','slug','plan','status'], recentTenants, {
            name: v => `<b>${UI.esc(v)}</b>`,
            status: v => UI.badge(v === 'active' || v === 'trial' ? 'Active' : (v === 'suspended' ? 'Suspended' : v))
          }) : '<div class="empty">No companies yet</div>'}
        </div>
        <div class="panel">
          <h2>Plan Usage</h2>
          ${Object.keys(planUsage).length ? Object.entries(planUsage).map(([slug, c]) => `
            <div class="flex mt mb"><span>${UI.esc(slug)}</span><span style="margin-left:auto">${c} company${c > 1 ? 'ies' : ''}</span></div>`).join('') : '<div class="empty">No plans assigned</div>'}
        </div>
      </div>
      <div class="panel">
        <h2>Quick Actions</h2>
        <div class="flex" style="gap:10px;flex-wrap:wrap">
          <a class="btn btn-primary" href="#/admin">+ New Company</a>
          <a class="btn btn-tonal" href="#/admin?tab=plans">Manage Plans</a>
        </div>
      </div>`;
    }

    // Tenant dashboard
    return `
    <div class="page-head"><div><h1>Dashboard</h1><div class="sub">${tenant.name} · ${tenant.plan} plan · ${tenant.status}</div></div></div>
    <div class="cards">
      <div class="card"><div class="k-label">Your Company</div><div class="k-value good">${companyCount}</div><div class="k-sub">Active company account</div></div>
    </div>`;
  }
});
