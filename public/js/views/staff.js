App.registerView('staff', {
  async render(params) {
    const tab = params.tab || 'users';
    const tabs = [['users', '👥 Users'], ['roles', '🔐 Roles & Permissions'], ['audit', '📜 Audit Trail']];
    return `
    <div class="page-head"><div><h1>Staff & Access Control</h1><div class="sub">RBAC · granular module permissions · full audit trail</div></div>
      <div class="flex" id="staff-actions"></div></div>
    <div class="tabs">${tabs.map(([k, l]) => `<button class="${tab === k ? 'active' : ''}" onclick="App.navigate('#/staff?tab=${k}')">${l}</button>`).join('')}</div>
    <div id="staff-body"><div class="empty">Loading…</div></div>`;
  },
  async mount(params) {
    const tab = params.tab || 'users';
    const body = document.getElementById('staff-body');
    const actions = document.getElementById('staff-actions');
    actions.innerHTML = '';
    if (tab === 'users') {
      actions.innerHTML = '<button class="btn btn-primary" id="btn-user">+ New Staff Account</button>';
      document.getElementById('btn-user').onclick = () => this.userForm();
      await this.renderUsers(body);
    }
    if (tab === 'roles') {
      actions.innerHTML = '<button class="btn btn-primary" id="btn-role">+ New Role</button>';
      document.getElementById('btn-role').onclick = () => this.roleForm();
      await this.renderRoles(body);
    }
    if (tab === 'audit') await this.renderAudit(body);
  },
  async renderUsers(body) {
    const { users } = await UI.api('/api/staff/users');
    body.innerHTML = `<div class="panel"><h2>Staff Accounts</h2>
      ${UI.table(['username', 'full_name', 'role', 'email', 'last_login', { key: 'is_active', label: 'Status' }, { key: '_a', label: '' }],
        users, {
        username: v => `<b>${UI.esc(v)}</b>`, last_login: v => UI.fmtDate(v),
        is_active: v => v ? UI.badge('Active') : UI.badge('Lost'),
        _a: (v, r) => `<button class="btn btn-outline btn-sm" onclick="App.views.staff.userForm(${r.id})">Edit</button>`
      })}</div>`;
  },
  async userForm(id) {
    const { roles } = await UI.api('/api/staff/roles').catch(() => ({ roles: [] }));
    let u = { is_active: 1 };
    if (id) u = (await UI.api('/api/staff/users')).users.find(x => x.id === id);
    const b = UI.modal(id ? `Edit ${u.username}` : 'New Staff Account', `
      <div class="form-grid" id="uf">
        ${id ? '' : UI.field('username', 'Username *')}
        ${id ? '' : UI.field('password', 'Initial Password * (min 6)', '', 'password')}
        ${UI.field('full_name', 'Full Name', u.full_name)}
        ${UI.field('email', 'Email', u.email)}
        ${UI.select('role_id', 'Role', roles.map(r => ({ value: r.id, label: r.name })), u.role_id || '')}
        ${UI.select('is_active', 'Active', [{ value: 1, label: 'Yes' }, { value: 0, label: 'No' }], u.is_active ?? 1)}
        ${id ? UI.select('reset_password', 'Reset Password?', [{ value: 0, label: 'No' }, { value: 1, label: 'Yes → changeme123' }], 0) : ''}
      </div>`,
      `<button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-primary" id="u-save">${id ? 'Save' : 'Create'}</button>`);
    b.querySelector('#u-save').onclick = async () => {
      const d = UI.formValues('uf');
      try {
        if (id) await UI.api('/api/staff/users/' + id, { method: 'PUT', body: { ...d, is_active: Number(d.is_active), reset_password: Number(d.reset_password || 0) } });
        else await UI.api('/api/staff/users', { method: 'POST', body: d });
        UI.closeModal(); UI.toast('Saved', 'ok'); this.renderUsers(document.getElementById('staff-body'));
      } catch (e) { UI.toast(e.message, 'err'); }
    };
  },
  async renderRoles(body) {
    const { roles, perms } = await UI.api('/api/staff/roles');
    const MODULES = ['procurement', 'sales', 'inventory', 'crm', 'projects', 'gst', 'admin'];
    body.innerHTML = `<div class="panel"><h2>Roles & Granular Permissions (C/R/U/D/E/A)</h2>
      <div class="table-wrap"><table class="data"><thead><tr><th>Role</th>${MODULES.map(m => `<th style="text-align:center">${m}</th>`).join('')}</tr></thead>
      <tbody>${roles.map(r => `<tr><td><b>${UI.esc(r.name)}</b><div class="k-sub">${UI.esc(r.description || '')}</div>
        ${r.id > 1 ? `<button class="link-btn" onclick="App.views.staff.permForm(${r.id},'${UI.esc(r.name)}')">Edit permissions</button>` : '<span class="badge b-blue">Full Access</span>'}</td>
        ${MODULES.map(m => {
      const p = perms.find(x => x.role_id === r.id && x.module === m);
      const flags = p ? ['C', 'R', 'U', 'D', 'E', 'A'].filter((f, i) => [p.can_create, p.can_read, p.can_update, p.can_delete, p.can_export, p.can_approve][i]).join('') : (r.id === 1 ? 'CRUDEA' : '');
      return `<td style="text-align:center">${flags ? `<span class="chip">${flags}</span>` : '<span class="k-sub">—</span>'}</td>`;
    }).join('')}</tr>`).join('')}</tbody></table></div>
      <p class="k-sub mt">C=Create R=Read U=Update D=Delete E=Export A=Approve</p></div>`;
  },
  async permForm(roleId, name) {
    const { roles, perms } = await UI.api('/api/staff/roles');
    const MODULES = ['procurement', 'sales', 'inventory', 'crm', 'projects', 'gst', 'admin'];
    const fields = ['can_create', 'can_read', 'can_update', 'can_delete', 'can_export', 'can_approve'];
    const labels = { can_create: 'Create', can_read: 'Read', can_update: 'Update', can_delete: 'Delete', can_export: 'Export', can_approve: 'Approve' };
    const b = UI.modal(`Permissions — ${name}`, MODULES.map(m => `
      <h3>${m}</h3><div class="flex">${fields.map(f => {
      const p = perms.find(x => x.role_id === roleId && x.module === m);
      const on = p ? p[f] : (m === 'admin' ? 0 : 0);
      return `<label class="flex" style="gap:6px"><input type="checkbox" class="perm-cb" data-m="${m}" data-f="${f}" ${on ? 'checked' : ''}> ${labels[f]}</label>`;
    }).join('')}</div>`).join(''),
      `<button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-primary" id="perm-save">Save Permissions</button>`);
    b.querySelector('#perm-save').onclick = async () => {
      const permsMap = {};
      b.querySelectorAll('.perm-cb').forEach(cb => {
        const m = cb.dataset.m, f = cb.dataset.f;
        permsMap[m] = permsMap[m] || {};
        permsMap[m][f] = cb.checked;
      });
      try { await UI.api(`/api/staff/roles/${roleId}/permissions`, { method: 'PUT', body: { perms: permsMap } }); UI.closeModal(); UI.toast('Permissions saved', 'ok'); this.renderRoles(document.getElementById('staff-body')); }
      catch (e) { UI.toast(e.message, 'err'); }
    };
  },
  async roleForm() {
    const b = UI.modal('New Role', `
      <div class="form-grid" id="rf">
        ${UI.field('name', 'Role Name *')}
      </div>${UI.textarea('description', 'Description')}`,
      `<button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-primary" id="r-save">Create</button>`);
    b.querySelector('#r-save').onclick = async () => {
      const d = UI.formValues('rf'); d.description = b.querySelector('[name=description]').value;
      if (!d.name) return UI.toast('Name required', 'err');
      try { await UI.api('/api/staff/roles', { method: 'POST', body: d }); UI.closeModal(); UI.toast('Role created', 'ok'); this.renderRoles(document.getElementById('staff-body')); }
      catch (e) { UI.toast(e.message, 'err'); }
    };
  },
  async renderAudit(body) {
    const { logs } = await UI.api('/api/staff/audit');
    body.innerHTML = `<div class="panel"><h2>Audit Trail (last 200 events)</h2>
      ${UI.table([{ key: 'created_at', label: 'Timestamp' }, 'username', 'action', 'resource', 'detail', { key: 'ip', label: 'IP' }],
        logs, { created_at: v => `<span style="white-space:nowrap">${UI.esc(String(v).replace('T', ' ').slice(0, 19))}</span>`, detail: v => `<span class="k-sub">${UI.esc(v || '')}</span>` })}</div>`;
  }
});
