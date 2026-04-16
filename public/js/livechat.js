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
    const d = new Date(iso), now = new Date();
    const diffH = (now - d) / 3600000;
    if (diffH < 24) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    if (diffH < 168) return d.toLocaleDateString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  const _fmtDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso), now = new Date();
    const diffD = Math.floor((now - d) / 86400000);
    if (diffD === 0) return 'Today';
    if (diffD === 1) return 'Yesterday';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const _esc = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');

  const _initials = (name) => (name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();

  // Deterministic colour from name
  const _avatarColor = (name) => {
    const palette = ['#2563eb','#7c3aed','#dc2626','#059669','#d97706','#0891b2','#db2777','#65a30d'];
    let h = 0;
    for (let i = 0; i < (name || '').length; i++) h = (h * 31 + (name || '').charCodeAt(i)) & 0xffff;
    return palette[h % palette.length];
  };

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
      el.innerHTML = `<div class="empty" style="padding:2.5rem 1rem">
        <div style="font-size:1.8rem;margin-bottom:.5rem">💬</div>
        No ${_filter === 'all' ? '' : _filter + ' '}conversations yet.
      </div>`;
      return;
    }

    // Sort: open first, then by updatedAt desc
    const sorted = [...filtered].sort((a, b) => {
      if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    });

    el.innerHTML = sorted.map(c => {
      const lastMsg  = c.messages && c.messages.length ? c.messages[c.messages.length - 1] : null;
      const preview  = lastMsg ? lastMsg.text.slice(0, 60) + (lastMsg.text.length > 60 ? '…' : '') : 'No messages yet';
      const isActive = c.id === _activeChatId;
      const unread   = c.unreadAdmin > 0;
      const color    = _avatarColor(c.customerName);
      const initials = _initials(c.customerName);

      return `<div class="chat-item ${isActive ? 'active' : ''}" onclick="LiveChat.openChat('${c.id}')">
        ${unread ? `<div class="chat-unread-dot"></div>` : ''}
        <div class="chat-item-avatar" style="background:${color}">${initials}</div>
        <div class="chat-item-body">
          <div class="chat-item-top">
            <div class="chat-item-name" style="font-weight:${unread ? '700' : '600'}">${_esc(c.customerName)}</div>
            <div class="chat-item-time">${_fmtTime(c.updatedAt)}</div>
          </div>
          <div class="chat-item-preview">${_esc(preview)}</div>
          <div class="chat-item-footer">
            ${_statusBadge(c.status)}
            ${c.packageType ? `<span style="font-size:.62rem;color:var(--muted)">${_esc(c.packageType)}</span>` : ''}
            ${unread ? `<span class="chat-unread-count">${c.unreadAdmin > 9 ? '9+' : c.unreadAdmin} new</span>` : ''}
          </div>
        </div>
      </div>`;
    }).join('');
  };

  // ── Open a chat thread ─────────────────────────────────────────────────────
  const openChat = async (chatId) => {
    _activeChatId = chatId;
    _renderList();

    // Mark as read
    await api('/admin/chats/read', { adminKey: Store.adminKey, chatId });

    const chat = _allChats.find(c => c.id === chatId);
    if (chat) { chat.unreadAdmin = 0; _updateSidebarBadge(); }

    // Show thread, hide empty state
    document.getElementById('chat-reply-pane').style.display = 'flex';
    document.getElementById('chat-pane-empty').style.display = 'none';

    // Header
    const color = _avatarColor(chat ? chat.customerName : '');
    const avatarEl = document.getElementById('chat-thread-avatar');
    if (avatarEl) { avatarEl.textContent = _initials(chat ? chat.customerName : ''); avatarEl.style.background = color; }

    document.getElementById('chat-pane-name').textContent  = chat ? chat.customerName : '—';
    document.getElementById('chat-pane-meta').textContent  = chat ? [chat.email, chat.packageType].filter(Boolean).join(' · ') : '—';
    document.getElementById('chat-pane-status-badge').innerHTML = chat ? _statusBadge(chat.status) : '';

    // Closed vs open
    const closeBtn   = document.getElementById('chat-close-btn');
    const replyArea  = document.getElementById('admin-reply-area');
    const isClosed   = chat && chat.status === 'closed';
    if (closeBtn)  closeBtn.style.display  = isClosed ? 'none' : '';
    if (replyArea) replyArea.style.display = isClosed ? 'none' : '';

    _renderMessages(chat ? chat.messages : []);

    // Mobile: slide thread pane into view
    const shell = document.getElementById('chat-shell');
    if (shell) shell.classList.add('thread-open');

    // Poll for new messages
    clearInterval(_pollTimer);
    _pollTimer = setInterval(() => _pollThread(chatId), 4000);
  };

  // Mobile: back to list
  const backToList = () => {
    const shell = document.getElementById('chat-shell');
    if (shell) shell.classList.remove('thread-open');
    clearInterval(_pollTimer);
    _activeChatId = null;
    _renderList();
  };

  const _pollThread = async (chatId) => {
    try {
      const d = await api(`/admin/chats/${chatId}?adminKey=${encodeURIComponent(Store.adminKey)}`);
      if (!d || d.error) return;
      const idx = _allChats.findIndex(c => c.id === chatId);
      if (idx >= 0) _allChats[idx] = d;
      _renderMessages(d.messages || []);
    } catch {}
  };

  // ── Render messages ────────────────────────────────────────────────────────
  const _renderMessages = (msgs) => {
    const container = document.getElementById('admin-chat-msgs');
    if (!container) return;

    if (!msgs || !msgs.length) {
      container.innerHTML = `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--muted);font-size:.82rem;gap:.4rem;padding:2rem">
        <div style="font-size:1.8rem">👋</div>
        <div>No messages yet — say hello!</div>
      </div>`;
      return;
    }

    let lastDate = '';
    const html = msgs.map((m, i) => {
      const isAdmin   = m.role === 'admin';
      const msgDate   = _fmtDate(m.sentAt);
      let dateSep     = '';

      if (msgDate !== lastDate) {
        lastDate  = msgDate;
        dateSep   = `<div class="chat-date-sep">${msgDate}</div>`;
      }

      // Group consecutive same-sender messages
      const prevSame = i > 0 && msgs[i-1].role === m.role;
      const nextSame = i < msgs.length-1 && msgs[i+1].role === m.role;

      return `${dateSep}
      <div class="chat-bubble-wrap ${isAdmin ? 'admin' : 'customer'}" style="${prevSame ? 'margin-top:-.3rem' : ''}">
        <div class="chat-bubble ${isAdmin ? 'admin' : 'customer'}">${_esc(m.text)}</div>
        ${!nextSame ? `<span class="chat-bubble-time">${isAdmin ? 'You' : 'Customer'} · ${_fmtTime(m.sentAt)}</span>` : ''}
      </div>`;
    }).join('');

    container.innerHTML = html;
    // Scroll to bottom
    requestAnimationFrame(() => { container.scrollTop = container.scrollHeight; });
  };

  // ── Reply ──────────────────────────────────────────────────────────────────
  const reply = async () => {
    const input = document.getElementById('admin-chat-input');
    const btn   = document.getElementById('chat-send-btn');
    const text  = input ? input.value.trim() : '';
    if (!text || !_activeChatId) return;

    // Optimistic UI
    input.value = '';
    input.style.height = 'auto';
    if (btn) { btn.disabled = true; btn.style.opacity = '.5'; }

    try {
      const d = await api('/admin/chats/reply', { adminKey: Store.adminKey, chatId: _activeChatId, text });
      if (d && d.ok) {
        const chat = _allChats.find(c => c.id === _activeChatId);
        if (chat && d.message) { chat.messages.push(d.message); chat.updatedAt = d.message.sentAt; }
        _renderMessages(chat ? chat.messages : []);
        _renderList();
      }
    } catch(e) { console.warn('[LiveChat reply]', e.message); }

    if (btn) { btn.disabled = false; btn.style.opacity = ''; }
    input.focus();
  };

  // ── Close chat ─────────────────────────────────────────────────────────────
  const closeChat = async () => {
    if (!_activeChatId || !confirm('Close this conversation?')) return;
    await api('/admin/chats/close', { adminKey: Store.adminKey, chatId: _activeChatId });
    const chat = _allChats.find(c => c.id === _activeChatId);
    if (chat) chat.status = 'closed';
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

  // Auto-refresh badge every 30s
  setInterval(() => { if (Store.adminKey) load(); }, 30000);

  return { load, openChat, backToList, reply, closeChat, setFilter };
})();
