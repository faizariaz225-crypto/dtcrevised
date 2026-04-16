/* ─── DTC Admin — Resellers Module (Registry + Performance) ─────────────── */
'use strict';

const Resellers = (() => {

  let _registryData = [];
  let _currentTab   = 'registry';
  let _editingId    = null;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const _sym = () => (Store.settings || {}).currencySymbol || '$';
  const _fmt = n   => _sym() + (n || 0).toFixed(2);
  const _set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  const _api = (path, body) => {
    if (body) return fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminKey: Store.adminKey, ...body })
    }).then(r => r.json());
    return fetch(path + '?adminKey=' + encodeURIComponent(Store.adminKey)).then(r => r.json());
  };

  // ── Main render ───────────────────────────────────────────────────────────
  const render = async () => {
    await _loadData();
    _renderStats();
    _renderActiveTab();
    _populateDropdown();
  };

  const _loadData = async () => {
    try {
      const d = await _api('/admin/resellers');
      _registryData = (d && d.resellers) ? d.resellers : [];
    } catch { _registryData = []; }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const _renderStats = () => {
    const tokens   = Store.tokens || {};
    const allOk    = Object.values(tokens).filter(t => t.approved && t.price);
    const resSales = allOk.filter(t => t.resellerId);
    const resRev   = resSales.reduce((s, t) => s + (t.price || 0), 0);
    const dirRev   = allOk.filter(t => !t.resellerId).reduce((s, t) => s + (t.price || 0), 0);
    const total    = resRev + dirRev;
    _set('reseller-total',      _fmt(resRev));
    _set('direct-total',        _fmt(dirRev));
    _set('reseller-sale-count', resSales.length + ' sales');
    _set('reseller-count',      _registryData.filter(r => !r._tokenOnly).length + ' registered');
    _set('reseller-pct',        total > 0 ? (resRev / total * 100).toFixed(0) + '% of revenue' : '0%');
  };

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const setTab = (tab, btn) => {
    _currentTab = tab;
    document.querySelectorAll('#page-resellers .fb').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    const regEl  = document.getElementById('reseller-tab-registry');
    const perfEl = document.getElementById('reseller-tab-performance');
    if (regEl)  regEl.style.display  = tab === 'registry'    ? '' : 'none';
    if (perfEl) perfEl.style.display = tab === 'performance' ? '' : 'none';
    _renderActiveTab();
  };

  const _renderActiveTab = () => {
    if (_currentTab === 'registry')    _renderRegistry();
    if (_currentTab === 'performance') _renderPerformance();
  };

  // ── Registry tab ─────────────────────────────────────────────────────────
  const _renderRegistry = () => {
    const wrap = document.getElementById('reseller-registry-list');
    if (!wrap) return;
    if (!_registryData.length) {
      wrap.innerHTML = '<div class="empty">No resellers yet. Click <strong>＋ Add Reseller</strong> to create the first one.</div>';
      return;
    }
    wrap.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:.8rem">' +
      _registryData.map(r => _buildCard(r)).join('') +
      '</div>';
  };

  const _buildCard = (r) => {
    const susp = r.status === 'suspended';
    const tOnly = r._tokenOnly;
    const s   = r.stats || { sales: 0, revenue: 0, active: 0 };
    const sc  = susp ? 'var(--error)'        : 'var(--success)';
    const sb  = susp ? 'var(--error-bg)'     : 'var(--success-bg)';
    const sbr = susp ? 'var(--error-border)' : 'var(--success-border)';
    const sl  = susp ? '⊘ Suspended'         : '✓ Active';
    const ap  = (r.allowedProducts && r.allowedProducts.length) ? r.allowedProducts.join(', ') : 'All products';
    const eid = esc(r.id);
    const en  = esc(r.name);

    // Build action buttons as separate strings to avoid any nesting issues
    let actionBtns = '';
    if (tOnly) {
      actionBtns = '<button class="btn btn-primary btn-sm" onclick="Resellers.addToRegistry(\'' + eid + '\',\'' + en + '\')">＋ Add to Registry</button>';
    } else {
      actionBtns =
        '<button class="btn btn-outline btn-sm" onclick="Resellers.openModal(\'' + eid + '\')">✏ Edit</button>' +
        '<button class="btn btn-outline btn-sm" onclick="Resellers.suspend(\'' + eid + '\')">' + (susp ? '▶ Activate' : '⊘ Suspend') + '</button>' +
        '<button class="btn btn-ghost-red btn-sm" onclick="Resellers.deleteReseller(\'' + eid + '\')">🗑</button>';
    }
    actionBtns +=
      '<button class="btn btn-ghost-blue btn-sm" onclick="Resellers.filterByReseller(\'' + eid + '\')">🔍 Links</button>' +
      '<button class="btn btn-outline btn-sm" onclick="Resellers.copyId(\'' + eid + '\')">📋 Copy ID</button>';

    const wechatCountry = (r.wechat || r.country)
      ? '<div style="font-size:.7rem;color:var(--muted);margin-bottom:.65rem">' +
          (r.wechat  ? '💬 ' + esc(r.wechat)  : '') +
          (r.country ? (r.wechat ? '  ·  ' : '') + '🌍 ' + esc(r.country) : '') +
        '</div>'
      : '';

    const notesHtml = r.notes
      ? '<div style="font-size:.7rem;color:var(--muted);background:#f8fafc;border-radius:6px;padding:.4rem .6rem;margin-bottom:.75rem;line-height:1.5">' + esc(r.notes) + '</div>'
      : '';

    const tokenOnlyBadge = tOnly
      ? '<div style="font-size:.62rem;color:var(--warn);margin-top:.2rem">⚠ Token-only — not in registry</div>'
      : '';

    return '<div style="background:var(--white);border:1px solid var(--border);border-radius:12px;padding:1rem 1.1rem' + (susp ? ';opacity:.72' : '') + '">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:.5rem;margin-bottom:.75rem">' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:.92rem;font-weight:700;color:var(--text)">' + en + '</div>' +
          '<div style="font-size:.68rem;color:var(--muted);font-family:\'JetBrains Mono\',monospace;margin-top:.15rem">' + eid + '</div>' +
          tokenOnlyBadge +
        '</div>' +
        '<span style="font-size:.65rem;font-weight:600;padding:.2rem .55rem;border-radius:99px;white-space:nowrap;background:' + sb + ';border:1px solid ' + sbr + ';color:' + sc + '">' + sl + '</span>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.4rem .7rem;margin-bottom:.75rem">' +
        '<div><div style="font-size:.57rem;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--muted2);margin-bottom:.15rem">Commission</div><div style="font-size:.82rem;font-weight:700;color:var(--text)">' + (r.commissionRate || 0) + '%</div></div>' +
        '<div><div style="font-size:.57rem;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--muted2);margin-bottom:.15rem">Revenue</div><div style="font-size:.82rem;font-weight:700;color:var(--text)">' + _sym() + (s.revenue || 0).toFixed(2) + '</div></div>' +
        '<div><div style="font-size:.57rem;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--muted2);margin-bottom:.15rem">Sales</div><div style="font-size:.82rem;color:var(--text)">' + (s.sales || 0) + '</div></div>' +
        '<div><div style="font-size:.57rem;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--muted2);margin-bottom:.15rem">Active subs</div><div style="font-size:.82rem;color:var(--text)">' + (s.active || 0) + '</div></div>' +
      '</div>' +
      wechatCountry +
      '<div style="font-size:.68rem;color:var(--muted);margin-bottom:' + (r.notes ? '.5rem' : '.75rem') + '"><span style="font-weight:600">Products:</span> ' + esc(ap) + '</div>' +
      notesHtml +
      '<div style="display:flex;gap:.3rem;flex-wrap:wrap;border-top:1px solid var(--border);padding-top:.65rem">' +
        actionBtns +
      '</div>' +
    '</div>';
  };

  // ── Performance tab ───────────────────────────────────────────────────────
  const _renderPerformance = () => {
    const wrap   = document.getElementById('reseller-breakdown');
    if (!wrap) return;
    const tokens = Store.tokens || {};
    const sym    = _sym();
    const allOk  = Object.entries(tokens).filter(([, t]) => t.approved && t.price);
    const resSales = allOk.filter(([, t]) => t.resellerId);
    const totalRev = allOk.reduce((s, [, t]) => s + (t.price || 0), 0);

    const byR = {};
    resSales.forEach(([, t]) => {
      const rid = t.resellerId;
      if (!byR[rid]) byR[rid] = { name: t.resellerName || rid, total: 0, count: 0, items: [] };
      byR[rid].total += (t.price || 0);
      byR[rid].count++;
      byR[rid].items.push(t);
    });

    const sorted = Object.entries(byR).sort((a, b) => b[1].total - a[1].total);
    if (!sorted.length) {
      wrap.innerHTML = '<div class="empty">No reseller sales yet.</div>';
      return;
    }

    const maxRev = Math.max(...sorted.map(([, r]) => r.total), 1);
    const rankColors = ['#f59e0b', '#94a3b8', '#cd7c54'];

    wrap.innerHTML = sorted.map(([rid, r], i) => {
      const pct    = (r.total / maxRev * 100).toFixed(1);
      const share  = totalRev > 0 ? (r.total / totalRev * 100).toFixed(0) : 0;
      const avg    = r.count > 0 ? r.total / r.count : 0;
      const recent = [...r.items].sort((a, b) => new Date(b.approvedAt || 0) - new Date(a.approvedAt || 0)).slice(0, 6);
      const rc     = rankColors[i] || 'var(--muted2)';
      const reg    = _registryData.find(re => re.id === rid);
      const rate   = reg ? reg.commissionRate : 0;
      const commStr = rate > 0 ? ('· est. ' + sym + (r.total * rate / 100).toFixed(2) + ' commission') : '';

      const rows = recent.map(t =>
        '<div class="reseller-sale-row">' +
          '<span class="rs-name">' + esc(t.customerName) + '</span>' +
          '<span class="rs-pkg">' + esc(t.packageType) + '</span>' +
          '<span class="rs-date">' + (t.approvedAt ? fmt(t.approvedAt) : '—') + '</span>' +
          '<span class="rs-price">' + (t.currencySymbol || sym) + (t.price || 0).toFixed(2) + '</span>' +
        '</div>'
      ).join('');

      const rankBadge =
        '<div style="width:28px;height:28px;border-radius:50%;background:' + rc + '20;border:1.5px solid ' + rc + ';display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:700;color:' + rc + ';flex-shrink:0">' +
          (i + 1) +
        '</div>';

      const badges =
        '<span style="font-size:.65rem;background:var(--blue-light);border:1px solid var(--blue-mid);border-radius:4px;padding:.1rem .45rem;color:var(--blue);font-weight:600">' + r.count + ' sale' + (r.count !== 1 ? 's' : '') + '</span>' +
        '<span style="font-size:.65rem;background:var(--success-bg);border:1px solid var(--success-border);border-radius:4px;padding:.1rem .45rem;color:var(--success);font-weight:600">' + share + '% of total</span>' +
        '<span style="font-size:.65rem;background:#f8fafc;border:1px solid var(--border);border-radius:4px;padding:.1rem .45rem;color:var(--muted);font-weight:600">avg ' + sym + avg.toFixed(2) + '</span>' +
        (rate > 0 ? '<span style="font-size:.65rem;background:#f0fdf4;border:1px solid var(--success-border);border-radius:4px;padding:.1rem .45rem;color:var(--success);font-weight:600">' + rate + '% commission</span>' : '');

      return '<div class="reseller-card">' +
        '<div class="reseller-header">' +
          '<div style="display:flex;align-items:flex-start;gap:.8rem">' +
            rankBadge +
            '<div>' +
              '<div class="reseller-name">' + esc(r.name) + '</div>' +
              '<div class="reseller-id">ID: ' + esc(rid) + '</div>' +
              '<div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.4rem">' + badges + '</div>' +
            '</div>' +
          '</div>' +
          '<div style="text-align:right">' +
            '<div class="reseller-revenue">' + sym + r.total.toFixed(2) + '</div>' +
            (commStr ? '<div style="font-size:.68rem;color:var(--success)">' + commStr + '</div>' : '') +
          '</div>' +
        '</div>' +
        '<div style="margin:.7rem 0 .8rem">' +
          '<div style="display:flex;justify-content:space-between;font-size:.63rem;color:var(--muted);margin-bottom:.3rem"><span>Revenue share</span><span>' + pct + '%</span></div>' +
          '<div style="height:5px;background:var(--border);border-radius:3px;overflow:hidden"><div style="height:100%;width:' + pct + '%;background:var(--blue);border-radius:3px;transition:width .4s"></div></div>' +
        '</div>' +
        (rows.length ? '<div class="reseller-sales">' + rows + (r.count > 6 ? '<div style="font-size:.68rem;color:var(--muted);padding:.35rem 0">+ ' + (r.count - 6) + ' more</div>' : '') + '</div>' : '') +
        '<div style="margin-top:.8rem;padding-top:.7rem;border-top:1px solid var(--border);display:flex;gap:.35rem;flex-wrap:wrap">' +
          '<button class="btn btn-outline btn-sm" onclick="Resellers.copyId(\'' + esc(rid) + '\')">📋 Copy ID</button>' +
          '<button class="btn btn-ghost-blue btn-sm" onclick="Resellers.filterByReseller(\'' + esc(rid) + '\')">🔍 View links</button>' +
        '</div>' +
      '</div>';
    }).join('');
  };

  // ── Modal ─────────────────────────────────────────────────────────────────
  const openModal = (id) => {
    _editingId = id || null;
    const modal = document.getElementById('reseller-modal');
    if (!modal) return;

    // Populate product checkboxes
    const products = Array.isArray(Store.products) ? Store.products : [];
    const pWrap    = document.getElementById('rm-products-wrap');
    if (pWrap) {
      if (!products.length) {
        pWrap.innerHTML = '<span style="font-size:.72rem;color:var(--muted)">No products configured yet</span>';
      } else {
        pWrap.innerHTML = products.map(p =>
          '<label style="display:flex;align-items:center;gap:.3rem;font-size:.75rem;cursor:pointer;padding:.25rem .5rem;border-radius:5px;background:#f8fafc;border:1px solid var(--border)">' +
            '<input type="checkbox" value="' + esc(p.id) + '" class="rm-prod-chk" style="margin:0"/> ' + esc(p.name) +
          '</label>'
        ).join('');
      }
    }

    // Disable ID field when editing
    const idEl = document.getElementById('rm-id');
    if (idEl) idEl.disabled = !!id;

    document.getElementById('reseller-modal-title').textContent = id ? 'Edit Reseller' : 'Add Reseller';

    // Clear all fields first
    ['rm-id','rm-name','rm-commission','rm-wechat','rm-country','rm-notes'].forEach(fid => {
      const el = document.getElementById(fid);
      if (el) el.value = '';
    });

    // If editing, fill with existing data
    if (id) {
      const r = _registryData.find(x => x.id === id);
      if (r) {
        if (document.getElementById('rm-id'))         document.getElementById('rm-id').value         = r.id;
        if (document.getElementById('rm-name'))       document.getElementById('rm-name').value       = r.name;
        if (document.getElementById('rm-commission')) document.getElementById('rm-commission').value = r.commissionRate || '';
        if (document.getElementById('rm-wechat'))     document.getElementById('rm-wechat').value     = r.wechat || '';
        if (document.getElementById('rm-country'))    document.getElementById('rm-country').value    = r.country || '';
        if (document.getElementById('rm-notes'))      document.getElementById('rm-notes').value      = r.notes || '';
        document.querySelectorAll('.rm-prod-chk').forEach(c => {
          c.checked = (r.allowedProducts || []).includes(c.value);
        });
      }
    }

    const errEl = document.getElementById('rm-err');
    if (errEl) errEl.style.display = 'none';

    modal.style.display = 'flex';
    setTimeout(() => {
      const n = document.getElementById('rm-name');
      if (n) n.focus();
    }, 50);
  };

  const closeModal = () => {
    const m = document.getElementById('reseller-modal');
    if (m) m.style.display = 'none';
    _editingId = null;
  };

  const saveModal = async () => {
    const errEl   = document.getElementById('rm-err');
    const saveBtn = document.getElementById('rm-save-btn');
    const showErr = (msg) => { errEl.textContent = msg; errEl.style.display = 'block'; };
    errEl.style.display = 'none';

    const id   = (document.getElementById('rm-id').value   || '').trim().toLowerCase();
    const name = (document.getElementById('rm-name').value || '').trim();

    if (!id)   { showErr('Reseller ID is required.'); return; }
    if (!name) { showErr('Name is required.'); return; }
    if (!/^[a-z0-9-]+$/.test(id)) { showErr('ID: lowercase letters, numbers, and hyphens only.'); return; }
    if (!_editingId && _registryData.some(r => r.id === id)) { showErr('A reseller with this ID already exists.'); return; }

    const allowedProducts = Array.from(document.querySelectorAll('.rm-prod-chk:checked')).map(c => c.value);

    saveBtn.disabled = true; saveBtn.textContent = 'Saving…';

    try {
      const d = await _api('/admin/resellers/save', {
        reseller: {
          id, name,
          commissionRate:  parseFloat(document.getElementById('rm-commission').value) || 0,
          allowedProducts,
          wechat:  (document.getElementById('rm-wechat').value  || '').trim(),
          country: (document.getElementById('rm-country').value || '').trim(),
          notes:   (document.getElementById('rm-notes').value   || '').trim(),
          status: 'active',
        }
      });
      if (d && d.success) {
        closeModal();
        await render();
      } else {
        showErr(d.error || 'Save failed.');
      }
    } catch { showErr('Network error.'); }

    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Reseller';
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const suspend = async (id) => {
    const d = await _api('/admin/resellers/suspend', { id });
    if (d && d.success) await render(); else alert(d.error || 'Failed.');
  };

  const deleteReseller = async (id) => {
    if (!confirm('Remove "' + id + '" from the registry?\n\nHistorical sales data is kept.')) return;
    const d = await _api('/admin/resellers/delete', { id });
    if (d && d.success) await render(); else alert(d.error || 'Failed.');
  };

  const addToRegistry = (id, name) => {
    openModal(null);
    setTimeout(() => {
      const idEl = document.getElementById('rm-id');
      const nmEl = document.getElementById('rm-name');
      if (idEl) { idEl.value = id; idEl.disabled = false; }
      if (nmEl) nmEl.value = name;
    }, 60);
  };

  const copyId = (rid) => {
    navigator.clipboard.writeText(rid).then(() => alert('✓ Reseller ID copied: ' + rid));
  };

  const filterByReseller = (rid) => {
    sessionStorage.setItem('dtc-reseller-filter', rid);
    const dashNav = document.querySelector('.nav-item[onclick*="dashboard"]');
    if (dashNav) Shell.navigate('dashboard', dashNav);
  };

  // ── Generate-form dropdown ────────────────────────────────────────────────
  const _populateDropdown = () => {
    const sel = document.getElementById('gen-reseller-select');
    if (!sel) return;
    const prev   = sel.value;
    const active = _registryData.filter(r => r.status !== 'suspended' && !r._tokenOnly);
    sel.innerHTML = '<option value="">— No reseller (direct sale) —</option>' +
      active.map(r =>
        '<option value="' + esc(r.id) + '" data-name="' + esc(r.name) + '" data-rate="' + (r.commissionRate || 0) + '">' +
          esc(r.name) + ' (' + esc(r.id) + ')' +
        '</option>'
      ).join('');
    if (prev) sel.value = prev;
  };

  const getSelectedReseller = () => {
    const manual = document.getElementById('gen-reseller-manual-toggle');
    if (manual && manual.checked) {
      return {
        resellerId:   (document.getElementById('gen-reseller-id')   || {}).value.trim() || null,
        resellerName: (document.getElementById('gen-reseller-name') || {}).value.trim() || null,
      };
    }
    const sel = document.getElementById('gen-reseller-select');
    if (!sel || !sel.value) return { resellerId: null, resellerName: null };
    const opt = sel.selectedOptions[0];
    return { resellerId: opt.value, resellerName: opt.dataset.name || '' };
  };

  return {
    render, setTab,
    openModal, closeModal, saveModal,
    suspend, deleteReseller, addToRegistry, copyId, filterByReseller,
    getSelectedReseller,
    populateDropdown: _populateDropdown
  };
})();
