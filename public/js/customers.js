/* ─── DTC Admin — Customers Module ──────────────────────────────────────── */
'use strict';

const Customers = (() => {

  const render = () => {
    const filter    = Store.custFilter;
    const activated = Object.entries(Store.tokens)
      .filter(([, t]) => t.approved && t.email)
      .sort((a, b) => daysUntil(a[1].subscriptionExpiresAt || '9999') - daysUntil(b[1].subscriptionExpiresAt || '9999'));

    // Update expiring-soon badge
    const expiring = activated.filter(([, t]) => {
      const d = daysUntil(t.subscriptionExpiresAt || '9999');
      return d >= 0 && d <= 30;
    }).length;
    const nb = document.getElementById('nb-exp');
    if (nb) { nb.textContent = expiring; nb.style.display = expiring > 0 ? '' : 'none'; }

    const filtered = activated.filter(([, t]) => {
      if (filter === 'all')      return true;
      const st = getSubStatus(t);
      if (filter === 'active')   return st === 'ok';
      if (filter === 'expiring') return st === 'soon' || st === 'danger';
      if (filter === 'expired')  return st === 'expired';
      return true;
    });

    const wrap = document.getElementById('cust-list');
    if (!filtered.length) {
      wrap.innerHTML = '<div class="empty">No customers match this filter.</div>';
      return;
    }

    wrap.innerHTML = filtered.map(([token, t]) => _compactCard(token, t)).join('');
  };

  // ── Compact card — name + essentials only, Edit opens full detail modal ──
  const _compactCard = (token, t) => {
    const subSt   = getSubStatus(t);
    const days    = t.subscriptionExpiresAt ? daysUntil(t.subscriptionExpiresAt) : null;
    const total   = t.subscriptionDays || 30;
    const elapsed = total - (days || 0);
    const pct     = Math.min(100, Math.max(0, (elapsed / total) * 100));
    const barColor= subSt === 'expired' || subSt === 'danger' ? '#dc2626' : subSt === 'soon' ? '#d97706' : '#16a34a';

    const statusBadge = days === null ? ''
      : days < 0   ? `<span class="badge b-exp">✕ Expired</span>`
      : days <= 5  ? `<span class="badge" style="background:#fef2f2;border:1px solid #fecaca;color:#dc2626">⚠ ${days}d left</span>`
      : days <= 30 ? `<span class="badge" style="background:#fffbeb;border:1px solid #fde68a;color:#d97706">⏰ ${days}d left</span>`
      :              `<span class="badge b-act">✓ ${days}d left</span>`;

    const prodTag = t.product === 'chatgpt'
      ? `<span class="prod-tag prod-chatgpt">ChatGPT</span>`
      : `<span class="prod-tag prod-claude">Claude</span>`;

    const cardCls = 'cust-card' + (subSt === 'soon' || subSt === 'danger' ? ' expiring' : subSt === 'expired' ? ' expired-sub' : '');
    const notes   = t.notes ? `<div style="font-size:.68rem;color:var(--muted);background:#f8fafc;border-radius:5px;padding:.3rem .55rem;margin-top:.45rem;line-height:1.45">${esc(t.notes)}</div>` : '';

    return `<div class="${cardCls}">
      <!-- Top row: name + status -->
      <div class="cust-top" style="margin-bottom:.5rem">
        <div style="display:flex;align-items:center;gap:.45rem;flex-wrap:wrap">
          ${prodTag}
          <div class="cust-nm">${esc(t.customerName)}</div>
        </div>
        <div>${statusBadge}</div>
      </div>

      <!-- Compact key details: package · email · wechat -->
      <div style="font-size:.72rem;color:var(--muted);line-height:1.7;margin-bottom:.5rem">
        <div>${esc(t.packageType || '—')}</div>
        <div style="display:flex;gap:1rem;flex-wrap:wrap">
          ${t.email  ? `<span>✉ ${esc(t.email)}</span>`  : ''}
          ${t.wechat ? `<span>💬 ${esc(t.wechat)}</span>` : ''}
        </div>
      </div>

      ${notes}

      <!-- Slim progress bar -->
      <div style="margin:.55rem 0 .65rem">
        <div style="display:flex;justify-content:space-between;font-size:.62rem;color:var(--muted);margin-bottom:.28rem">
          <span>Period used</span>
          <span>${Math.round(pct)}%</span>
        </div>
        <div class="exp-bar">
          <div class="exp-bar-fill" style="width:${pct}%;background:${barColor}"></div>
        </div>
      </div>

      <!-- Actions row -->
      <div style="display:flex;gap:.4rem;flex-wrap:wrap;align-items:center">
        <button class="btn btn-outline btn-sm" onclick="EditCustomer.open('${token}')">✏ Edit / Details</button>
        <button class="btn btn-ghost-blue btn-sm" onclick="Customers.sendReminder('${token}', 'reminder')">📧 Reminder</button>
        <button class="btn btn-outline btn-sm" style="border-color:var(--error-border);color:var(--error)" onclick="Customers.sendReminder('${token}', 'expired')">📧 Expiry</button>
      </div>
    </div>`;
  };

  const setFilter = (f, btn) => {
    Store.setCustFilter(f);
    document.querySelectorAll('#cf .fb').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    render();
  };

  const sendReminder = async (token, type) => {
    const d = await api('/admin/send-reminder', { adminKey: Store.adminKey, token, type });
    alert(d && d.ok ? '✓ Email sent successfully.' : '✕ Failed: ' + (d && d.error));
    if (d && d.ok) Dashboard.reload();
  };

  return { render, setFilter, sendReminder };
})();
