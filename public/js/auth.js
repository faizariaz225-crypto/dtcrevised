/* ─── DTC Admin — Auth Module (Staff Login) ──────────────────────────────── */
'use strict';

var Auth = (() => {

  const _showError = (msg) => {
    const el = document.getElementById('login-err');
    el.textContent = msg;
    el.classList.add('show');
  };
  const _clearError = () => document.getElementById('login-err').classList.remove('show');
  const _setLoading = (on) => {
    const btn = document.getElementById('login-btn');
    btn.disabled = on;
    btn.textContent = on ? 'Signing in…' : 'Sign In →';
  };

  const init = () => {
    document.getElementById('login-password')
      ?.addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
    document.getElementById('login-email')
      ?.addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
  };

  const login = async () => {
    const email    = (document.getElementById('login-email')?.value    || '').trim();
    const password = (document.getElementById('login-password')?.value || '').trim();
    if (!email || !password) return _showError('Please enter your email and password.');

    _clearError();
    _setLoading(true);

    let authData;
    try {
      authData = await fetch('/admin/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }).then(r => r.json());
    } catch {
      _showError('Cannot reach the server. Please make sure it is running.');
      _setLoading(false);
      return;
    }

    if (!authData || !authData.ok) {
      _showError(authData?.error || 'Invalid email or password.');
      _setLoading(false);
      return;
    }

    // Store token and role in Store
    Store.setStaffToken(authData.token);
    Store.setRole(authData.role);
    Store.setStaffName(authData.name);
    Store.setAdminKey(''); // legacy compat — no longer used for auth

    // Fetch session data using staff token
    let data;
    try {
      data = await api('/admin/sessions-data', {});
    } catch {
      _showError('Authenticated but failed to load data. Please refresh.');
      _setLoading(false);
      return;
    }

    if (!data || data.error) {
      _showError('Session error. Please try again.');
      _setLoading(false);
      return;
    }

    Store.load(data);

    // Transition to app
    document.getElementById('login-wrap').style.display = 'none';
    document.getElementById('app').style.display        = 'flex';
    _setLoading(false);

    Shell.init();
    await safeRun('Instructions', Instructions.loadData);
    await safeRun('Products',     Products.loadData);
    await safeRun('BulkEmail',    BulkEmail.loadTemplates);
    await safeRun('Settings',     Settings.load);

    safeRun('Dashboard',      Dashboard.render);
    safeRun('Dashboard.dd',   Dashboard.refreshDropdowns);
    safeRun('Customers',      Customers.render);
    safeRun('EmailConfig',    EmailConfig.load);
    safeRun('EmailLog',       EmailLog.render);
    safeRun('Notifications',  Notifications.load);
    safeRun('Revenue',        Revenue.render);
    safeRun('BulkEmail.init', BulkEmail.init);
    safeRun('Resellers',      Resellers.render);
    safeRun('LiveChat',       LiveChat.load);
    safeRun('StaffAdmin',     StaffManager.init);
    setTimeout(() => { try { Resellers.populateDropdown(); } catch(e) {} }, 1200);
    Notifications.init();

    // Apply role-based UI restrictions
    _applyRoleUI(authData.role, authData.name);
  };

  const logout = async () => {
    try {
      await fetch('/admin/staff/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-staff-token': Store.staffToken },
        body: JSON.stringify({ staffToken: Store.staffToken }),
      });
    } catch {}
    Store.setStaffToken('');
    Store.setRole('');
    Store.setStaffName('');
    document.getElementById('app').style.display        = 'none';
    document.getElementById('login-wrap').style.display = '';
    document.getElementById('login-email').value        = '';
    document.getElementById('login-password').value     = '';
    _clearError();
  };

  // ── Role-based UI ─────────────────────────────────────────────────────────
  const ROLE_PAGES = {
    superadmin: ['dashboard','customers','revenue','resellers','products','landing','instructions','notifications','settings','campaigns','livechat','email','staff'],
    admin:      ['dashboard','customers','revenue','resellers','products','landing','instructions','notifications','settings','campaigns','livechat','email'],
    support:    ['dashboard','customers','livechat','campaigns','notifications'],
    readonly:   ['dashboard','customers'],
  };

  const _applyRoleUI = (role, name) => {
    const allowed = new Set(ROLE_PAGES[role] || ROLE_PAGES.readonly);

    // Hide nav items not in allowed set
    document.querySelectorAll('.nav-item[data-page]').forEach(el => {
      const page = el.dataset.page;
      if (page && !allowed.has(page)) el.style.display = 'none';
    });

    // Show staff badge in header
    const badge = document.getElementById('staff-identity-badge');
    if (badge) {
      const roleColors = { superadmin:'#7c3aed', admin:'#2563eb', support:'#16a34a', readonly:'#64748b' };
      const roleLabels = { superadmin:'Super Admin', admin:'Admin', support:'Support', readonly:'Read Only' };
      badge.innerHTML =
        '<span style="font-size:.72rem;color:var(--muted)">' + name + '</span>' +
        '<span style="font-size:.62rem;font-weight:700;padding:.15rem .45rem;border-radius:5px;background:' + (roleColors[role]||'#64748b') + '20;color:' + (roleColors[role]||'#64748b') + ';border:1px solid ' + (roleColors[role]||'#64748b') + '40">' + (roleLabels[role]||role) + '</span>';
      badge.style.display = 'flex';
    }

    // Disable action buttons for readonly
    if (role === 'readonly') {
      document.querySelectorAll('.approve-btn,.decline-btn,.deact-btn,[data-role-write]').forEach(el => {
        el.disabled = true;
        el.title    = 'Your role does not allow this action';
        el.style.opacity = '0.4';
        el.style.cursor  = 'not-allowed';
      });
    }
  };

  const safeRun = async (name, fn) => {
    try { await fn(); } catch (e) { console.warn(`[${name}]`, e.message); }
  };

  return { init, login, logout };
})();
