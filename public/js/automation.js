/* ─── DTC Admin — Automation Features ───────────────────────────────────────
   Covers: Webhooks, Smart Nudges, Chargebacks, Payment Retries,
           Abandoned Carts, Flash Sale
─────────────────────────────────────────────────────────────────────────── */
'use strict';

var Automation = (() => {

  // ── Shared helpers ──────────────────────────────────────────────────────────
  const a = (id) => document.getElementById(id);
  const fmtDate = (iso) => iso ? new Date(iso).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';
  const relTime = (iso) => {
    if (!iso) return '—';
    const s = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s/60) + 'm ago';
    if (s < 86400) return Math.floor(s/3600) + 'h ago';
    return Math.floor(s/86400) + 'd ago';
  };

  // Status pill helper
  const pill = (text, type) => {
    const map = { ok:'b-act', warn:'b-sub', err:'b-exp', blue:'b-acc', grey:'b-pend' };
    return `<span class="badge ${map[type]||'b-pend'}"><span class="b-dot"></span>${esc(text)}</span>`;
  };

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 1: FLASH SALE
  // ════════════════════════════════════════════════════════════════════════════
  let _flashTimer = null;

  const loadFlashSale = async () => {
    const d = await api(`/admin/flash-sale?adminKey=${Store.adminKey}`);
    if (!d) return;
    a('fs-enabled').checked   = !!d.enabled;
    a('fs-label').value       = d.label || 'Flash Sale';
    a('fs-discount').value    = d.discountPct || 0;
    a('fs-ends-at').value     = d.endsAt ? d.endsAt.slice(0,16) : '';
    _updateFlashPreview(d);
  };

  const _updateFlashPreview = (d) => {
    const box = a('fs-preview-box');
    if (!box) return;
    if (!d?.enabled || !d?.endsAt) {
      box.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:.8rem;padding:1rem">No active flash sale</div>';
      return;
    }
    const remaining = new Date(d.endsAt) - new Date();
    if (remaining <= 0) { box.innerHTML = '<div style="text-align:center;color:var(--error);font-size:.8rem;padding:1rem">⏰ Sale has ended</div>'; return; }
    box.innerHTML = `
      <div style="background:var(--warn-bg);border:1px solid var(--warn-border);border-radius:10px;padding:1rem;text-align:center">
        <div style="font-size:1.1rem;font-weight:800;color:var(--warn);margin-bottom:.4rem">⚡ ${esc(d.label)}</div>
        <div style="font-size:2rem;font-weight:900;color:var(--warn);font-family:'JetBrains Mono',monospace" id="fs-countdown"></div>
        <div style="font-size:.75rem;color:var(--muted);margin-top:.4rem">${d.discountPct}% off all products</div>
      </div>`;
    if (_flashTimer) clearInterval(_flashTimer);
    _flashTimer = setInterval(() => {
      const el = a('fs-countdown'); if (!el) { clearInterval(_flashTimer); return; }
      const ms = new Date(d.endsAt) - new Date();
      if (ms <= 0) { el.textContent = 'Ended'; clearInterval(_flashTimer); return; }
      const h = Math.floor(ms/3600000), m = Math.floor((ms%3600000)/60000), s = Math.floor((ms%60000)/1000);
      el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }, 1000);
  };

  const saveFlashSale = async () => {
    const btn = a('fs-save-btn'); btn.disabled = true; btn.textContent = 'Saving…';
    const d = await api('/admin/flash-sale', {
      adminKey: Store.adminKey,
      enabled:  a('fs-enabled').checked,
      label:    a('fs-label').value.trim() || 'Flash Sale',
      discountPct: parseInt(a('fs-discount').value) || 0,
      endsAt:   a('fs-ends-at').value ? new Date(a('fs-ends-at').value).toISOString() : null,
    });
    btn.disabled = false; btn.textContent = 'Save Flash Sale';
    if (d?.ok) { showMsg('fs-ok','fs-err',true,'✓ Flash sale saved!'); loadFlashSale(); }
    else showMsg('fs-ok','fs-err',false,'Failed to save.');
  };

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 2: WEBHOOKS
  // ════════════════════════════════════════════════════════════════════════════
  let _webhooks = [];

  const loadWebhooks = async () => {
    const d = await api(`/admin/webhooks?adminKey=${Store.adminKey}`);
    _webhooks = Array.isArray(d) ? d : [];
    _renderWebhooks();
  };

  const _renderWebhooks = () => {
    const el = a('wh-list');
    if (!el) return;
    if (!_webhooks.length) {
      el.innerHTML = '<div class="empty">No webhooks configured yet. Add one below.</div>';
      return;
    }
    el.innerHTML = _webhooks.map(h => `
      <div class="setting-block" style="margin-bottom:.75rem">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:.6rem">
          <div style="flex:1;min-width:0">
            <div style="font-size:.88rem;font-weight:700;color:var(--text)">${esc(h.name)}</div>
            <div style="font-size:.72rem;color:var(--muted);font-family:'JetBrains Mono',monospace;margin-top:2px;word-break:break-all">${esc(h.url)}</div>
            <div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.5rem">
              ${(h.events||[]).map(e => `<span style="font-size:.6rem;background:var(--blue-light);border:1px solid var(--blue-mid);color:var(--blue);padding:1px 7px;border-radius:99px;font-weight:600">${e}</span>`).join('')}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:.4rem;flex-shrink:0">
            ${h.consecutiveErrors >= 3 ? pill('Failing','err') : h.enabled ? pill('Active','ok') : pill('Disabled','grey')}
            <button class="btn btn-ghost-blue btn-sm" onclick="Automation.testWebhook('${h.id}')">Test</button>
            <button class="btn btn-outline btn-sm" onclick="Automation.editWebhook('${h.id}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="Automation.deleteWebhook('${h.id}')">Delete</button>
          </div>
        </div>
        ${h.lastFiredAt ? `<div style="font-size:.68rem;color:var(--muted);margin-top:.5rem">Last fired: ${relTime(h.lastFiredAt)} · Event: ${esc(h.lastEvent||'—')}</div>` : ''}
        ${h.lastError ? `<div style="font-size:.68rem;color:var(--error);margin-top:.2rem">⚠ Last error: ${esc(h.lastError)}</div>` : ''}
      </div>`).join('');
  };

  const saveWebhook = async () => {
    const id   = a('wh-edit-id').value;
    const name = a('wh-name').value.trim();
    const url  = a('wh-url').value.trim();
    if (!url) { showMsg('wh-ok','wh-err',false,'URL is required.'); return; }
    const events = [...document.querySelectorAll('.wh-event-cb:checked')].map(c => c.value);
    const d = await api('/admin/webhooks/save', {
      adminKey: Store.adminKey,
      webhook: { id: id||undefined, name: name||'Webhook', url, secret: a('wh-secret').value.trim(), events, enabled: true },
    });
    if (d?.ok) {
      showMsg('wh-ok','wh-err',true,'✓ Webhook saved!');
      a('wh-edit-id').value=''; a('wh-name').value=''; a('wh-url').value=''; a('wh-secret').value='';
      loadWebhooks();
    } else showMsg('wh-ok','wh-err',false,'Failed to save.');
  };

  const editWebhook = (id) => {
    const h = _webhooks.find(w => w.id === id); if (!h) return;
    a('wh-edit-id').value = h.id; a('wh-name').value = h.name; a('wh-url').value = h.url; a('wh-secret').value = h.secret||'';
    document.querySelectorAll('.wh-event-cb').forEach(cb => cb.checked = (h.events||[]).includes(cb.value));
    a('wh-name').scrollIntoView({ behavior:'smooth', block:'center' });
    a('wh-name').focus();
  };

  const deleteWebhook = async (id) => {
    if (!confirm('Delete this webhook?')) return;
    await api('/admin/webhooks/delete', { adminKey: Store.adminKey, id });
    loadWebhooks();
  };

  const testWebhook = async (id) => {
    const d = await api('/admin/webhooks/test', { adminKey: Store.adminKey, id });
    if (d?.ok) alert(`✓ Test successful — HTTP ${d.status}`);
    else alert(`✕ Test failed: ${d?.error || 'Unknown error'}`);
  };

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 3: SMART NUDGES
  // ════════════════════════════════════════════════════════════════════════════
  const loadNudgeLog = async () => {
    const d = await api(`/admin/nudges/log?adminKey=${Store.adminKey}`);
    const el = a('nudge-log'); if (!el) return;
    const entries = d?.entries || [];
    if (!entries.length) { el.innerHTML = '<div class="empty">No nudge emails sent yet.</div>'; return; }
    el.innerHTML = `
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>Customer</th><th>Package</th><th>Nudge</th><th>Sent</th></tr></thead>
          <tbody>${entries.slice(0,50).map(e => `
            <tr>
              <td><div style="font-weight:600">${esc(e.customerName)}</div><div style="font-size:.68rem;color:var(--muted)">${esc(e.email)}</div></td>
              <td>${esc(e.packageType)}</td>
              <td>${e.type === 'nudge1' ? pill('Nudge 1 — gentle','warn') : pill('Nudge 2 — win-back','blue')}</td>
              <td style="font-size:.72rem;color:var(--muted)">${fmtDate(e.sentAt)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  };

  const runNudgesNow = async () => {
    const btn = a('nudge-run-btn'); btn.disabled = true; btn.textContent = 'Running…';
    const d = await api('/admin/nudges/run', { adminKey: Store.adminKey });
    btn.disabled = false; btn.textContent = '▶ Run nudges now';
    if (d?.ok) { showMsg('nudge-ok','nudge-err',true,'✓ Nudge check complete — log updated.'); loadNudgeLog(); }
    else showMsg('nudge-ok','nudge-err',false,'Failed to run.');
  };

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 4: CHARGEBACKS
  // ════════════════════════════════════════════════════════════════════════════
  const loadChargebacks = async () => {
    const d = await api(`/admin/chargebacks?adminKey=${Store.adminKey}`);
    const el = a('cb-list'); if (!el) return;
    const list = Array.isArray(d) ? d : [];
    if (!list.length) { el.innerHTML = '<div class="empty">No chargebacks recorded.</div>'; return; }
    el.innerHTML = `
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>Customer</th><th>Package</th><th>Reason</th><th>Flagged</th><th>Status</th><th></th></tr></thead>
          <tbody>${list.map(c => `
            <tr>
              <td><div style="font-weight:600">${esc(c.customerName)}</div><div style="font-size:.68rem;color:var(--muted)">${esc(c.email)}</div></td>
              <td>${esc(c.packageType)}</td>
              <td style="font-size:.78rem;color:var(--muted)">${esc(c.reason)}</td>
              <td style="font-size:.72rem;color:var(--muted)">${fmtDate(c.flaggedAt)}</td>
              <td>${c.status === 'resolved' ? pill('Resolved','ok') : pill('Open','err')}</td>
              <td>${c.status !== 'resolved' ? `<button class="btn btn-ghost-blue btn-sm" onclick="Automation.resolveChargeback('${c.token}')">Resolve</button>` : ''}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  };

  const flagChargeback = async () => {
    const token  = a('cb-token').value.trim();
    const reason = a('cb-reason').value.trim();
    if (!token) { showMsg('cb-ok','cb-err',false,'Token is required.'); return; }
    const d = await api('/admin/chargeback', { adminKey: Store.adminKey, token, reason, sendEmail: a('cb-email-admin').checked });
    if (d?.ok) { showMsg('cb-ok','cb-err',true,'✓ Chargeback flagged — subscription suspended.'); a('cb-token').value=''; a('cb-reason').value=''; loadChargebacks(); }
    else showMsg('cb-ok','cb-err',false, d?.error || 'Failed.');
  };

  const resolveChargeback = async (token) => {
    const resolution = prompt('Resolution note (optional):') || 'Resolved by admin';
    const d = await api('/admin/chargeback/resolve', { adminKey: Store.adminKey, token, resolution });
    if (d?.ok) { showMsg('cb-ok','cb-err',true,'✓ Chargeback resolved.'); loadChargebacks(); }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 5: PAYMENT RETRIES
  // ════════════════════════════════════════════════════════════════════════════
  const loadPaymentRetries = async () => {
    const d = await api(`/admin/payment-retries?adminKey=${Store.adminKey}`);
    const el = a('retry-list'); if (!el) return;
    const list = Array.isArray(d) ? d : [];
    if (!list.length) { el.innerHTML = '<div class="empty">No payment retry emails queued.</div>'; return; }
    el.innerHTML = `
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>Customer</th><th>Product</th><th>Declined</th><th>Scheduled for</th><th>Status</th></tr></thead>
          <tbody>${list.map(r => `
            <tr>
              <td><div style="font-weight:600">${esc(r.customerName)}</div><div style="font-size:.68rem;color:var(--muted)">${esc(r.email)}</div></td>
              <td>${esc(r.productName)}</td>
              <td style="font-size:.72rem;color:var(--muted)">${fmtDate(r.declinedAt)}</td>
              <td style="font-size:.72rem;color:var(--muted)">${fmtDate(r.scheduledFor)}</td>
              <td>${r.sent ? pill('Sent '+relTime(r.sentAt),'ok') : new Date(r.scheduledFor) > new Date() ? pill('Pending','warn') : pill('Overdue','err')}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  };

  const saveRetrySettings = async () => {
    const d = await api('/admin/payment-retries/settings', {
      adminKey: Store.adminKey,
      retryHours: parseInt(a('retry-hours').value) || 2,
      enabled:    a('retry-enabled').checked,
    });
    if (d?.ok) showMsg('retry-ok','retry-err',true,'✓ Retry settings saved.');
    else showMsg('retry-ok','retry-err',false,'Failed to save.');
  };

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 6: ABANDONED CARTS
  // ════════════════════════════════════════════════════════════════════════════
  const loadAbandonedCarts = async () => {
    const d = await api(`/admin/abandoned-carts?adminKey=${Store.adminKey}`);
    const el = a('cart-list'); if (!el) return;
    const list = Array.isArray(d) ? d : [];

    const total     = list.length;
    const abandoned = list.filter(c => !c.completed && !c.recoverySent);
    const recovered = list.filter(c => c.recoverySent);
    const completed = list.filter(c => c.completed);

    a('cart-stat-total').textContent     = total;
    a('cart-stat-abandoned').textContent = abandoned.length;
    a('cart-stat-recovered').textContent = recovered.length;
    a('cart-stat-completed').textContent = completed.length;

    if (!list.length) { el.innerHTML = '<div class="empty">No cart activity recorded yet.</div>'; return; }
    el.innerHTML = `
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>Email</th><th>Product</th><th>Price</th><th>Started</th><th>Status</th></tr></thead>
          <tbody>${list.slice(0,100).map(c => {
            const st = c.completed ? ['Completed','ok'] : c.recoverySent ? ['Recovery sent','blue'] : ['Abandoned','err'];
            return `<tr>
              <td style="font-size:.78rem;font-family:'JetBrains Mono',monospace">${esc(c.email)}</td>
              <td>${esc(c.productName)}${c.packageLabel?` <span style="font-size:.68rem;color:var(--muted)">— ${esc(c.packageLabel)}</span>`:''}</td>
              <td style="font-weight:700;color:var(--success)">$${c.price||0}</td>
              <td style="font-size:.72rem;color:var(--muted)">${relTime(c.startedAt)}</td>
              <td>${pill(st[0],st[1])}</td>
            </tr>`;
          }).join('')}
          </tbody>
        </table>
      </div>`;
  };

  const clearOldCarts = async () => {
    if (!confirm('Clear cart entries older than 30 days?')) return;
    const d = await api('/admin/abandoned-carts/clear', { adminKey: Store.adminKey });
    if (d?.ok) { showMsg('cart-ok','cart-err',true,`✓ Cleared ${d.cleared} old entries.`); loadAbandonedCarts(); }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER — build the full Automation page HTML
  // ════════════════════════════════════════════════════════════════════════════
  const render = () => {
    const el = a('page-automation'); if (!el) return;
    el.innerHTML = `
    <div class="ph">
      <div class="ph-left">
        <div class="ph-title">Automation</div>
        <div class="ph-sub">Smart nudges, webhooks, chargebacks, payment retries, abandoned carts, flash sales.</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.2rem">

      <!-- ── FLASH SALE ─────────────────────────────────────────────────── -->
      <div class="card" style="grid-column:1/-1">
        <div class="card-title">⚡ Flash Sale Countdown</div>
        <div style="display:grid;grid-template-columns:1fr 320px;gap:1.2rem;align-items:start">
          <div>
            <div class="form-row">
              <div class="form-group">
                <label>Sale label</label>
                <input id="fs-label" placeholder="e.g. Weekend Sale" value="Flash Sale"/>
              </div>
              <div class="form-group">
                <label>Discount %</label>
                <input id="fs-discount" type="number" min="0" max="100" placeholder="e.g. 15" value="0"/>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Ends at</label>
                <input id="fs-ends-at" type="datetime-local"/>
              </div>
              <div class="form-group" style="display:flex;align-items:flex-end;padding-bottom:.1rem">
                <label class="toggle" style="margin:0">
                  <input type="checkbox" id="fs-enabled"/>
                  <div class="toggle-track"><div class="toggle-thumb"></div></div>
                  <span style="font-size:.82rem;font-weight:500;color:var(--text)">Sale active</span>
                </label>
              </div>
            </div>
            <button class="btn btn-primary" id="fs-save-btn" onclick="Automation.saveFlashSale()">Save Flash Sale</button>
            <div class="msg ok" id="fs-ok"></div>
            <div class="msg err" id="fs-err"></div>
          </div>
          <div>
            <div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:.6rem">Live preview</div>
            <div id="fs-preview-box"></div>
            <div style="margin-top:.75rem;font-size:.75rem;color:var(--muted);line-height:1.6">
              The flash sale banner and countdown appear on the shop page. Customers see the discount % and a live timer. The sale auto-expires when the end time is reached.
            </div>
          </div>
        </div>
      </div>

      <!-- ── WEBHOOKS ───────────────────────────────────────────────────── -->
      <div class="card">
        <div class="card-title">🔗 Webhook Triggers</div>
        <div id="wh-list" style="margin-bottom:1rem"></div>
        <div style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:1rem">
          <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:var(--muted);margin-bottom:.9rem">
            Add / edit webhook
          </div>
          <input type="hidden" id="wh-edit-id"/>
          <div class="form-group"><label>Name</label><input id="wh-name" placeholder="e.g. Zapier order hook"/></div>
          <div class="form-group"><label>URL</label><input id="wh-url" placeholder="https://hooks.zapier.com/…"/></div>
          <div class="form-group"><label>Secret (optional)</label><input id="wh-secret" placeholder="Sent as X-DTC-Secret header"/></div>
          <div class="form-group">
            <label>Fire on events</label>
            <div style="display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.2rem">
              ${['approve','decline','expiry','order_approved','order_declined','chargeback'].map(e =>
                `<label style="display:flex;align-items:center;gap:.35rem;font-size:.78rem;font-weight:400;cursor:pointer">
                  <input type="checkbox" class="wh-event-cb" value="${e}" checked/> ${e}
                </label>`).join('')}
            </div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="Automation.saveWebhook()">Save webhook</button>
          <div class="msg ok" id="wh-ok"></div>
          <div class="msg err" id="wh-err"></div>
        </div>
      </div>

      <!-- ── SMART NUDGES ───────────────────────────────────────────────── -->
      <div class="card">
        <div class="card-title">📲 Smart Renewal Nudges</div>
        <div style="background:var(--blue-light);border:1px solid var(--blue-mid);border-radius:9px;padding:.85rem 1rem;margin-bottom:1rem;font-size:.8rem;color:var(--blue);line-height:1.65">
          <strong>How it works:</strong><br>
          Nudge 1 — sent 2 days after expiry: "Did you forget?"<br>
          Nudge 2 — sent 5 days after expiry: "We miss you + loyalty discount"<br>
          Runs automatically at 10am daily. Each nudge is sent once per customer.
        </div>
        <div style="display:flex;gap:.6rem;margin-bottom:1rem;flex-wrap:wrap">
          <button class="btn btn-primary btn-sm" id="nudge-run-btn" onclick="Automation.runNudgesNow()">▶ Run nudges now</button>
          <button class="btn btn-outline btn-sm" onclick="Automation.loadNudgeLog()">↻ Refresh log</button>
        </div>
        <div class="msg ok" id="nudge-ok"></div>
        <div class="msg err" id="nudge-err"></div>
        <div id="nudge-log"></div>
      </div>

      <!-- ── CHARGEBACKS ────────────────────────────────────────────────── -->
      <div class="card">
        <div class="card-title">🚫 Chargeback Management</div>
        <div style="background:var(--error-bg);border:1px solid var(--error-border);border-radius:9px;padding:.75rem 1rem;margin-bottom:1rem;font-size:.78rem;color:var(--error);line-height:1.6">
          Flagging a chargeback immediately <strong>suspends the subscription</strong>, fires the chargeback webhook, and optionally alerts the admin email.
        </div>
        <div style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:1rem;margin-bottom:1rem">
          <div class="form-group"><label>Activation token</label><input id="cb-token" placeholder="Paste the customer's token…" style="font-family:'JetBrains Mono',monospace;font-size:.8rem"/></div>
          <div class="form-group"><label>Reason</label><input id="cb-reason" placeholder="e.g. PayPal dispute opened"/></div>
          <label class="toggle" style="margin-bottom:.9rem">
            <input type="checkbox" id="cb-email-admin" checked/>
            <div class="toggle-track"><div class="toggle-thumb"></div></div>
            <span style="font-size:.78rem;color:var(--text)">Email admin alert</span>
          </label>
          <button class="btn btn-danger btn-sm" onclick="Automation.flagChargeback()">Flag chargeback & suspend</button>
          <div class="msg ok" id="cb-ok"></div>
          <div class="msg err" id="cb-err"></div>
        </div>
        <div id="cb-list"></div>
      </div>

      <!-- ── PAYMENT RETRIES ────────────────────────────────────────────── -->
      <div class="card">
        <div class="card-title">🔄 Payment Retry Automation</div>
        <div style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:1rem;margin-bottom:1rem">
          <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:var(--muted);margin-bottom:.9rem">Settings</div>
          <div class="form-row">
            <div class="form-group">
              <label>Hours before retry email</label>
              <input id="retry-hours" type="number" min="1" max="48" value="2" placeholder="2"/>
            </div>
            <div class="form-group" style="display:flex;align-items:flex-end;padding-bottom:.1rem">
              <label class="toggle" style="margin:0">
                <input type="checkbox" id="retry-enabled" checked/>
                <div class="toggle-track"><div class="toggle-thumb"></div></div>
                <span style="font-size:.82rem;font-weight:500;color:var(--text)">Enabled</span>
              </label>
            </div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="Automation.saveRetrySettings()">Save settings</button>
          <div class="msg ok" id="retry-ok"></div>
          <div class="msg err" id="retry-err"></div>
        </div>
        <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:var(--muted);margin-bottom:.6rem">Queue</div>
        <div id="retry-list"></div>
      </div>

      <!-- ── ABANDONED CARTS ────────────────────────────────────────────── -->
      <div class="card" style="grid-column:1/-1">
        <div class="card-title">🛒 Abandoned Cart Recovery</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.75rem;margin-bottom:1rem">
          <div class="stat"><div class="stat-val" id="cart-stat-total">—</div><div class="stat-lbl">Total carts</div></div>
          <div class="stat"><div class="stat-val sv-red" id="cart-stat-abandoned">—</div><div class="stat-lbl">Abandoned</div></div>
          <div class="stat"><div class="stat-val sv-blue" id="cart-stat-recovered">—</div><div class="stat-lbl">Recovery sent</div></div>
          <div class="stat"><div class="stat-val sv-green" id="cart-stat-completed">—</div><div class="stat-lbl">Completed</div></div>
        </div>
        <div style="background:var(--blue-light);border:1px solid var(--blue-mid);border-radius:9px;padding:.75rem 1rem;margin-bottom:1rem;font-size:.78rem;color:var(--blue);line-height:1.6">
          Recovery emails are sent automatically 2 hours after cart start if the order is not completed. The shop frontend calls <code style="font-family:'JetBrains Mono',monospace;font-size:.72rem">/api/shop/cart-start</code> when the customer selects a product and <code style="font-family:'JetBrains Mono',monospace;font-size:.72rem">/api/shop/cart-complete</code> when they submit a receipt.
        </div>
        <div style="display:flex;gap:.6rem;margin-bottom:1rem">
          <button class="btn btn-outline btn-sm" onclick="Automation.loadAbandonedCarts()">↻ Refresh</button>
          <button class="btn btn-outline btn-sm" onclick="Automation.clearOldCarts()">🗑 Clear 30d+ entries</button>
        </div>
        <div class="msg ok" id="cart-ok"></div>
        <div class="msg err" id="cart-err"></div>
        <div id="cart-list"></div>
      </div>

    </div>`;

    // Load all data
    loadFlashSale();
    loadWebhooks();
    loadNudgeLog();
    loadChargebacks();
    loadPaymentRetries();
    loadAbandonedCarts();
  };

  return {
    render,
    saveFlashSale, loadFlashSale,
    saveWebhook, editWebhook, deleteWebhook, testWebhook, loadWebhooks,
    runNudgesNow, loadNudgeLog,
    flagChargeback, resolveChargeback, loadChargebacks,
    saveRetrySettings, loadPaymentRetries,
    loadAbandonedCarts, clearOldCarts,
  };
})();
