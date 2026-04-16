/* ─── DTC Admin — Edit Customer Modal ───────────────────────────────────── */
'use strict';

const EditCustomer = (() => {
  let _token = null;

  const open = (token) => {
    _token = token;
    const t = (Store.tokens || {})[token];
    if (!t) return;

    // Header info
    document.getElementById('ec-product-line').textContent =
      `${t.productName || t.productId || 'Product'} · ${t.packageType || ''}`;
    document.getElementById('ec-token-line').textContent = token;

    // Fields
    document.getElementById('ec-name').value         = t.customerName  || '';
    document.getElementById('ec-package').value      = t.packageType   || '';
    document.getElementById('ec-email').value        = t.email         || '';
    document.getElementById('ec-wechat').value       = t.wechat        || '';
    document.getElementById('ec-price').value        = t.price         != null ? t.price : '';
    document.getElementById('ec-custom-email').value = t.customEmail   || '';
    document.getElementById('ec-notes').value        = t.notes         || '';

    const errEl = document.getElementById('ec-err');
    if (errEl) errEl.style.display = 'none';

    document.getElementById('edit-customer-modal').style.display = 'flex';
    setTimeout(() => document.getElementById('ec-name').focus(), 40);
  };

  const close = () => {
    document.getElementById('edit-customer-modal').style.display = 'none';
    _token = null;
  };

  const save = async () => {
    if (!_token) return;
    const errEl   = document.getElementById('ec-err');
    const saveBtn = document.getElementById('ec-save-btn');
    errEl.style.display = 'none';

    const name = document.getElementById('ec-name').value.trim();
    if (!name) { errEl.textContent = 'Customer name is required.'; errEl.style.display = 'block'; return; }

    const fields = {
      customerName: name,
      packageType:  document.getElementById('ec-package').value.trim(),
      email:        document.getElementById('ec-email').value.trim(),
      wechat:       document.getElementById('ec-wechat').value.trim(),
      price:        parseFloat(document.getElementById('ec-price').value) || undefined,
      customEmail:  document.getElementById('ec-custom-email').value.trim(),
      notes:        document.getElementById('ec-notes').value.trim(),
    };
    // Remove undefined so we don't overwrite with nothing
    Object.keys(fields).forEach(k => { if (fields[k] === undefined) delete fields[k]; });

    saveBtn.disabled = true; saveBtn.textContent = 'Saving…';
    try {
      const d = await api('/admin/token/update', { adminKey: Store.adminKey, token: _token, fields });
      if (d && d.success) {
        close();
        await Dashboard.reload();
      } else {
        errEl.textContent = (d && d.error) || 'Save failed.';
        errEl.style.display = 'block';
      }
    } catch { errEl.textContent = 'Network error.'; errEl.style.display = 'block'; }
    saveBtn.disabled = false; saveBtn.textContent = 'Save Changes';
  };

  const deleteToken = async () => {
    if (!_token) return;
    const t = (Store.tokens || {})[_token];
    const name = t ? t.customerName : _token;
    if (!confirm(`Permanently delete this record?\n\nCustomer: ${name}\n\nThis cannot be undone. The activation link will stop working and all data for this token will be removed.`)) return;

    const btn = document.getElementById('ec-delete-btn');
    btn.disabled = true; btn.textContent = 'Deleting…';
    try {
      const d = await api('/admin/token/delete', { adminKey: Store.adminKey, token: _token });
      if (d && d.success) {
        close();
        await Dashboard.reload();
      } else {
        alert((d && d.error) || 'Delete failed.');
      }
    } catch { alert('Network error.'); }
    btn.disabled = false; btn.textContent = '🗑 Delete';
  };

  return { open, close, save, deleteToken };
})();
