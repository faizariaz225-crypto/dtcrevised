/* ─── DTC Admin — Revenue Module ────────────────────────────────────────── */
'use strict';

const Revenue = (() => {

  const _sym = () => (Store.settings || {}).currencySymbol || '$';
  const _fmt = (n) => _sym() + (n || 0).toFixed(2);

  const render = () => {
    const tokens   = Store.tokens;
    const products = Store.products || [];
    const rev      = Store.revenue  || { total: 0, byProduct: {} };
    const sym      = _sym();

    // ── Summary stats ────────────────────────────────────────────────────────
    const activated = Object.entries(tokens)
      .filter(([, t]) => t.approved && t.price)
      .sort((a, b) => new Date(b[1].approvedAt || 0) - new Date(a[1].approvedAt || 0));

    const totalRev     = activated.reduce((s, [, t]) => s + (t.price || 0), 0);
    const directRev    = activated.filter(([, t]) => !t.resellerId).reduce((s, [, t]) => s + (t.price || 0), 0);
    const resellerRev  = totalRev - directRev;
    const thisMonth    = activated.filter(([, t]) => {
      const d = new Date(t.approvedAt); const n = new Date();
      return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
    }).reduce((s, [, t]) => s + (t.price || 0), 0);
    const avgSale      = activated.length ? totalRev / activated.length : 0;

    _set('rev-total',          sym + totalRev.toFixed(2));
    _set('rev-direct-total',   sym + directRev.toFixed(2));
    _set('rev-reseller-total', sym + resellerRev.toFixed(2));
    _set('rev-month-total',    sym + thisMonth.toFixed(2));
    _set('rev-avg-sale',       sym + avgSale.toFixed(2));
    _set('rev-count',          activated.length + ' sales');
    _renderGoal(thisMonth);

    // ── Per-product breakdown ────────────────────────────────────────────────
    const wrap = document.getElementById('rev-breakdown');
    if (!wrap) return;

    if (!activated.length) {
      wrap.innerHTML = '<div class="empty">No revenue yet. Activate your first customer to start tracking.</div>';
      return;
    }

    // Group by product
    const byProd = {};
    activated.forEach(([tok, t]) => {
      const pid = t.productId || 'unknown';
      if (!byProd[pid]) byProd[pid] = { name: t.productName || pid, total: 0, count: 0, items: [] };
      byProd[pid].total += (t.price || 0);
      byProd[pid].count++;
      byProd[pid].items.push([tok, t]);
    });

    // Monthly trend — last 6 months
    const trendHtml = _monthlyTrend(activated);

    wrap.innerHTML = trendHtml + Object.entries(byProd).map(([pid, g]) => {
      const prod  = products.find(p => p.id === pid);
      const color = prod ? (prod.color || '#2563eb') : '#6366f1';
      const pct   = totalRev > 0 ? (g.total / totalRev * 100) : 0;
      const rows  = g.items.slice(0, 8).map(([, t]) => `
        <div class="rev-row">
          <span class="rev-row-name">${esc(t.customerName)}</span>
          <span class="rev-row-pkg">${esc(t.packageType)}</span>
          <span class="rev-row-date">${t.approvedAt ? fmt(t.approvedAt) : '—'}</span>
          <span class="rev-row-price" style="color:${color}">${t.currencySymbol || sym}${(t.price||0).toFixed(2)}</span>
        </div>`).join('');

      return `<div class="rev-product-block">
        <div class="rev-product-header">
          <div style="display:flex;align-items:center;gap:.6rem">
            <div style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0"></div>
            <span class="rev-product-name">${esc(g.name)}</span>
            <span class="rev-count">${g.count} sale${g.count !== 1 ? 's' : ''}</span>
          </div>
          <span class="rev-product-total" style="color:${color}">${sym}${g.total.toFixed(2)}</span>
        </div>
        <div class="rev-bar-wrap">
          <div class="rev-bar"><div class="rev-bar-fill" style="width:${pct.toFixed(1)}%;background:${color}"></div></div>
          <span class="rev-bar-pct">${pct.toFixed(0)}%</span>
        </div>
        ${rows}
        ${g.items.length > 8 ? `<div style="font-size:.7rem;color:var(--muted);padding:.3rem 0">+ ${g.items.length - 8} more…</div>` : ''}
      </div>`;
    }).join('');
  };

  const _monthlyTrend = (activated) => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ label: d.toLocaleDateString('en-GB', { month: 'short' }), year: d.getFullYear(), month: d.getMonth(), total: 0, count: 0 });
    }
    activated.forEach(([, t]) => {
      if (!t.approvedAt) return;
      const d = new Date(t.approvedAt);
      const m = months.find(x => x.month === d.getMonth() && x.year === d.getFullYear());
      if (m) { m.total += (t.price || 0); m.count++; }
    });
    const max = Math.max(...months.map(m => m.total), 1);
    const sym = _sym();
    const bars = months.map(m => {
      const h = Math.max(4, Math.round((m.total / max) * 80));
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:.3rem;flex:1">
        <div style="font-size:.63rem;color:var(--muted);font-family:'JetBrains Mono',monospace">${m.total > 0 ? sym + m.total.toFixed(0) : ''}</div>
        <div style="width:100%;background:${m.total > 0 ? 'var(--blue)' : 'var(--border)'};border-radius:4px 4px 0 0;height:${h}px;transition:height .4s;opacity:${m.total > 0 ? 1 : 0.4}" title="${sym}${m.total.toFixed(2)} · ${m.count} sales"></div>
        <div style="font-size:.65rem;color:var(--muted2)">${m.label}</div>
      </div>`;
    }).join('');
    return `<div class="card" style="margin-bottom:1.2rem">
      <div class="card-title">Monthly Revenue Trend</div>
      <div style="display:flex;align-items:flex-end;gap:.4rem;height:110px;padding:.5rem 0">${bars}</div>
    </div>`;
  };

  const _set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  // ── Monthly goal tracker ──────────────────────────────────────────────────
  const _goalKey = 'dtc-monthly-goal';

  const _loadGoal = () => {
    try { return parseFloat(localStorage.getItem(_goalKey)) || 0; } catch { return 0; }
  };

  const _renderGoal = (thisMonth) => {
    const goal    = _loadGoal();
    const sym     = _sym();
    const symEl   = document.getElementById('rev-goal-sym');
    const inputEl = document.getElementById('rev-goal-input');
    const barWrap = document.getElementById('rev-goal-bar-wrap');
    const hintEl  = document.getElementById('rev-goal-hint');
    if (symEl)   symEl.textContent  = sym;
    if (inputEl && !inputEl.value)  inputEl.value = goal || '';

    if (!goal || goal <= 0) {
      if (barWrap) barWrap.style.display = 'none';
      if (hintEl)  hintEl.textContent = 'No goal set yet.';
      return;
    }

    const pct       = Math.min(100, (thisMonth / goal) * 100);
    const remaining = goal - thisMonth;
    const isHit     = thisMonth >= goal;

    if (barWrap) barWrap.style.display = '';
    const fillEl = document.getElementById('rev-goal-fill');
    if (fillEl) {
      fillEl.style.width      = pct.toFixed(1) + '%';
      fillEl.style.background = isHit ? 'var(--success)' : pct > 75 ? '#f59e0b' : 'var(--blue)';
    }

    _set('rev-goal-pct',       pct.toFixed(0) + '%' + (isHit ? ' 🎉' : ''));
    _set('rev-goal-label',     isHit ? '🎉 Goal reached this month!' : 'This month vs goal');
    _set('rev-goal-current',   sym + thisMonth.toFixed(2) + ' earned');
    _set('rev-goal-remaining', isHit ? '' : sym + remaining.toFixed(2) + ' to go');

    // Daily run-rate hint
    const now      = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysPassed  = now.getDate();
    const daysLeft    = daysInMonth - daysPassed;
    if (hintEl && daysLeft > 0 && !isHit) {
      const needed = remaining / daysLeft;
      hintEl.textContent = sym + needed.toFixed(2) + '/day needed in ' + daysLeft + ' days remaining';
    } else if (hintEl && isHit) {
      hintEl.textContent = '✓ Monthly goal achieved!';
    }
  };

  const updateGoal = (val) => {
    // Live preview as user types
    const tokens   = Store.tokens || {};
    const thisMonth = Object.values(tokens)
      .filter(t => { if (!t.approved || !t.price) return false; const d = new Date(t.approvedAt), n = new Date(); return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear(); })
      .reduce((s, t) => s + (t.price || 0), 0);
    try { localStorage.setItem(_goalKey, val); } catch {}
    _renderGoal(thisMonth);
  };

  const saveGoal = () => {
    const val = parseFloat(document.getElementById('rev-goal-input')?.value) || 0;
    try { localStorage.setItem(_goalKey, val); } catch {}
    const hintEl = document.getElementById('rev-goal-hint');
    if (hintEl) { hintEl.textContent = '✓ Goal saved!'; setTimeout(() => { updateGoal(val); }, 1500); }
  };

  return { render, updateGoal, saveGoal };
})();
