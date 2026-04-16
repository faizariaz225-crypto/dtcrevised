/* ─── DTC Admin — Import Existing Customer ───────────────────────────────── */
'use strict';

const ImportCustomer = (() => {

  // ── Open modal ─────────────────────────────────────────────────────────────
  const open = () => {
    const modal = document.getElementById('import-customer-modal');
    if (!modal) return;

    // Clear all fields
    ['ic-name','ic-email','ic-wechat','ic-custom-email','ic-price',
     'ic-orgid','ic-portal-link','ic-notes'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    // Default dates — activated today, expires in 30 days
    const today   = new Date();
    const in30    = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const fmt     = d => d.toISOString().slice(0, 10);
    const actEl   = document.getElementById('ic-activated-at');
    const expEl   = document.getElementById('ic-expires-at');
    if (actEl) actEl.value = fmt(today);
    if (expEl) expEl.value = fmt(in30);

    // Wire date change to preview
    if (actEl) actEl.addEventListener('change', _updateDatePreview);
    if (expEl) expEl.addEventListener('change', _updateDatePreview);

    _updateDatePreview();
    _populateProducts();
    _populateResellers();

    const sym = (Store.settings || {}).currencySymbol || '$';
    const symEl = document.getElementById('ic-currency-icon');
    if (symEl) symEl.textContent = sym;

    const errEl = document.getElementById('ic-err');
    if (errEl) errEl.style.display = 'none';

    modal.style.display = 'flex';
    setTimeout(() => {
      const n = document.getElementById('ic-name');
      if (n) n.focus();
    }, 40);
  };

  const close = () => {
    const m = document.getElementById('import-customer-modal');
    if (m) m.style.display = 'none';
  };

  // ── Populate product dropdown ──────────────────────────────────────────────
  const _populateProducts = () => {
    const sel      = document.getElementById('ic-product');
    const products = Array.isArray(Store.products) ? Store.products : [];
    if (!sel) return;
    sel.innerHTML = '<option value="">— Select Product —</option>' +
      products.filter(p => p.active !== false).map(p =>
        `<option value="${esc(p.id)}">${esc(p.name)}</option>`
      ).join('');
    // Reset packages
    const pkgSel = document.getElementById('ic-package');
    if (pkgSel) pkgSel.innerHTML = '<option value="">— Select Package —</option>';
  };

  const onProductChange = () => {
    const productId = document.getElementById('ic-product').value;
    const pkgSel    = document.getElementById('ic-package');
    const products  = Array.isArray(Store.products) ? Store.products : [];
    const product   = products.find(p => p.id === productId);

    pkgSel.innerHTML = '<option value="">— Select Package —</option>';
    if (!product) return;

    product.packages.forEach(pk => {
      const opt = document.createElement('option');
      opt.value       = pk.label;
      opt.textContent = `${pk.label}`;
      opt.dataset.price    = pk.price || '';
      opt.dataset.duration = pk.durationDays || 30;
      pkgSel.appendChild(opt);
    });

    // Show/hide org ID field based on product type
    const orgWrap = document.getElementById('ic-orgid-wrap');
    if (orgWrap) orgWrap.style.display = product.type === 'credentials' ? 'none' : '';
  };

  const onPackageChange = () => {
    const pkgSel  = document.getElementById('ic-package');
    const priceEl = document.getElementById('ic-price');
    const expEl   = document.getElementById('ic-expires-at');
    const actEl   = document.getElementById('ic-activated-at');
    const opt     = pkgSel.selectedOptions[0];
    if (!opt || !opt.value) return;

    // Auto-fill price from package config
    if (opt.dataset.price && priceEl) priceEl.value = opt.dataset.price;

    // Auto-set expiry based on duration
    const duration = parseInt(opt.dataset.duration) || 30;
    const actDate  = actEl && actEl.value ? new Date(actEl.value) : new Date();
    const expDate  = new Date(actDate.getTime() + duration * 24 * 60 * 60 * 1000);
    if (expEl) expEl.value = expDate.toISOString().slice(0, 10);
    _updateDatePreview();
  };

  // ── Populate reseller dropdown ─────────────────────────────────────────────
  const _populateResellers = async () => {
    const sel = document.getElementById('ic-reseller');
    if (!sel) return;
    try {
      const d = await fetch(`/admin/resellers/dropdown?adminKey=${encodeURIComponent(Store.adminKey)}`).then(r => r.json());
      const list = (d && d.resellers) || [];
      sel.innerHTML = '<option value="">— Direct sale —</option>' +
        list.map(r => `<option value="${esc(r.id)}" data-name="${esc(r.name)}">${esc(r.name)} (${esc(r.id)})</option>`).join('');
    } catch { /* silent — reseller dropdown is optional */ }
  };

  // ── Date preview ────────────────────────────────────────────────────────────
  const _updateDatePreview = () => {
    const actEl    = document.getElementById('ic-activated-at');
    const expEl    = document.getElementById('ic-expires-at');
    const preview  = document.getElementById('ic-date-preview');
    if (!actEl || !expEl || !preview) return;

    const act = actEl.value ? new Date(actEl.value) : null;
    const exp = expEl.value ? new Date(expEl.value) : null;
    if (!act || !exp) { preview.style.display = 'none'; return; }

    if (exp <= act) {
      preview.style.background = 'var(--error-bg)';
      preview.style.borderColor = 'var(--error-border)';
      preview.style.color = 'var(--error)';
      preview.textContent = '⚠ Expiry date must be after activation date.';
      preview.style.display = '';
      return;
    }

    const days = Math.round((exp - act) / (1000 * 60 * 60 * 24));
    const now  = new Date();
    const daysLeft = Math.round((exp - now) / (1000 * 60 * 60 * 24));
    const statusStr = daysLeft < 0
      ? `⚠ Already expired ${Math.abs(daysLeft)} days ago`
      : daysLeft === 0 ? '⚠ Expires today'
      : `✓ ${daysLeft} days remaining`;

    preview.style.background  = daysLeft < 0 ? 'var(--warn-bg)'    : 'var(--success-bg)';
    preview.style.borderColor = daysLeft < 0 ? 'var(--warn-border)': 'var(--success-border)';
    preview.style.color       = daysLeft < 0 ? 'var(--warn)'       : 'var(--success)';
    preview.innerHTML = `
      <strong>${days}-day subscription</strong> &nbsp;·&nbsp;
      Activated ${act.toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'})} &nbsp;·&nbsp;
      Expires ${exp.toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'})} &nbsp;·&nbsp;
      ${statusStr}`;
    preview.style.display = '';
  };

  // ── Save / Import ──────────────────────────────────────────────────────────
  const save = async () => {
    const errEl  = document.getElementById('ic-err');
    const saveBtn= document.getElementById('ic-save-btn');
    const showErr = msg => { errEl.textContent = msg; errEl.style.display = 'block'; errEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); };
    errEl.style.display = 'none';

    const name       = (document.getElementById('ic-name').value || '').trim();
    const email      = (document.getElementById('ic-email').value || '').trim();
    const productId  = document.getElementById('ic-product').value;
    const pkgLabel   = document.getElementById('ic-package').value;
    const actDate    = document.getElementById('ic-activated-at').value;
    const expDate    = document.getElementById('ic-expires-at').value;

    if (!name)      { showErr('Customer name is required.'); return; }
    if (!email)     { showErr('Email is required.'); return; }
    if (!productId) { showErr('Please select a product.'); return; }
    if (!pkgLabel)  { showErr('Please select a package.'); return; }
    if (!actDate)   { showErr('Activation date is required.'); return; }
    if (!expDate)   { showErr('Subscription expiry date is required.'); return; }
    if (new Date(expDate) <= new Date(actDate)) { showErr('Expiry date must be after activation date.'); return; }

    // Reseller
    const resSel   = document.getElementById('ic-reseller');
    const resOpt   = resSel && resSel.selectedOptions[0];
    const resellerId   = resOpt && resOpt.value ? resOpt.value : undefined;
    const resellerName = resOpt && resOpt.value ? resOpt.dataset.name : undefined;

    saveBtn.disabled = true; saveBtn.textContent = 'Importing…';

    try {
      const d = await api('/admin/import-customer', {
        adminKey:              Store.adminKey,
        customerName:          name,
        email,
        wechat:                (document.getElementById('ic-wechat').value || '').trim(),
        customEmail:           (document.getElementById('ic-custom-email').value || '').trim() || undefined,
        productId,
        packageLabel:          pkgLabel,
        price:                 parseFloat(document.getElementById('ic-price').value) || 0,
        activatedAt:           actDate,
        subscriptionExpiresAt: expDate,
        orgId:                 (document.getElementById('ic-orgid').value || '').trim() || undefined,
        customPortalLink:      (document.getElementById('ic-portal-link').value || '').trim() || undefined,
        notes:                 (document.getElementById('ic-notes').value || '').trim() || undefined,
        resellerId,
        resellerName,
      });

      if (d && d.success) {
        close();
        await Dashboard.reload();
        // Brief confirmation
        setTimeout(() => {
          alert(`✓ Customer "${name}" imported successfully.\n\nThey now appear as fully activated in the dashboard and customer portal.`);
        }, 300);
      } else {
        showErr((d && d.error) || 'Import failed — check the fields and try again.');
      }
    } catch { showErr('Network error — check your connection.'); }

    saveBtn.disabled = false; saveBtn.textContent = '📥 Import Customer';
  };

  return { open, close, save, onProductChange, onPackageChange };
})();
