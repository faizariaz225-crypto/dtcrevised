/* ─── DTC Admin — Settings Module (currency, activation email) ───────────── */
'use strict';

const Settings = (() => {
  const CURRENCIES = [
    { code:'USD', symbol:'$',  name:'US Dollar'       },
    { code:'CNY', symbol:'¥',  name:'Chinese Yuan'    },
    { code:'EUR', symbol:'€',  name:'Euro'            },
    { code:'GBP', symbol:'£',  name:'British Pound'   },
    { code:'AED', symbol:'د.إ',name:'UAE Dirham'      },
    { code:'SAR', symbol:'﷼',  name:'Saudi Riyal'     },
    { code:'PKR', symbol:'₨',  name:'Pakistani Rupee' },
    { code:'INR', symbol:'₹',  name:'Indian Rupee'    },
    { code:'MYR', symbol:'RM', name:'Malaysian Ringgit'},
    { code:'SGD', symbol:'S$', name:'Singapore Dollar' },
    { code:'TRY', symbol:'₺',  name:'Turkish Lira'    },
    { code:'CAD', symbol:'C$', name:'Canadian Dollar'  },
    { code:'AUD', symbol:'A$', name:'Australian Dollar'},
  ];

  const load = async () => {
    const d = await api(`/admin/settings?adminKey=${encodeURIComponent(Store.adminKey)}`);
    if (!d || d.error) return;
    Store.setSettings(d);
    _renderCurrencyDropdown(d.currency);
    _renderActivationTemplateDropdown(d.activationEmailTemplateId);
    _updateCurrencyPreview(d);
  };

  const _renderCurrencyDropdown = (currentCode) => {
    const sel = document.getElementById('currency-select');
    if (!sel) return;
    sel.innerHTML = CURRENCIES.map(c =>
      `<option value="${c.code}" ${c.code === currentCode ? 'selected' : ''}>${c.symbol} ${c.name} (${c.code})</option>`
    ).join('');
  };

  const _renderActivationTemplateDropdown = (currentId) => {
    const sel = document.getElementById('activation-template-select');
    if (!sel) return;
    const templates = Store.templates || [];
    sel.innerHTML = '<option value="">— No auto email —</option>' +
      templates.map(t =>
        `<option value="${t.id}" ${t.id === currentId ? 'selected' : ''}>${esc(t.name)}</option>`
      ).join('');
  };

  const _updateCurrencyPreview = (settings) => {
    const el = document.getElementById('currency-preview');
    if (!el) return;
    const c = CURRENCIES.find(x => x.code === (settings.currency || 'USD')) || CURRENCIES[0];
    el.textContent = `Example: ${c.symbol}29.99`;
  };

  const save = async () => {
    const currCode = document.getElementById('currency-select')?.value || 'USD';
    const tmplId   = document.getElementById('activation-template-select')?.value || '';
    const c = CURRENCIES.find(x => x.code === currCode) || CURRENCIES[0];
    const settings = {
      currency:                   c.code,
      currencySymbol:             c.symbol,
      currencyName:               c.name,
      activationEmailTemplateId:  tmplId,
    };
    const d = await api('/admin/settings', { adminKey: Store.adminKey, settings });
    showMsg('settings-ok', 'settings-err', d && d.success,
      d && d.success ? '✓ Settings saved.' : 'Failed to save.');
    if (d && d.success) {
      Store.setSettings({ ...(Store.settings || {}), ...settings });
      _updateCurrencyPreview(settings);
    }
  };

  // Populate template dropdown when templates are loaded
  const refreshTemplateDropdown = () => {
    const current = (Store.settings || {}).activationEmailTemplateId || '';
    _renderActivationTemplateDropdown(current);
  };

  const loadBackups = async () => {
    const wrap = document.getElementById('backup-list');
    if (!wrap) return;
    wrap.innerHTML = '<div style="font-size:.78rem;color:var(--muted)">Loading…</div>';
    try {
      const d = await fetch('/admin/backups?adminKey=' + encodeURIComponent(Store.adminKey)).then(r => r.json());
      const backups = (d && d.backups) || [];
      if (!backups.length) {
        wrap.innerHTML = '<div style="font-size:.78rem;color:var(--muted)">No backups yet. Click "Run Backup Now" to create the first one.</div>';
        return;
      }
      wrap.innerHTML = '<div style="display:flex;flex-direction:column;gap:.4rem">' +
        backups.map(b => {
          const date = new Date(b.createdAt).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
          const kb   = (b.size / 1024).toFixed(1);
          return '<div style="display:flex;align-items:center;justify-content:space-between;padding:.55rem .8rem;background:var(--white);border:1px solid var(--border);border-radius:8px;gap:.5rem;flex-wrap:wrap">' +
            '<div>' +
              '<div style="font-size:.78rem;font-weight:600;color:var(--text);font-family:\'JetBrains Mono\',monospace">' + b.name.replace('dtc-backup-','').replace('.tar','') + '</div>' +
              '<div style="font-size:.68rem;color:var(--muted);margin-top:.1rem">' + date + ' · ' + kb + ' KB</div>' +
            '</div>' +
            '<button class="btn btn-outline btn-sm" style="color:var(--error);border-color:var(--error-border)" onclick="Settings.restoreBackup(\'' + b.name + '\')">↩ Restore</button>' +
          '</div>';
        }).join('') +
      '</div>';
    } catch {
      wrap.innerHTML = '<div style="font-size:.78rem;color:var(--error)">Failed to load backups.</div>';
    }
  };

  const runBackupNow = async () => {
    const btn = event.target;
    btn.disabled = true; btn.textContent = 'Running…';
    try {
      const d = await fetch('/admin/backups/run-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminKey: Store.adminKey })
      }).then(r => r.json());
      if (d && d.success) { alert('✓ Backup created successfully.'); loadBackups(); }
      else alert('Backup failed.');
    } catch { alert('Network error.'); }
    btn.disabled = false; btn.textContent = '⬇ Run Backup Now';
  };

  const restoreBackup = async (filename) => {
    if (!confirm('Restore backup "' + filename + '"?\n\nThis will REPLACE all current data with the backup. This cannot be undone.\n\nA safety backup of the current state will be created first.')) return;
    try {
      const d = await fetch('/admin/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminKey: Store.adminKey, filename })
      }).then(r => r.json());
      if (d && d.success) {
        alert('✓ Restored ' + d.restored + '. The page will reload.');
        window.location.reload();
      } else {
        alert('Restore failed: ' + (d.error || 'Unknown error'));
      }
    } catch { alert('Network error.'); }
  };

  return { load, save, refreshTemplateDropdown, CURRENCIES, loadBackups, runBackupNow, restoreBackup };
})();
