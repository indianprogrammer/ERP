// Core app: auth flow, router, shell wiring
Object.assign(App, {
  user: null,
  boot() {
    this.wireShell();
    this.checkAuth();
  },
  async checkAuth() {
    try {
      const { user } = await UI.api('/api/auth/me');
      this.user = user;
      this.afterAuth();
    } catch { this.showLogin(); }
  },
  afterAuth() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('pwd-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('user-name').textContent = this.user.fullName || this.user.username;
    document.getElementById('user-role').textContent = `(${this.user.role})`;
    const tenantEl = document.getElementById('tenant-name');
    if (this.user.tenant_id) { tenantEl.textContent = `· ${(this.user.tenant && this.user.tenant.name) || 'Organization'}`; tenantEl.style.display='inline'; }
    else { tenantEl.textContent = 'Super Admin'; tenantEl.style.display='inline'; }
    if (this.user.isSuperAdmin) {
      document.querySelectorAll('.sa-hide').forEach(el => el.style.display = 'none');
    }
    this.applyPermissions();
    this.loadNotifications();
    if (!location.hash || location.hash === '#/' || location.hash === '#') {
      if (this.user.isSuperAdmin) this.navigate('#/admin');
      else this.navigate('#/dashboard');
    }
    this.route();
  },
  setUser(user) {
    this.user = user;
    this.afterAuth();
  },
  showLogin() {
    document.getElementById('app').classList.add('hidden');
    document.getElementById('pwd-screen').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
  },
  showChangePassword() {
    document.getElementById('app').classList.add('hidden');
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('pwd-screen').classList.remove('hidden');
  },
  can(module, perm = 'can_read') {
    if (!this.user) return false;
    if (this.user.role === 'Super Admin') return true;
    const p = (this.user.perms || {})[module];
    return !!(p && p[perm]);
  },
  applyPermissions() {
    const map = { procurement: 'procurement', sales: 'sales', projects: 'projects', expenses: 'projects', inventory: 'inventory', crm: 'crm', gst: 'gst', staff: 'admin', admin: null, settings: 'admin' };
    const adminLink = document.querySelector('.sidebar a[data-nav="admin"]');
    if (this.user && this.user.isSuperAdmin) {
      document.querySelectorAll('.sidebar a[data-nav]').forEach(a => {
        if (a.dataset.nav === 'admin') a.style.display = '';
        else a.style.display = 'none';
      });
      if (adminLink) adminLink.style.display = '';
      return;
    }
    if (adminLink) adminLink.style.display = 'none';
    document.querySelectorAll('.sidebar a[data-nav]').forEach(a => {
      if (a.dataset.nav === 'admin') return;
      const mod = map[a.dataset.nav];
      if (mod && !this.can(mod) && a.dataset.nav !== 'dashboard') a.style.display = 'none';
      else a.style.display = '';
    });
  },
  // ---------- router ----------
  navigate(hash) { location.hash = hash || '#/dashboard'; },
  async route() {
    const raw = location.hash.slice(2);
    const [path, qs] = raw.split('?');
    const parts = path.split('/').filter(Boolean);
    const params = Object.fromEntries(new URLSearchParams(qs || ''));
    const name = parts[0];
    if (!name) {
      if (this.user.isSuperAdmin) { location.hash = '#/admin'; return; }
      else { location.hash = '#/dashboard'; return; }
    }
    if (this.user && this.user.isSuperAdmin && name !== 'admin') {
      location.hash = '#/admin';
      return;
    }
    if (this.user && !this.user.isSuperAdmin && name === 'admin') {
      location.hash = '#/dashboard';
      return;
    }
    const view = this.views[name] || this.views.dashboard;
    const content = document.getElementById('content');
    document.querySelectorAll('.sidebar a[data-nav]').forEach(a =>
      a.classList.toggle('active', a.dataset.nav === name || (name === 'admin' && a.dataset.nav === 'staff')));
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('side-backdrop').classList.add('hidden');
    content.innerHTML = '<div class="empty">Loading…</div>';
    try {
      content.innerHTML = await view.render(params, parts.slice(1));
      if (view.mount) await view.mount(params, parts.slice(1));
    } catch (e) {
      content.innerHTML = `<div class="panel"><div class="form-error">${UI.esc(e.message)}</div></div>`;
    }
    content.scrollTop = 0;
  },
  // ---------- shell ----------
  wireShell() {
    window.addEventListener('hashchange', () => this.route());
    const sidebar = document.getElementById('sidebar'), backdrop = document.getElementById('side-backdrop');
    document.getElementById('btn-menu').onclick = () => {
      const isMobile = window.matchMedia('(max-width:768px)').matches;
      if (isMobile) {
        sidebar.classList.toggle('open');
        backdrop.classList.toggle('hidden', !sidebar.classList.contains('open'));
      } else {
        sidebar.classList.toggle('collapsed');
      }
    };
    backdrop.onclick = () => { sidebar.classList.remove('open'); backdrop.classList.add('hidden'); };

    // quick create + user menu dropdowns
    const quick = document.getElementById('quick-menu'), umenu = document.getElementById('user-menu');
    document.getElementById('btn-quick').onclick = e => { e.stopPropagation(); quick.classList.toggle('hidden'); umenu.classList.add('hidden'); };
    document.getElementById('user-chip').onclick = e => { if (e.target.id !== 'link-logout') { e.stopPropagation(); umenu.classList.toggle('hidden'); quick.classList.add('hidden'); } };
    document.addEventListener('click', () => { quick.classList.add('hidden'); umenu.classList.add('hidden'); document.getElementById('search-results').classList.add('hidden'); });
    document.getElementById('link-logout').onclick = async e => {
      e.preventDefault();
      await UI.api('/api/auth/logout', { method: 'POST' });
      this.user = null; this.showLogin();
    };

    // notifications
    document.getElementById('btn-notif').onclick = () => this.toggleNotifications();
    document.getElementById('notif-close').onclick = () => document.getElementById('notif-drawer').classList.add('hidden');

    // global search
    const si = document.getElementById('global-search'), sr = document.getElementById('search-results');
    let st;
    si.addEventListener('input', () => {
      clearTimeout(st);
      const q = si.value.trim();
      if (q.length < 2) { sr.classList.add('hidden'); return; }
      st = setTimeout(async () => {
        try {
          const { results } = await UI.api('/api/search?q=' + encodeURIComponent(q));
          if (!results.length) { sr.innerHTML = '<div class="empty" style="padding:14px">No matches</div>'; }
          else sr.innerHTML = results.slice(0, 10).map(r =>
            `<a href="${UI.esc(r.link)}"><div class="sr-type">${UI.esc(r.type)}</div>${UI.esc(r.label)}</a>`).join('');
          sr.classList.remove('hidden');
        } catch { }
      }, 250);
    });
    sr.addEventListener('click', () => { sr.classList.add('hidden'); si.value = ''; });
    si.addEventListener('click', e => e.stopPropagation());

    // login form
    document.getElementById('login-form').onsubmit = async e => {
      e.preventDefault();
      const err = document.getElementById('login-error');
      err.classList.add('hidden');
      try {
        const { user, tenant } = await UI.api('/api/auth/login', {
          method: 'POST',
          body: {
            username: document.getElementById('login-user').value.trim(),
            password: document.getElementById('login-pass').value,
            tenantSlug: document.getElementById('login-tenant').value.trim() || undefined
          }
        });
        if (tenant) user.tenant = tenant;
        if (user.mustChangePassword) { this.user = user; this.showChangePassword(); }
        else this.setUser(user);
      } catch (ex) { err.textContent = ex.message; err.classList.remove('hidden'); }
    };

    // change password form
    document.getElementById('pwd-form').onsubmit = async e => {
      e.preventDefault();
      const err = document.getElementById('pwd-error'); err.classList.add('hidden');
      const np = document.getElementById('pwd-new').value, cf = document.getElementById('pwd-confirm').value;
      if (np !== cf) { err.textContent = 'Passwords do not match'; err.classList.remove('hidden'); return; }
      try {
        await UI.api('/api/auth/change-password', { method: 'POST', body: { currentPassword: document.getElementById('pwd-current').value, newPassword: np } });
        UI.toast('Password updated — welcome aboard!', 'ok');
        const { user } = await UI.api('/api/auth/me');
        this.setUser(user);
      } catch (ex) { err.textContent = ex.message; err.classList.remove('hidden'); }
    };
  },
  async loadNotifications() {
    try {
      const { notifications, unread } = await UI.api('/api/notifications');
      const dot = document.getElementById('notif-dot');
      dot.classList.toggle('hidden', !unread);
      document.getElementById('notif-list').innerHTML = notifications.length
        ? notifications.map(n => `<div class="notif-item ${n.is_read ? '' : 'unread'}"><b>${UI.esc(n.title)}</b><p>${UI.esc(n.body || '')}</p><time>${UI.fmtDate(n.created_at)}</time></div>`).join('')
        : '<div class="empty">No notifications</div>';
    } catch { }
  },
  toggleNotifications() {
    const d = document.getElementById('notif-drawer');
    d.classList.toggle('hidden');
    if (!d.classList.contains('hidden')) {
      this.loadNotifications();
      UI.api('/api/notifications/read', { method: 'POST' }).then(() => document.getElementById('notif-dot').classList.add('hidden')).catch(() => { });
    }
  }
});

document.addEventListener('DOMContentLoaded', () => App.boot());
