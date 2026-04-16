/* ─── DTC Admin — Live Chat Module ──────────────────────────────────────── */
'use strict';

const LiveChat = (() => {

  let _activeChatId = null;
  let _filter       = 'all';
  let _allChats     = [];
  let _pollTimer    = null;

  // ── Helpers ────────────────────────────────────────────────────────────────
  const _fmtTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diffH = (now - d) / 3600000;
    if (diffH < 24) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };
  const _esc = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
  const _statusBadge = (status) => status === 'closed'
    ? `<span class="badge b-deact">⊘ Closed</span>`
    : `<span class="badge b-acc">● Open</span>`;

  // ── Load all chats ─────────────────────────────────────────────────────────
  const load = async () => {
    try {
      const d = await api(`/admin/chats?adminKey=${encodeURIComponent(Store.adminKey)}`);
      if (!d || d.error) return;
      _allChats = d.chats || [];
      _renderList();
      _updateSidebarBadge();
    } catch(e) { console.warn('[LiveChat]', e.message); }
  };

  // ── Render conversation list ───────────────────────────────────────────────
  const _renderList = () => {
    const filtered = _filter === 'all' ? _allChats : _allChats.filter(c => c.status === _filter);
    const el = document.getElementById('chat-list');
    if (!el) return;

    if (!filtered.length) {
      el.innerHTML = '<div class="empty">No conversations yet.</div>';
      return;
    }

    el.innerHTML = filtered.map(c => {
      const lastMsg   = c.messages && c.messages.length ? c.messages[c.messages.length - 1] : null;
      const preview   = lastMsg ? _esc(lastMsg.text.slice(0, 60)) + (lastMsg.text.length > 60 ? '…' : '') : 'No messages';
      const isActive  = c.id === _activeChatId;
      const unread    = c.unreadAdmin > 0;

      return `<div class="chat-list-item ${isActive ? 'active' : ''}" onclick="LiveChat.openChat('${c.id}')"
          style="padding:.8rem 1.1rem;border-bottom:1px solid var(--border);cursor:pointer;transition:background .15s;${isActive ? 'background:var(--blue-light);' : ''}">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:.5rem;margin-bottom:.25rem">
          <div style="display:flex;align-items:center;gap:.4rem;flex:1;min-width:0">
            ${unread ? `<span style="width:7px;height:7px;border-radius:50%;background:var(--blue);flex-shrink:0"></span>` : ''}
            <span style="font-size:.82rem;font-weight:${unread ? '700' : '600'};color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_esc(c.customerName)}</span>
          </div>
          <span style="font-size:.63rem;color:var(--muted2);flex-shrink:0">${_fmtTime(c.updatedAt)}</span>
        </div>
        <div style="font-size:.72rem;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:.3rem">${preview}</div>
        <div style="display:flex;align-items:center;gap:.4rem;flex-wrap:wrap">
          ${_statusBadge(c.status)}
          <span style="font-size:.62rem;color:var(--muted);font-family:'JetBrains Mono',monospace">${_esc(c.packageType || '')}</span>
          ${c.unreadAdmin > 0 ? `<span style="background:var(--blue);color:#fff;border-radius:99px;padding:.08rem .45rem;font-size:.6rem;font-weight:700;margin-left:auto">${c.unreadAdmin} new</span>` : ''}
        </div>
      </div>`;
    }).join('');
  };

  // ── Open a chat thread ─────────────────────────────────────────────────────
  const openChat = async (chatId) => {
    _activeChatId = chatId;
    _renderList(); // highlight active

    // Mark as read
    await api('/admin/chats/read', { adminKey: Store.adminKey, chatId });

    const chat = _allChats.find(c => c.id === chatId);
    if (chat) { chat.unreadAdmin = 0; _updateSidebarBadge(); }

    // Show pane, hide empty
    document.getElementById('chat-reply-pane').style.display = '';
    document.getElementById('chat-pane-empty').style.display = 'none';

    // Header
    document.getElementById('chat-pane-name').textContent = chat ? chat.customerName : '—';
    document.getElementById('chat-pane-meta').textContent  = chat ? `${chat.email} · ${chat.packageType || ''}` : '—';
    document.getElementById('chat-pane-status-badge').innerHTML = chat ? _statusBadge(chat.status) : '';

    // Close button
    const closeBtn = document.getElementById('chat-close-btn');
    if (chat && chat.status === 'closed') {
      closeBtn.style.display = 'none';
      document.getElementById('admin-reply-area').style.display = 'none';
    } else {
      closeBtn.style.display = '';
      document.getElementById('admin-reply-area').style.display = '';
    }

    // Render messages
    _renderMessages(chat ? chat.messages : []);

    // Start polling for new messages in this thread
    clearInterval(_pollTimer);
    _pollTimer = setInterval(() => _pollThread(chatId), 4000);
  };

  const _pollThread = async (chatId) => {
    try {
      const d = await api(`/admin/chats/${chatId}?adminKey=${encodeURIComponent(Store.adminKey)}`);
      if (!d || d.error) return;
      // Update local copy
      const idx = _allChats.findIndex(c => c.id === chatId);
      if (idx >= 0) _allChats[idx] = d;
      _renderMessages(d.messages || []);
    } catch {}
  };

  const _renderMessages = (msgs) => {
    const container = document.getElementById('admin-chat-msgs');
    if (!container) return;
    if (!msgs || !msgs.length) {
      container.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:.78rem;padding:2rem">No messages yet.</div>';
      return;
    }
    container.innerHTML = msgs.map(m => {
      const isAdmin = m.role === 'admin';
      return `<div style="display:flex;flex-direction:column;align-items:${isAdmin ? 'flex-end' : 'flex-start'};max-width:78%;align-self:${isAdmin ? 'flex-end' : 'flex-start'};gap:.18rem">
        <div style="padding:.55rem .85rem;border-radius:${isAdmin ? '12px 12px 3px 12px' : '12px 12px 12px 3px'};font-size:.8rem;line-height:1.55;word-break:break-word;${isAdmin ? 'background:var(--blue);color:#fff' : 'background:var(--white);border:1px solid var(--border);color:var(--text)'}">${_esc(m.text)}</div>
        <span style="font-size:.62rem;color:var(--muted2)">${isAdmin ? 'You' : 'Customer'} · ${_fmtTime(m.sentAt)}</span>
      </div>`;
    }).join('');
    container.scrollTop = container.scrollHeight;
  };

  // ── Reply ──────────────────────────────────────────────────────────────────
  const reply = async () => {
    const input = document.getElementById('admin-chat-input');
    const text  = input.value.trim();
    if (!text || !_activeChatId) return;
    input.value = '';
    try {
      const d = await api('/admin/chats/reply', { adminKey: Store.adminKey, chatId: _activeChatId, text });
      if (d && d.ok) {
        // Update local copy
        const chat = _allChats.find(c => c.id === _activeChatId);
        if (chat && d.message) { chat.messages.push(d.message); chat.updatedAt = d.message.sentAt; }
        _renderMessages(chat ? chat.messages : []);
        _renderList();
      }
    } catch(e) { console.warn('[LiveChat reply]', e.message); }
  };

  // ── Close chat ─────────────────────────────────────────────────────────────
  const closeChat = async () => {
    if (!_activeChatId || !confirm('Close this conversation? The customer will be notified.')) return;
    await api('/admin/chats/close', { adminKey: Store.adminKey, chatId: _activeChatId });
    const chat = _allChats.find(c => c.id === _activeChatId);
    if (chat) { chat.status = 'closed'; }
    await openChat(_activeChatId);
    _renderList();
  };

  // ── Filter ─────────────────────────────────────────────────────────────────
  const setFilter = (f, btn) => {
    _filter = f;
    document.querySelectorAll('#page-livechat .fb').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    _renderList();
  };

  // ── Sidebar badge ──────────────────────────────────────────────────────────
  const _updateSidebarBadge = () => {
    const total = _allChats.reduce((s, c) => s + (c.unreadAdmin || 0), 0);
    const badge = document.getElementById('nb-chat');
    if (!badge) return;
    badge.textContent = total > 9 ? '9+' : total;
    badge.style.display = total > 0 ? '' : 'none';
  };

  // Auto-refresh badge every 30s when logged in
  setInterval(() => {
    if (Store.adminKey) load();
  }, 30000);

  return { load, openChat, reply, closeChat, setFilter };
})();
