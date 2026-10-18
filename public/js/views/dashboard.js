App.registerView('dashboard', {
  async render() {
    const { companyCount, tenant } = await UI.api('/api/dashboard');
    const isSuperAdmin = !tenant;
    return `
    <div class="page-head"><div><h1>${isSuperAdmin ? 'Company Management' : 'Dashboard'}</h1><div class="sub">${isSuperAdmin ? 'Organizations on X3M ERP SAAS' : `${tenant.name} · ${tenant.plan} plan · ${tenant.status}`}</div></div></div>
    <div class="cards">
      <div class="card"><div class="k-label">${isSuperAdmin ? 'Total Companies' : 'Your Company'}</div><div class="k-value good">${companyCount}</div><div class="k-sub">${isSuperAdmin ? 'Organizations registered on this SAAS instance' : 'Active company account'}</div></div>
    </div>`;
  }
});
