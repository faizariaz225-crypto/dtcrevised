/* ─── DTC Admin — Staff Manager Module ──────────────────────────────────── */
'use strict';

var StaffManager = (() => {

  const ROLE_META = {
    superadmin: { label: 'Super Admin', color: '#7c3aed', bg: '#fdf4ff', border: '#e9d5ff' },
    admin:      { label: 'Admin',       color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
    support:    { label: 'Support',     color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
    readonly:   { label: 'Read Only',   color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
  };

  const _pill = (role) => {
    const m = ROLE_META[role] || ROLE_META.readonly;
    return `<span style="font-size:.62rem;font-weight:700;padding:.18rem .55rem;border-radius:99px;background:${m.bg};border:1px solid ${m.border};color:${m.color}">${m.label}</span>`;
  };

  const _api = async (path, body) => {
    const token = Store.staffToken;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['x-staff-token'] = token;
    const r = await fetch(path, body
      ? { method: 'POST', headers, body: JSON.stringify(body) }
      : { method: 'GET',  headers });
    return r.json();
  };

  // ── Tab switching ─────────────────────────────────────────────────────────
  const _switchTab = (tab, btn) => {
    ['members','audit','password'].forEach(t => {
      const el = document.getElementById('staff-tab-' + t);
      const b  = document.getElementById('stab-' + t);
      if (el) el.style.display = t === tab ? '' : 'none';
      if (b)  b.classList.toggle('active', t === tab);
    });
    if (tab === 'audit') refreshAudit();
  };

  // ── Init (called after login) ─────────────────────────────────────────────
  const init = async () => {
    // Hide staff nav for non-superadmin
    const isSuperAdmin = Store.role === 'superadmin';
    const nav = document.querySelector('[data-page="staff"]');
    if (nav && !isSuperAdmin) { nav.style.display = 'none'; return; }

    // Apply role-based nav hiding
    _applyRoleRestrictions(Store.role);

    // Show identity badge in sidebar
    _renderBadge(Store.staffName, Store.role);

    if (isSuperAdmin) await _loadMembers();
  };

  const _applyRoleRestrictions = (role) => {
    const ALLOWED = {
      superadmin: new Set(['dashboard','customers','revenue','resellers','products','landing','instructions','notifications','settings','campaigns','livechat','email','staff']),
      admin:      new Set(['dashboard','customers','revenue','resellers','products','landing','instructions','notifications','settings','campaigns','livechat','email']),
      support:    new Set(['dashboard','customers','campaigns','notifications','livechat']),
      readonly:   new Set(['dashboard','customers']),
    };
    const allowed = ALLOWED[role] || ALLOWED.readonly;
    document.querySelectorAll('.nav-item[data-page]').forEach(el => {
      if (!allowed.has(el.dataset.page)) el.style.display = 'none';
    });
  };

  const _renderBadge = (name, role) => {
    const badge = document.getElementById('staff-identity-badge');
    if (!badge) return;
    const m = ROLE_META[role] || ROLE_META.readonly;
    badge.style.display = 'flex';
    badge.style.flexDirection = 'column';
    badge.style.gap = '.2rem';
    badge.style.marginBottom = '.5rem';
    badge.innerHTML =
      `<span style="font-size:.75rem;font-weight:600;color:var(--text)">${esc(name)}</span>` +
      `<span style="font-size:.62rem;font-weight:700;padding:.15rem .45rem;border-radius:5px;width:fit-content;background:${m.bg};color:${m.color};border:1px solid ${m.border}">${m.label}</span>`;
  };

  // ── Load & render members ─────────────────────────────────────────────────
  const _loadMembers = async () => {
    const wrap = document.getElementById('staff-list');
    if (!wrap) return;
    wrap.innerHTML = '<div class="empty">Loading…</div>';
    try {
      const d = await _api('/admin/staff');
      const staff = d.staff || [];
      _renderMembers(staff);
    } catch {
      wrap.innerHTML = '<div class="empty" style="color:var(--error)">Failed to load staff.</div>';
    }
  };

  const _renderMembers = (staff) => {
    const wrap = document.getElementById('staff-list');
    if (!wrap) return;

    const masterRow = `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:.8rem 1rem;border:1px solid var(--border);border-radius:10px;background:#f8fafc;margin-bottom:.5rem;flex-wrap:wrap;gap:.5rem">
        <div style="display:flex;align-items:center;gap:.8rem">
          <div style="width:36px;height:36px;border-radius:50%;background:#7c3aed20;border:1.5px solid #e9d5ff;display:flex;align-items:center;justify-content:center;font-size:.9rem">👤</div>
          <div>
            <div style="font-size:.85rem;font-weight:700;color:var(--text)">Super Admin <span style="font-size:.65rem;color:var(--muted);font-weight:400">(master)</span></div>
            <div style="font-size:.72rem;color:var(--muted);font-family:'JetBrains Mono',monospace">admin · password = ADMIN_KEY env var</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:.5rem">
          ${_pill('superadmin')}
          <span style="font-size:.65rem;font-weight:700;padding:.18rem .5rem;border-radius:99px;background:var(--success-bg);border:1px solid var(--success-border);color:var(--success)">Active</span>
        </div>
      </div>`;

    if (!staff.length) {
      wrap.innerHTML = masterRow + '<div class="empty" style="margin-top:.8rem">No staff accounts yet. Add your first team member above.</div>';
      return;
    }

    const rows = staff.map(s => {
      const lastLogin = s.lastLoginAt
        ? new Date(s.lastLoginAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
          + ' ' + new Date(s.lastLoginAt).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })
        : 'Never logged in';
      const statusPill = s.suspended
        ? `<span style="font-size:.65rem;font-weight:700;padding:.18rem .5rem;border-radius:99px;background:var(--error-bg);border:1px solid var(--error-border);color:var(--error)">Suspended</span>`
        : `<span style="font-size:.65rem;font-weight:700;padding:.18rem .5rem;border-radius:99px;background:var(--success-bg);border:1px solid var(--success-border);color:var(--success)">Active</span>`;
      const initials = s.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
      const m = ROLE_META[s.role] || ROLE_META.readonly;
      return `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:.8rem 1rem;border:1px solid var(--border);border-radius:10px;background:#fff;margin-bottom:.5rem;flex-wrap:wrap;gap:.5rem${s.suspended?';opacity:.65':''}">
          <div style="display:flex;align-items:center;gap:.8rem">
            <div style="width:36px;height:36px;border-radius:50%;background:${m.bg};border:1.5px solid ${m.border};display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:700;color:${m.color}">${esc(initials)}</div>
            <div>
              <div style="font-size:.85rem;font-weight:700;color:var(--text)">${esc(s.name)}</div>
              <div style="font-size:.72rem;color:var(--muted);font-family:'JetBrains Mono',monospace">${esc(s.email)} · ${lastLogin}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:.4rem;flex-wrap:wrap">
            ${_pill(s.role)}
            ${statusPill}
            <button class="btn btn-outline btn-sm" onclick="StaffManager.openModal('${s.id}')">✏ Edit</button>
            <button class="btn btn-outline btn-sm" onclick="StaffManager.toggleSuspend('${s.id}',${!s.suspended})">${s.suspended ? '▶ Activate' : '⊘ Suspend'}</button>
            <button class="btn btn-ghost-red btn-sm" onclick="StaffManager.deleteStaff('${s.id}')">🗑</button>
          </div>
        </div>`;
    }).join('');

    wrap.innerHTML = masterRow + rows;
  };

  // ── Audit log ─────────────────────────────────────────────────────────────
  const refreshAudit = async () => {
    const wrap = document.getElementById('staff-audit-list');
    if (!wrap) return;
    wrap.innerHTML = '<div class="empty">Loading…</div>';
    try {
      const d = await _api('/admin/staff/audit-log?n=100');
      const log = d.log || [];
      if (!log.length) { wrap.innerHTML = '<div class="empty">No activity recorded yet.</div>'; return; }
      wrap.innerHTML = `
        <div style="border:1px solid var(--border);border-radius:10px;overflow:hidden">
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="background:#f8fafc;border-bottom:1px solid var(--border)">
                <th style="padding:.6rem 1rem;font-size:.65rem;text-align:left;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">Time</th>
                <th style="padding:.6rem 1rem;font-size:.65rem;text-align:left;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">Staff</th>
                <th style="padding:.6rem 1rem;font-size:.65rem;text-align:left;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">Action</th>
                <th style="padding:.6rem 1rem;font-size:.65rem;text-align:left;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">Detail</th>
              </tr>
            </thead>
            <tbody>
              ${log.map(e => {
                const actionColor = e.action === 'approve' ? 'var(--success)' : e.action === 'decline' ? 'var(--error)' : 'var(--blue)';
                const actionBg    = e.action === 'approve' ? 'var(--success-bg)' : e.action === 'decline' ? 'var(--error-bg)' : 'var(--blue-light)';
                return `<tr style="border-bottom:1px solid #f1f5f9">
                  <td style="padding:.55rem 1rem;font-size:.7rem;color:var(--muted2);white-space:nowrap">${new Date(e.ts).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})} ${new Date(e.ts).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</td>
                  <td style="padding:.55rem 1rem;font-size:.75rem;font-weight:600;color:var(--text)">${esc(e.who)}</td>
                  <td style="padding:.55rem 1rem"><span style="font-size:.65rem;font-weight:700;padding:.15rem .45rem;border-radius:5px;background:${actionBg};color:${actionColor}">${esc(e.action)}</span></td>
                  <td style="padding:.55rem 1rem;font-size:.72rem;color:var(--muted)">${esc(e.detail)}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`;
    } catch {
      wrap.innerHTML = '<div class="empty" style="color:var(--error)">Failed to load audit log.</div>';
    }
  };

  // ── Change password (for logged-in staff member) ───────────────────────────
  const changePassword = async () => {
    const errEl  = document.getElementById('cp-err');
    const okEl   = document.getElementById('cp-ok');
    const current = document.getElementById('cp-current')?.value || '';
    const newPw   = document.getElementById('cp-new')?.value     || '';
    const confirm = document.getElementById('cp-confirm')?.value || '';
    errEl.style.display = 'none'; okEl.style.display = 'none';

    if (!current || !newPw)    { errEl.textContent = 'All fields are required.';                  errEl.style.display = 'block'; return; }
    if (newPw !== confirm)     { errEl.textContent = 'New passwords do not match.';               errEl.style.display = 'block'; return; }
    if (newPw.length < 6)      { errEl.textContent = 'New password must be at least 6 characters.'; errEl.style.display = 'block'; return; }

    try {
      const d = await _api('/admin/staff/change-password', { currentPassword: current, newPassword: newPw });
      if (d && d.ok) {
        okEl.textContent = '✓ Password changed successfully.';
        okEl.style.display = 'block';
        document.getElementById('cp-current').value = '';
        document.getElementById('cp-new').value     = '';
        document.getElementById('cp-confirm').value = '';
      } else {
        errEl.textContent = d?.error || 'Failed to change password.';
        errEl.style.display = 'block';
      }
    } catch {
      errEl.textContent = 'Network error. Please try again.';
      errEl.style.display = 'block';
    }
  };

  // ── Add / Edit modal ──────────────────────────────────────────────────────
  let _editingId = null;

  const openModal = async (id) => {
    _editingId = id || null;
    let modal = document.getElementById('staff-modal');
    if (!modal) { _injectModal(); modal = document.getElementById('staff-modal'); }

    ['sm-name','sm-email','sm-password'].forEach(fid => {
      const el = document.getElementById(fid); if (el) el.value = '';
    });
    const errEl = document.getElementById('sm-err');
    if (errEl) errEl.style.display = 'none';

    if (id) {
      document.getElementById('sm-modal-title').textContent = 'Edit Staff Member';
      document.getElementById('sm-pw-hint').textContent     = 'Leave blank to keep current password.';
      const d = await _api('/admin/staff');
      const member = (d.staff || []).find(s => s.id === id);
      if (member) {
        document.getElementById('sm-name').value  = member.name;
        document.getElementById('sm-email').value = member.email;
        document.getElementById('sm-role').value  = member.role;
      }
    } else {
      document.getElementById('sm-modal-title').textContent = 'Add Staff Member';
      document.getElementById('sm-pw-hint').textContent     = 'Required for new accounts.';
      document.getElementById('sm-role').value = 'support';
    }

    modal.style.display = 'flex';
    setTimeout(() => document.getElementById('sm-name')?.focus(), 50);
  };

  const closeModal = () => {
    const m = document.getElementById('staff-modal');
    if (m) m.style.display = 'none';
    _editingId = null;
  };

  const saveModal = async () => {
    const errEl   = document.getElementById('sm-err');
    const saveBtn = document.getElementById('sm-save-btn');
    if (errEl) errEl.style.display = 'none';

    const name     = (document.getElementById('sm-name')?.value     || '').trim();
    const email    = (document.getElementById('sm-email')?.value    || '').trim();
    const password = (document.getElementById('sm-password')?.value || '').trim();
    const role     = document.getElementById('sm-role')?.value || 'support';

    const showErr = (msg) => { if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; } };
    if (!name)                    return showErr('Name is required.');
    if (!email)                   return showErr('Email is required.');
    if (!_editingId && !password) return showErr('Password is required for new accounts.');
    if (password && password.length < 6) return showErr('Password must be at least 6 characters.');

    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; }

    const body = { name, email, role };
    if (_editingId) body.id = _editingId;
    if (password)   body.password = password;

    try {
      const d = await _api('/admin/staff/save', body);
      if (d && d.ok) { closeModal(); await _loadMembers(); }
      else showErr(d?.error || 'Save failed. Please try again.');
    } catch {
      showErr('Network error. Please try again.');
    }
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save'; }
  };

  const toggleSuspend = async (id, suspend) => {
    try {
      const d = await _api('/admin/staff/suspend', { id, suspended: suspend });
      if (d?.ok) await _loadMembers();
      else alert(d?.error || 'Failed to update status.');
    } catch { alert('Network error.'); }
  };

  const deleteStaff = async (id) => {
    if (!confirm('Remove this staff member?\n\nThey will be signed out immediately and lose all access.')) return;
    try {
      const d = await _api('/admin/staff/delete', { id });
      if (d?.ok) await _loadMembers();
      else alert(d?.error || 'Failed to delete.');
    } catch { alert('Network error.'); }
  };

  // ── Modal injection ───────────────────────────────────────────────────────
  const _injectModal = () => {
    if (document.getElementById('staff-modal')) return;
    const el = document.createElement('div');
    el.id = 'staff-modal';
    el.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;align-items:center;justify-content:center;padding:1rem';
    el.innerHTML = `
      <div style="background:#fff;border-radius:14px;width:100%;max-width:440px;padding:1.6rem 1.8rem;box-shadow:0 20px 60px rgba(0,0,0,.2)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.3rem">
          <div style="font-size:1rem;font-weight:700;color:#1e293b" id="sm-modal-title">Add Staff Member</div>
          <button onclick="StaffManager.closeModal()" style="background:none;border:none;font-size:1.2rem;cursor:pointer;color:#94a3b8;line-height:1">✕</button>
        </div>

        <label style="font-size:.72rem;font-weight:600;color:#1e293b;display:block;margin-bottom:.3rem">Full Name *</label>
        <input id="sm-name" type="text" placeholder="Jane Smith"
          style="width:100%;padding:.65rem .9rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:.85rem;margin-bottom:.8rem;outline:none;font-family:'Inter',sans-serif"/>

        <label style="font-size:.72rem;font-weight:600;color:#1e293b;display:block;margin-bottom:.3rem">Email Address *</label>
        <input id="sm-email" type="email" placeholder="jane@example.com"
          style="width:100%;padding:.65rem .9rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:.85rem;margin-bottom:.8rem;outline:none;font-family:'Inter',sans-serif"/>

        <label style="font-size:.72rem;font-weight:600;color:#1e293b;display:block;margin-bottom:.3rem">Role *</label>
        <select id="sm-role"
          style="width:100%;padding:.65rem .9rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:.85rem;margin-bottom:.8rem;outline:none;font-family:'Inter',sans-serif;background:#fff;cursor:pointer">
          <option value="support">Support — approve/decline, chat, campaigns</option>
          <option value="admin">Admin — full access, no staff management</option>
          <option value="superadmin">Super Admin — full access including staff</option>
          <option value="readonly">Read Only — view dashboard &amp; customers only</option>
        </select>

        <label style="font-size:.72rem;font-weight:600;color:#1e293b;display:block;margin-bottom:.2rem">Password *</label>
        <div style="font-size:.68rem;color:#94a3b8;margin-bottom:.3rem" id="sm-pw-hint">Required for new accounts.</div>
        <input id="sm-password" type="text" placeholder="Min. 6 characters"
          style="width:100%;padding:.65rem .9rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:.85rem;margin-bottom:.6rem;outline:none;font-family:'JetBrains Mono',monospace"/>

        <div id="sm-err" style="display:none;font-size:.75rem;color:#dc2626;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:.45rem .7rem;margin-bottom:.7rem"></div>

        <div style="display:flex;gap:.5rem">
          <button onclick="StaffManager.closeModal()"
            style="flex:1;padding:.65rem;border:1px solid #e2e8f0;border-radius:8px;background:#fff;font-size:.82rem;cursor:pointer;font-family:'Inter',sans-serif;color:#64748b">
            Cancel
          </button>
          <button id="sm-save-btn" onclick="StaffManager.saveModal()"
            style="flex:2;padding:.65rem;border:none;border-radius:8px;background:#2563eb;color:#fff;font-size:.82rem;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif">
            Save
          </button>
        </div>
      </div>`;
    document.body.appendChild(el);
    el.addEventListener('click', e => { if (e.target === el) closeModal(); });
  };

  return {
    init, _switchTab,
    openModal, closeModal, saveModal,
    toggleSuspend, deleteStaff,
    changePassword, refreshAudit,
  };
})();
