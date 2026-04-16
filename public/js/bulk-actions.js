/* ─── DTC Admin — Bulk Actions Module ───────────────────────────────────────
   Adds checkboxes to pending submissions in the dashboard inbox and a
   floating bulk-action bar for approve-all / decline-all.
   Loaded after dashboard.js. ─────────────────────────────────────────────── */
'use strict';

var BulkActions = (() => {
  let _selected = new Set();

  // ── Inject styles once ──────────────────────────────────────────────────────
  const _injectStyles = () => {
    if (document.getElementById('bulk-actions-css')) return;
    const s = document.createElement('style');
    s.id = 'bulk-actions-css';
    s.textContent = `
      .bulk-chk { width:16px;height:16px;cursor:pointer;accent-color:#2563eb;flex-shrink:0 }
      .bulk-bar {
        position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);
        background:#1e293b;color:#fff;border-radius:12px;padding:.7rem 1.2rem;
        display:flex;align-items:center;gap:.8rem;box-shadow:0 8px 32px rgba(0,0,0,.25);
        z-index:8000;font-family:'Inter',sans-serif;font-size:.82rem;
        animation:slideUp .2s ease;white-space:nowrap;
      }
      .bulk-bar .bc { color:#94a3b8;font-size:.75rem }
      .bulk-bar button { border:none;border-radius:7px;padding:.4rem .9rem;font-size:.78rem;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif }
      .bulk-bar .b-approve { background:#16a34a;color:#fff }
      .bulk-bar .b-approve:hover { background:#15803d }
      .bulk-bar .b-decline { background:#dc2626;color:#fff }
      .bulk-bar .b-decline:hover { background:#b91c1c }
      .bulk-bar .b-clear   { background:transparent;color:#94a3b8;border:1px solid #334155 }
      .bulk-bar .b-clear:hover { color:#fff }
      @keyframes slideUp { from{opacity:0;transform:translateX(-50%) translateY(10px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
      .inbox-row-wrap { display:flex;align-items:flex-start;gap:.6rem }
      .inbox-row-chk-col { padding-top:.2rem;flex-shrink:0 }
    `;
    document.head.appendChild(s);
  };

  // ── Patch dashboard inbox to add checkboxes ──────────────────────────────────
  // We hook into the existing render cycle by patching Dashboard.refreshDropdowns
  // and observing DOM mutations on action-inbox.
  let _observer = null;
  const _attachToInbox = () => {
    const inbox = document.getElementById('action-inbox');
    if (!inbox) return;

    if (_observer) _observer.disconnect();
    _observer = new MutationObserver(() => _decorateInbox());
    _observer.observe(inbox, { childList: true, subtree: false });
    _decorateInbox();
  };

  const _decorateInbox = () => {
    const inbox = document.getElementById('action-inbox');
    if (!inbox) return;

    // Find all pending-approve rows (those with an approve button)
    inbox.querySelectorAll('[id^="ab-"]').forEach(approveBtn => {
      const token = approveBtn.id.replace('ab-', '');
      const row   = approveBtn.closest('.inbox-item, [style*="border"]');
      if (!row || row.dataset.bulkWrapped) return;
      row.dataset.bulkWrapped = '1';
      row.dataset.token = token;

      // Wrap content with flex+checkbox
      const existing = row.innerHTML;
      row.innerHTML = `
        <div class="inbox-row-wrap">
          <div class="inbox-row-chk-col">
            <input type="checkbox" class="bulk-chk" data-token="${token}" onchange="BulkActions.toggle('${token}', this.checked)"/>
          </div>
          <div style="flex:1">${existing}</div>
        </div>`;

      // Re-sync checked state
      const chk = row.querySelector('.bulk-chk');
      if (chk) chk.checked = _selected.has(token);
    });
  };

  // ── Selection management ────────────────────────────────────────────────────
  const toggle = (token, checked) => {
    if (checked) _selected.add(token); else _selected.delete(token);
    _syncBar();
  };

  const selectAll = () => {
    document.querySelectorAll('.bulk-chk').forEach(c => { c.checked = true; _selected.add(c.dataset.token); });
    _syncBar();
  };

  const clearAll = () => {
    _selected.clear();
    document.querySelectorAll('.bulk-chk').forEach(c => { c.checked = false; });
    _syncBar();
  };

  const _syncBar = () => {
    let bar = document.getElementById('bulk-action-bar');
    if (!_selected.size) {
      if (bar) bar.remove();
      return;
    }
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'bulk-action-bar';
      bar.className = 'bulk-bar';
      document.body.appendChild(bar);
    }
    bar.innerHTML = `
      <span class="bc">${_selected.size} selected</span>
      <button class="b-approve" onclick="BulkActions.bulkApprove()">✓ Approve All</button>
      <button class="b-decline" onclick="BulkActions.bulkDecline()">✕ Decline All</button>
      <button onclick="BulkActions.selectAll()" style="background:transparent;color:#94a3b8;border:1px solid #334155;border-radius:7px;padding:.4rem .9rem;font-size:.78rem;cursor:pointer;font-family:'Inter',sans-serif">Select All</button>
      <button class="b-clear" onclick="BulkActions.clearAll()">✕ Clear</button>`;
  };

  // ── Bulk operations ──────────────────────────────────────────────────────────
  const bulkApprove = async () => {
    if (!_selected.size) return;
    const tokenList = [..._selected];
    const bar = document.getElementById('bulk-action-bar');
    if (bar) bar.innerHTML = '<span style="color:#94a3b8">Approving ' + tokenList.length + ' submission' + (tokenList.length !== 1 ? 's' : '') + '…</span>';

    try {
      const r = await fetch('/admin/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminKey: Store.adminKey, tokens: tokenList }),
      });
      const d = await r.json();
      if (d.success) {
        _selected.clear();
        if (bar) bar.remove();
        await Dashboard.reload();
        _showToast('✓ Approved ' + d.approved + ' submission' + (d.approved !== 1 ? 's' : ''));
      } else {
        alert('Bulk approve failed: ' + (d.error || 'Unknown error'));
        _syncBar();
      }
    } catch {
      alert('Network error during bulk approve.');
      _syncBar();
    }
  };

  const bulkDecline = async () => {
    if (!_selected.size) return;
    const reason = prompt('Decline reason (sent to all selected customers):', 'The details provided could not be verified.');
    if (reason === null) return; // cancelled
    const tokenList = [..._selected];
    const bar = document.getElementById('bulk-action-bar');
    if (bar) bar.innerHTML = '<span style="color:#94a3b8">Declining ' + tokenList.length + '…</span>';

    try {
      const r = await fetch('/admin/bulk-decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminKey: Store.adminKey, tokens: tokenList, reason }),
      });
      const d = await r.json();
      if (d.success) {
        _selected.clear();
        if (bar) bar.remove();
        await Dashboard.reload();
        _showToast('✕ Declined ' + d.declined + ' submission' + (d.declined !== 1 ? 's' : ''));
      } else {
        alert('Bulk decline failed: ' + (d.error || 'Unknown error'));
        _syncBar();
      }
    } catch {
      alert('Network error during bulk decline.');
      _syncBar();
    }
  };

  // ── Toast ────────────────────────────────────────────────────────────────────
  const _showToast = (msg) => {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;top:1.2rem;right:1.2rem;background:#1e293b;color:#fff;padding:.6rem 1.1rem;border-radius:9px;font-size:.82rem;font-family:Inter,sans-serif;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,.2);animation:slideUp .2s ease';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  };

  // ── Init ─────────────────────────────────────────────────────────────────────
  const init = () => {
    _injectStyles();
    // Attach after dashboard loads
    setTimeout(_attachToInbox, 800);
    // Re-attach after dashboard re-renders
    const origReload = Dashboard.reload;
    Dashboard.reload = async (...args) => {
      const result = await origReload.apply(Dashboard, args);
      setTimeout(_attachToInbox, 300);
      return result;
    };
  };

  return { init, toggle, selectAll, clearAll, bulkApprove, bulkDecline };
})();
