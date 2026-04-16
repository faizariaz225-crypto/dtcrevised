/* ─── DTC Admin — App Shell ─────────────────────────────────────────────── */
'use strict';

const Shell = (() => {

  // ── Session timeout (30 min inactivity) ───────────────────────────────
  const SESSION_MS   = 30 * 60 * 1000;
  let   _sessionTimer = null;
  let   _sessionAlive = true;

  const _resetTimer = () => {
    if (!_sessionAlive) return;
    clearTimeout(_sessionTimer);
    _sessionTimer = setTimeout(_expireSession, SESSION_MS);
  };

  const _expireSession = () => {
    _sessionAlive = false;
    document.getElementById('session-expired-overlay').classList.add('show');
    setTimeout(() => {
      const inp = document.getElementById('session-reauth-input');
      if (inp) { inp.value = ''; inp.focus(); }
    }, 100);
  };

  const reauth = async () => {
    const inp    = document.getElementById('session-reauth-input');
    const errEl  = document.getElementById('session-reauth-err');
    const key    = inp ? inp.value.trim() : '';
    errEl.style.display = 'none';
    if (!key) return;
    // Verify key by making a lightweight admin API call
    try {
      const r = await fetch(`/admin/revenue?adminKey=${encodeURIComponent(key)}`);
      if (r.ok) {
        Store.adminKey = key;
        _sessionAlive  = true;
        document.getElementById('session-expired-overlay').classList.remove('show');
        _resetTimer();
      } else {
        errEl.textContent = 'Incorrect key — try again.';
        errEl.style.display = 'block';
        inp.value = ''; inp.focus();
      }
    } catch {
      errEl.textContent = 'Network error — check connection.';
      errEl.style.display = 'block';
    }
  };

  // ── Dark mode ─────────────────────────────────────────────────────────
  const _applyDark = (dark) => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    const icon  = document.getElementById('dark-icon');
    const label = document.getElementById('dark-label');
    if (icon)  icon.textContent  = dark ? '☀️' : '🌙';
    if (label) label.textContent = dark ? 'Light Mode' : 'Dark Mode';
    try { localStorage.setItem('dtc-dark', dark ? '1' : '0'); } catch {}
  };

  const toggleDark = () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    _applyDark(!isDark);
  };

  // ── Cmd+K global search ────────────────────────────────────────────────
  let _searchIdx = -1;

  const openSearch = () => {
    document.getElementById('search-overlay').classList.add('open');
    const inp = document.getElementById('search-input');
    if (inp) { inp.value = ''; inp.focus(); }
    document.getElementById('search-results').innerHTML =
      '<div class="search-empty">Start typing to search all customers…</div>';
    _searchIdx = -1;
    _resetTimer();
  };

  const closeSearch = () => {
    document.getElementById('search-overlay').classList.remove('open');
  };

  const searchQuery = (q) => {
    _searchIdx = -1;
    const tokens  = Store.tokens || {};
    const query   = q.trim().toLowerCase();
    const resultsEl = document.getElementById('search-results');

    if (!query) {
      resultsEl.innerHTML = '<div class="search-empty">Start typing to search all customers…</div>';
      return;
    }

    const matches = Object.entries(tokens).filter(([tok, t]) => {
      return (t.customerName || '').toLowerCase().includes(query)
          || (t.email        || '').toLowerCase().includes(query)
          || (t.wechat       || '').toLowerCase().includes(query)
          || tok.toLowerCase().includes(query)
          || (t.packageType  || '').toLowerCase().includes(query)
          || (t.productName  || '').toLowerCase().includes(query);
    }).slice(0, 12);

    if (!matches.length) {
      resultsEl.innerHTML = '<div class="search-empty">No customers found for "<strong>' + esc(q) + '</strong>"</div>';
      return;
    }

    const sym = (Store.settings || {}).currencySymbol || '$';
    resultsEl.innerHTML = matches.map(([tok, t], i) => {
      const subSt = getSubStatus(t);
      const days  = t.subscriptionExpiresAt ? daysUntil(t.subscriptionExpiresAt) : null;
      const statusStr = !t.approved ? 'Pending' : days === null ? 'Active' : days < 0 ? 'Expired' : days <= 7 ? `${days}d left` : `${days}d left`;
      const statusColor = !t.approved ? '#64748b' : days !== null && days < 0 ? '#dc2626' : days !== null && days <= 7 ? '#d97706' : '#16a34a';
      const statusBg    = !t.approved ? '#f1f5f9' : days !== null && days < 0 ? '#fef2f2' : days !== null && days <= 7 ? '#fffbeb' : '#f0fdf4';
      const initials = (t.customerName || '?').split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
      const dotColor = t.productId ? '#2563eb' : (t.product === 'chatgpt' ? '#10a37f' : '#2563eb');
      return `<div class="search-result" data-token="${esc(tok)}" onclick="Shell._searchJump('${esc(tok)}')" data-idx="${i}">
        <div class="sr-avatar" style="background:${dotColor}">${esc(initials)}</div>
        <div class="sr-main">
          <div class="sr-name">${esc(t.customerName || '—')}</div>
          <div class="sr-meta">${esc(t.packageType || '')}${t.email ? ' · ' + esc(t.email) : ''}${t.wechat ? ' · 💬 ' + esc(t.wechat) : ''}</div>
        </div>
        <span class="sr-badge" style="background:${statusBg};color:${statusColor};border:1px solid ${statusColor}40">${statusStr}</span>
      </div>`;
    }).join('');
  };

  const searchKeydown = (e) => {
    const results = document.querySelectorAll('.search-result');
    if (e.key === 'Escape') { closeSearch(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      _searchIdx = Math.min(_searchIdx + 1, results.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      _searchIdx = Math.max(_searchIdx - 1, 0);
    } else if (e.key === 'Enter' && _searchIdx >= 0) {
      const focused = results[_searchIdx];
      if (focused) _searchJump(focused.dataset.token);
      return;
    } else { return; }
    results.forEach((r, i) => r.classList.toggle('focused', i === _searchIdx));
    if (results[_searchIdx]) results[_searchIdx].scrollIntoView({ block: 'nearest' });
  };

  const _searchJump = (token) => {
    closeSearch();
    // Navigate to dashboard and scroll/highlight that row
    const dashNav = document.querySelector('.nav-item[onclick*="dashboard"]');
    if (dashNav) navigate('dashboard', dashNav);
    // Small delay then highlight the row
    setTimeout(() => {
      const row = document.querySelector(`[data-token="${token}"]`);
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.style.outline = '2px solid var(--blue)';
        row.style.outlineOffset = '-2px';
        setTimeout(() => { row.style.outline = ''; row.style.outlineOffset = ''; }, 2000);
      } else {
        // If filtered out, reset filter and reload
        Store.setDashFilter('all');
        Dashboard.render();
        setTimeout(() => {
          const r2 = document.querySelector(`[data-token="${token}"]`);
          if (r2) { r2.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        }, 100);
      }
    }, 150);
  };

  // ── Navigation ────────────────────────────────────────────────────────
  const navigate = (pageId, navEl) => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('page-' + pageId).classList.add('active');
    navEl.classList.add('active');
    document.getElementById('sidebar').classList.remove('open');
    if (pageId === 'instructions')  Instructions.render();
    if (pageId === 'products')      Products.render();
    if (pageId === 'campaigns')     { BulkEmail.render(); BulkEmail.init(); }
    if (pageId === 'resellers')     Resellers.render();
    if (pageId === 'settings')      Settings.load();
    if (pageId === 'revenue')       Revenue.render();
    if (pageId === 'notifications') { Notifications.init(); Notifications.load(); }
    if (pageId === 'landing')       Landing.load();
    if (pageId === 'livechat')      LiveChat.load();
    _resetTimer();
  };

  // ── Init ──────────────────────────────────────────────────────────────
  const init = () => {
    // Mobile sidebar
    document.getElementById('mob-menu-btn')
      .addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));

    // Restore dark mode preference
    try {
      const saved = localStorage.getItem('dtc-dark');
      if (saved === '1') _applyDark(true);
    } catch {}

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Cmd+K / Ctrl+K — open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openSearch();
        return;
      }
      // Escape — close search
      if (e.key === 'Escape') { closeSearch(); return; }
      // Activity reset
      _resetTimer();
    });

    // Reset session timer on any user activity
    ['mousemove','mousedown','touchstart','scroll'].forEach(ev =>
      document.addEventListener(ev, _resetTimer, { passive: true })
    );

    // Start session timer
    _resetTimer();
  };

  return { init, navigate, toggleDark, openSearch, closeSearch, searchQuery, searchKeydown, _searchJump, reauth };
})();
