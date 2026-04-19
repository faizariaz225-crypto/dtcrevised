/* ─── DTC Admin — Theme Editor ───────────────────────────────────────────── */
'use strict';

var ThemeEditor = (() => {

  // ── Built-in presets ────────────────────────────────────────────────────────
  const PRESETS = {
    'dtc-light': {
      name: 'DTC Light',
      description: 'Clean white, blue accent — the default',
      preview: ['#f1f5fb','#0f1629','#2563eb','#ffffff'],
      vars: {
        '--bg':'#f1f5fb','--white':'#ffffff','--text':'#0f172a',
        '--muted':'#64748b','--muted2':'#94a3b8',
        '--border':'#e2e8f0','--border2':'#cbd5e1',
        '--blue':'#2563eb','--blue-dark':'#1d4ed8',
        '--blue-light':'#eff6ff','--blue-mid':'#dbeafe',
        '--success':'#16a34a','--success-bg':'#f0fdf4','--success-border':'#bbf7d0',
        '--error':'#dc2626','--error-bg':'#fef2f2','--error-border':'#fecaca',
        '--warn':'#d97706','--warn-bg':'#fffbeb','--warn-border':'#fde68a',
        '--sidebar':'#0f1629','--sidebar-top':'#111827',
        '--sidebar-hover':'rgba(255,255,255,.06)',
        '--sidebar-active-bg':'rgba(37,99,235,.18)',
        '--sidebar-active-border':'#3b82f6',
        '--shadow':'0 1px 3px rgba(0,0,0,.06),0 2px 8px rgba(0,0,0,.04)',
        '--shadow-md':'0 4px 20px rgba(0,0,0,.08)',
      }
    },
    'dtc-dark': {
      name: 'DTC Dark',
      description: 'Deep navy, dark surfaces — easy on the eyes',
      preview: ['#0c1220','#161f30','#3b82f6','#1e293b'],
      vars: {
        '--bg':'#0c1220','--white':'#161f30','--text':'#e2e8f0',
        '--muted':'#94a3b8','--muted2':'#64748b',
        '--border':'#1e2d45','--border2':'#2d3f5a',
        '--blue':'#3b82f6','--blue-dark':'#2563eb',
        '--blue-light':'#0e1f3d','--blue-mid':'#1e3a6e',
        '--success':'#22c55e','--success-bg':'#052e16','--success-border':'#166534',
        '--error':'#f87171','--error-bg':'#3b0a0a','--error-border':'#7f1d1d',
        '--warn':'#fbbf24','--warn-bg':'#2d1900','--warn-border':'#78350f',
        '--sidebar':'#080e1a','--sidebar-top':'#080e1a',
        '--sidebar-hover':'rgba(255,255,255,.05)',
        '--sidebar-active-bg':'rgba(59,130,246,.22)',
        '--sidebar-active-border':'#60a5fa',
        '--shadow':'0 1px 4px rgba(0,0,0,.5),0 2px 12px rgba(0,0,0,.4)',
        '--shadow-md':'0 4px 20px rgba(0,0,0,.5)',
      }
    },
    'ocean': {
      name: 'Ocean',
      description: 'Deep teal sidebar with cyan accents',
      preview: ['#f0fdfa','#0f3d3a','#0891b2','#ffffff'],
      vars: {
        '--bg':'#f0fdfa','--white':'#ffffff','--text':'#0f172a',
        '--muted':'#64748b','--muted2':'#94a3b8',
        '--border':'#ccfbf1','--border2':'#99f6e4',
        '--blue':'#0891b2','--blue-dark':'#0e7490',
        '--blue-light':'#ecfeff','--blue-mid':'#cffafe',
        '--success':'#16a34a','--success-bg':'#f0fdf4','--success-border':'#bbf7d0',
        '--error':'#dc2626','--error-bg':'#fef2f2','--error-border':'#fecaca',
        '--warn':'#d97706','--warn-bg':'#fffbeb','--warn-border':'#fde68a',
        '--sidebar':'#0f3d3a','--sidebar-top':'#0c2f2c',
        '--sidebar-hover':'rgba(255,255,255,.07)',
        '--sidebar-active-bg':'rgba(8,145,178,.22)',
        '--sidebar-active-border':'#22d3ee',
        '--shadow':'0 1px 3px rgba(0,0,0,.06),0 2px 8px rgba(0,0,0,.04)',
        '--shadow-md':'0 4px 20px rgba(0,0,0,.08)',
      }
    },
    'violet': {
      name: 'Violet',
      description: 'Rich purple sidebar, modern feel',
      preview: ['#faf5ff','#2e1065','#7c3aed','#ffffff'],
      vars: {
        '--bg':'#faf5ff','--white':'#ffffff','--text':'#0f172a',
        '--muted':'#64748b','--muted2':'#94a3b8',
        '--border':'#ede9fe','--border2':'#ddd6fe',
        '--blue':'#7c3aed','--blue-dark':'#6d28d9',
        '--blue-light':'#f5f3ff','--blue-mid':'#ede9fe',
        '--success':'#16a34a','--success-bg':'#f0fdf4','--success-border':'#bbf7d0',
        '--error':'#dc2626','--error-bg':'#fef2f2','--error-border':'#fecaca',
        '--warn':'#d97706','--warn-bg':'#fffbeb','--warn-border':'#fde68a',
        '--sidebar':'#2e1065','--sidebar-top':'#1e0a47',
        '--sidebar-hover':'rgba(255,255,255,.07)',
        '--sidebar-active-bg':'rgba(124,58,237,.25)',
        '--sidebar-active-border':'#a78bfa',
        '--shadow':'0 1px 3px rgba(0,0,0,.06),0 2px 8px rgba(0,0,0,.04)',
        '--shadow-md':'0 4px 20px rgba(0,0,0,.08)',
      }
    },
    'slate': {
      name: 'Slate',
      description: 'Neutral grey, professional minimal',
      preview: ['#f8fafc','#1e293b','#475569','#ffffff'],
      vars: {
        '--bg':'#f8fafc','--white':'#ffffff','--text':'#0f172a',
        '--muted':'#64748b','--muted2':'#94a3b8',
        '--border':'#e2e8f0','--border2':'#cbd5e1',
        '--blue':'#475569','--blue-dark':'#334155',
        '--blue-light':'#f1f5f9','--blue-mid':'#e2e8f0',
        '--success':'#16a34a','--success-bg':'#f0fdf4','--success-border':'#bbf7d0',
        '--error':'#dc2626','--error-bg':'#fef2f2','--error-border':'#fecaca',
        '--warn':'#d97706','--warn-bg':'#fffbeb','--warn-border':'#fde68a',
        '--sidebar':'#1e293b','--sidebar-top':'#0f172a',
        '--sidebar-hover':'rgba(255,255,255,.06)',
        '--sidebar-active-bg':'rgba(71,85,105,.25)',
        '--sidebar-active-border':'#94a3b8',
        '--shadow':'0 1px 3px rgba(0,0,0,.06),0 2px 8px rgba(0,0,0,.04)',
        '--shadow-md':'0 4px 20px rgba(0,0,0,.08)',
      }
    },
    'rose': {
      name: 'Rose',
      description: 'Warm rose-pink, bold and modern',
      preview: ['#fff1f2','#4c0519','#e11d48','#ffffff'],
      vars: {
        '--bg':'#fff1f2','--white':'#ffffff','--text':'#0f172a',
        '--muted':'#64748b','--muted2':'#94a3b8',
        '--border':'#fecdd3','--border2':'#fda4af',
        '--blue':'#e11d48','--blue-dark':'#be123c',
        '--blue-light':'#fff1f2','--blue-mid':'#fecdd3',
        '--success':'#16a34a','--success-bg':'#f0fdf4','--success-border':'#bbf7d0',
        '--error':'#dc2626','--error-bg':'#fef2f2','--error-border':'#fecaca',
        '--warn':'#d97706','--warn-bg':'#fffbeb','--warn-border':'#fde68a',
        '--sidebar':'#4c0519','--sidebar-top':'#3b0012',
        '--sidebar-hover':'rgba(255,255,255,.08)',
        '--sidebar-active-bg':'rgba(225,29,72,.22)',
        '--sidebar-active-border':'#fb7185',
        '--shadow':'0 1px 3px rgba(0,0,0,.06),0 2px 8px rgba(0,0,0,.04)',
        '--shadow-md':'0 4px 20px rgba(0,0,0,.08)',
      }
    },
  };

  // ── Custom themes storage key ───────────────────────────────────────────────
  const STORAGE_KEY = 'dtc-custom-themes';
  const ACTIVE_KEY  = 'dtc-active-theme';

  // ── Load/save custom themes ─────────────────────────────────────────────────
  const _loadCustom = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
  };
  const _saveCustom = (themes) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(themes)); } catch {}
  };

  // ── Apply a theme vars object to :root ──────────────────────────────────────
  const applyVars = (vars) => {
    const root = document.documentElement;
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
    // Also remove data-theme so our inline vars take full control
    root.removeAttribute('data-theme');
  };

  // ── Apply a preset/custom by id ─────────────────────────────────────────────
  const applyTheme = (id) => {
    const all = getAllThemes();
    const theme = all[id];
    if (!theme) return;
    applyVars(theme.vars);
    try { localStorage.setItem(ACTIVE_KEY, id); } catch {}
    _highlightActive(id);
    // Update dark mode icon
    const isDark = (theme.vars['--bg'] || '').match(/#[0-1][0-9a-f]/i);
    const icon  = document.getElementById('dark-icon');
    const label = document.getElementById('dark-label');
    const topbtn = document.getElementById('topbar-dark-btn');
    if (icon)   icon.textContent   = isDark ? '☀️' : '🌙';
    if (label)  label.textContent  = isDark ? 'Light Mode' : 'Dark Mode';
    if (topbtn) topbtn.textContent = isDark ? '☀️' : '🌙';
  };

  const getAllThemes = () => ({ ...PRESETS, ..._loadCustom() });

  const _highlightActive = (id) => {
    document.querySelectorAll('.te-preset-card').forEach(c => {
      c.classList.toggle('te-active', c.dataset.id === id);
    });
  };

  // ── Restore saved theme on page load ───────────────────────────────────────
  const restoreTheme = () => {
    const id = localStorage.getItem(ACTIVE_KEY);
    if (id) applyTheme(id);
  };

  // ── Build the page ──────────────────────────────────────────────────────────
  const render = () => {
    const el = document.getElementById('page-theme');
    if (!el) return;
    const activeId = localStorage.getItem(ACTIVE_KEY) || 'dtc-light';
    const all = getAllThemes();
    const custom = _loadCustom();

    el.innerHTML = `
    <div class="ph">
      <div class="ph-left">
        <div class="ph-title">Theme Editor</div>
        <div class="ph-sub">Choose a preset or build your own custom theme. Changes apply instantly.</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 340px;gap:1.2rem;align-items:start">

      <!-- LEFT: presets + custom list -->
      <div>
        <!-- Built-in presets -->
        <div class="te-section-label">Built-in themes</div>
        <div class="te-preset-grid" id="te-builtin-grid"></div>

        <!-- Custom themes -->
        <div class="te-section-label" style="margin-top:1.5rem">
          My saved themes
          <span id="te-custom-count" style="font-size:.65rem;font-weight:400;color:var(--muted);margin-left:.5rem"></span>
        </div>
        <div id="te-custom-grid" class="te-preset-grid"></div>
        <div id="te-no-custom" style="display:none;font-size:.8rem;color:var(--muted);padding:.75rem 0">No saved themes yet. Build one using the editor →</div>

        <!-- Export/Import -->
        <div class="setting-block" style="margin-top:1.5rem">
          <div class="setting-block-title">Export & Import</div>
          <div class="setting-block-sub">Share themes between installations or back them up.</div>
          <div style="display:flex;gap:.6rem;flex-wrap:wrap">
            <button class="btn btn-outline btn-sm" onclick="ThemeEditor.exportThemes()">⬇ Export all themes</button>
            <button class="btn btn-outline btn-sm" onclick="document.getElementById('te-import-file').click()">⬆ Import themes</button>
            <input type="file" id="te-import-file" accept=".json" style="display:none" onchange="ThemeEditor.importThemes(this)"/>
          </div>
          <div class="msg ok" id="te-import-ok"></div>
          <div class="msg err" id="te-import-err"></div>
        </div>
      </div>

      <!-- RIGHT: custom builder -->
      <div>
        <div class="te-section-label">Custom theme builder</div>
        <div class="setting-block">
          <div class="form-group">
            <label>Theme name</label>
            <input id="te-name" placeholder="e.g. My Brand Theme"/>
          </div>
          <div class="form-group">
            <label>Description</label>
            <input id="te-desc" placeholder="Short description"/>
          </div>

          <div class="te-color-section">Main colours</div>
          <div class="te-color-grid">
            <div class="te-color-row"><label>Page background</label><div class="te-swatch-wrap"><input type="color" class="te-swatch" id="cv--bg" data-var="--bg"/><input class="te-hex" id="ch--bg" placeholder="#f1f5fb"/></div></div>
            <div class="te-color-row"><label>Card / surface</label><div class="te-swatch-wrap"><input type="color" class="te-swatch" id="cv--white" data-var="--white"/><input class="te-hex" id="ch--white" placeholder="#ffffff"/></div></div>
            <div class="te-color-row"><label>Body text</label><div class="te-swatch-wrap"><input type="color" class="te-swatch" id="cv--text" data-var="--text"/><input class="te-hex" id="ch--text" placeholder="#0f172a"/></div></div>
            <div class="te-color-row"><label>Muted text</label><div class="te-swatch-wrap"><input type="color" class="te-swatch" id="cv--muted" data-var="--muted"/><input class="te-hex" id="ch--muted" placeholder="#64748b"/></div></div>
            <div class="te-color-row"><label>Border</label><div class="te-swatch-wrap"><input type="color" class="te-swatch" id="cv--border" data-var="--border"/><input class="te-hex" id="ch--border" placeholder="#e2e8f0"/></div></div>
          </div>

          <div class="te-color-section">Accent / primary</div>
          <div class="te-color-grid">
            <div class="te-color-row"><label>Primary accent</label><div class="te-swatch-wrap"><input type="color" class="te-swatch" id="cv--blue" data-var="--blue"/><input class="te-hex" id="ch--blue" placeholder="#2563eb"/></div></div>
            <div class="te-color-row"><label>Accent dark</label><div class="te-swatch-wrap"><input type="color" class="te-swatch" id="cv--blue-dark" data-var="--blue-dark"/><input class="te-hex" id="ch--blue-dark" placeholder="#1d4ed8"/></div></div>
            <div class="te-color-row"><label>Accent light fill</label><div class="te-swatch-wrap"><input type="color" class="te-swatch" id="cv--blue-light" data-var="--blue-light"/><input class="te-hex" id="ch--blue-light" placeholder="#eff6ff"/></div></div>
          </div>

          <div class="te-color-section">Sidebar</div>
          <div class="te-color-grid">
            <div class="te-color-row"><label>Sidebar background</label><div class="te-swatch-wrap"><input type="color" class="te-swatch" id="cv--sidebar" data-var="--sidebar"/><input class="te-hex" id="ch--sidebar" placeholder="#0f1629"/></div></div>
            <div class="te-color-row"><label>Active item border</label><div class="te-swatch-wrap"><input type="color" class="te-swatch" id="cv--sidebar-active-border" data-var="--sidebar-active-border"/><input class="te-hex" id="ch--sidebar-active-border" placeholder="#3b82f6"/></div></div>
          </div>

          <div style="display:flex;gap:.6rem;flex-wrap:wrap;margin-top:1.1rem">
            <button class="btn btn-primary" onclick="ThemeEditor.saveCustom()">💾 Save theme</button>
            <button class="btn btn-outline" onclick="ThemeEditor.previewCurrent()">👁 Preview</button>
            <button class="btn btn-outline" onclick="ThemeEditor.resetEditor()">↺ Reset</button>
          </div>
          <div class="msg ok" id="te-save-ok"></div>
          <div class="msg err" id="te-save-err"></div>
        </div>

        <!-- Mini preview -->
        <div class="te-section-label" style="margin-top:1rem">Live preview</div>
        <div id="te-preview-box" class="te-preview"></div>
      </div>

    </div>`;

    _injectStyles();
    _renderBuiltin(activeId);
    _renderCustomGrid();
    _loadEditorValues(PRESETS['dtc-light'].vars);
    _bindColorInputs();
    _renderMiniPreview();
  };

  const _injectStyles = () => {
    if (document.getElementById('te-styles')) return;
    const s = document.createElement('style');
    s.id = 'te-styles';
    s.textContent = `
      .te-section-label{font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:.7rem;display:flex;align-items:center;gap:.5rem}
      .te-preset-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.7rem}
      @media(max-width:700px){.te-preset-grid{grid-template-columns:1fr 1fr}}
      .te-preset-card{background:var(--white);border:2px solid var(--border);border-radius:12px;padding:.85rem;cursor:pointer;transition:all .18s;position:relative;overflow:hidden}
      .te-preset-card:hover{border-color:var(--blue);transform:translateY(-2px);box-shadow:0 4px 16px rgba(0,0,0,.08)}
      .te-preset-card.te-active{border-color:var(--blue);box-shadow:0 0 0 3px rgba(37,99,235,.1)}
      .te-active-badge{position:absolute;top:8px;right:8px;background:var(--blue);color:#fff;font-size:.58rem;font-weight:700;padding:2px 7px;border-radius:99px}
      .te-swatches{display:flex;gap:4px;margin-bottom:.65rem}
      .te-swatch-dot{width:18px;height:18px;border-radius:50%;border:1px solid rgba(0,0,0,.08)}
      .te-preset-name{font-size:.82rem;font-weight:700;color:var(--text)}
      .te-preset-desc{font-size:.7rem;color:var(--muted);margin-top:2px;line-height:1.4}
      .te-preset-actions{display:flex;gap:4px;margin-top:.7rem}
      .te-btn{padding:3px 9px;border-radius:6px;font-size:.68rem;font-weight:600;cursor:pointer;border:1.5px solid var(--border);background:var(--white);color:var(--muted);transition:all .15s;font-family:'Inter',sans-serif}
      .te-btn:hover{border-color:var(--blue);color:var(--blue)}
      .te-btn.danger:hover{border-color:var(--error);color:var(--error)}
      .te-color-section{font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:var(--blue);margin:.9rem 0 .5rem;padding:.25rem .6rem;background:var(--blue-light);border-radius:5px;display:inline-block}
      .te-color-grid{display:flex;flex-direction:column;gap:.45rem;margin-bottom:.4rem}
      .te-color-row{display:flex;align-items:center;justify-content:space-between;gap:.6rem}
      .te-color-row label{font-size:.74rem;font-weight:500;color:var(--text);margin:0;flex:1}
      .te-swatch-wrap{display:flex;align-items:center;gap:5px}
      .te-swatch{width:32px;height:28px;border:1.5px solid var(--border);border-radius:6px;cursor:pointer;padding:1px;background:none}
      .te-hex{width:88px;font-size:.74rem;padding:.3rem .5rem;font-family:'JetBrains Mono',monospace;border:1.5px solid var(--border);border-radius:6px;color:var(--text);background:var(--white);outline:none}
      .te-hex:focus{border-color:var(--blue)}
      .te-preview{background:var(--white);border:1px solid var(--border);border-radius:12px;overflow:hidden;box-shadow:var(--shadow)}
      .te-preview-sidebar{background:var(--sidebar);padding:10px 8px;display:flex;flex-direction:column;gap:4px;width:100px;flex-shrink:0}
      .te-preview-nav{padding:4px 7px;border-radius:5px;font-size:9px;font-weight:600;color:rgba(255,255,255,.5);cursor:default}
      .te-preview-nav.active{background:var(--sidebar-active-bg);color:#fff;border-left:2px solid var(--sidebar-active-border)}
      .te-preview-content{flex:1;padding:10px;background:var(--bg)}
      .te-preview-card{background:var(--white);border:1px solid var(--border);border-radius:7px;padding:8px;margin-bottom:6px}
      .te-preview-btn{background:var(--blue);color:#fff;border:none;border-radius:5px;padding:4px 10px;font-size:9px;font-weight:700;cursor:default}
      .te-preview-badge-g{background:var(--success-bg);border:1px solid var(--success-border);color:var(--success);border-radius:99px;padding:2px 6px;font-size:8px;font-weight:700}
      .te-preview-badge-w{background:var(--warn-bg);border:1px solid var(--warn-border);color:var(--warn);border-radius:99px;padding:2px 6px;font-size:8px;font-weight:700}
    `;
    document.head.appendChild(s);
  };

  const _renderBuiltin = (activeId) => {
    const grid = document.getElementById('te-builtin-grid');
    if (!grid) return;
    grid.innerHTML = Object.entries(PRESETS).map(([id, t]) => `
      <div class="te-preset-card" data-id="${id}" onclick="ThemeEditor.selectPreset('${id}')">
        ${id === activeId ? '<div class="te-active-badge">✓ Active</div>' : ''}
        <div class="te-swatches">
          ${t.preview.map(c=>`<div class="te-swatch-dot" style="background:${c}"></div>`).join('')}
        </div>
        <div class="te-preset-name">${t.name}</div>
        <div class="te-preset-desc">${t.description}</div>
        <div class="te-preset-actions">
          <button class="te-btn" onclick="event.stopPropagation();ThemeEditor.applyTheme('${id}')">Apply</button>
          <button class="te-btn" onclick="event.stopPropagation();ThemeEditor.loadIntoEditor('${id}')">Edit</button>
        </div>
      </div>`).join('');
  };

  const _renderCustomGrid = () => {
    const grid = document.getElementById('te-custom-grid');
    const none = document.getElementById('te-no-custom');
    const count = document.getElementById('te-custom-count');
    const custom = _loadCustom();
    const keys = Object.keys(custom);
    if (count) count.textContent = keys.length ? `(${keys.length})` : '';
    if (!keys.length) { if (grid) grid.innerHTML=''; if (none) none.style.display=''; return; }
    if (none) none.style.display='none';
    const activeId = localStorage.getItem(ACTIVE_KEY)||'';
    if (grid) grid.innerHTML = keys.map(id => {
      const t = custom[id];
      const prev = t.preview || [t.vars['--bg'],t.vars['--sidebar'],t.vars['--blue'],t.vars['--white']];
      return `<div class="te-preset-card" data-id="${id}" onclick="ThemeEditor.selectPreset('${id}')">
        ${id === activeId ? '<div class="te-active-badge">✓ Active</div>' : ''}
        <div class="te-swatches">${prev.map(c=>`<div class="te-swatch-dot" style="background:${c}"></div>`).join('')}</div>
        <div class="te-preset-name">${esc(t.name||id)}</div>
        <div class="te-preset-desc">${esc(t.description||'Custom theme')}</div>
        <div class="te-preset-actions">
          <button class="te-btn" onclick="event.stopPropagation();ThemeEditor.applyTheme('${id}')">Apply</button>
          <button class="te-btn" onclick="event.stopPropagation();ThemeEditor.loadIntoEditor('${id}')">Edit</button>
          <button class="te-btn danger" onclick="event.stopPropagation();ThemeEditor.deleteCustom('${id}')">Delete</button>
        </div>
      </div>`;
    }).join('');
  };

  const COLOR_VARS = ['--bg','--white','--text','--muted','--border','--blue','--blue-dark','--blue-light','--sidebar','--sidebar-active-border'];

  const _loadEditorValues = (vars) => {
    COLOR_VARS.forEach(v => {
      const sw  = document.getElementById('cv:' + v.slice(2)) || document.getElementById('cv-' + v.replace(/^--/,'').replace(/-/g,'_'));
      const hex = document.getElementById('ch-' + v.replace(/^--/,''));
      const val = vars[v] || '';
      // use data-var selector
      const swatch = document.querySelector(`.te-swatch[data-var="${v}"]`);
      const hexIn  = document.querySelector(`.te-hex[id="ch-${v.replace(/^--/,'')}"]`);
      if (swatch) { try { swatch.value = val.startsWith('#') ? val : '#ffffff'; } catch {} }
      if (hexIn)  hexIn.value = val;
    });
  };

  const _bindColorInputs = () => {
    document.querySelectorAll('.te-swatch').forEach(sw => {
      sw.addEventListener('input', () => {
        const v = sw.dataset.var;
        const hex = document.querySelector(`.te-hex[id="ch-${v.replace(/^--/,'')}"]`);
        if (hex) hex.value = sw.value;
        document.documentElement.style.setProperty(v, sw.value);
        _renderMiniPreview();
      });
    });
    document.querySelectorAll('.te-hex').forEach(h => {
      h.addEventListener('input', () => {
        const v = '--' + h.id.replace('ch-','');
        const sw = document.querySelector(`.te-swatch[data-var="${v}"]`);
        if (/^#[0-9a-fA-F]{6}$/.test(h.value)) {
          document.documentElement.style.setProperty(v, h.value);
          if (sw) { try { sw.value = h.value; } catch {} }
          _renderMiniPreview();
        }
      });
    });
  };

  const _getCurrentEditorVars = () => {
    const vars = {};
    // Copy all from active preset first
    const activeId = localStorage.getItem(ACTIVE_KEY) || 'dtc-light';
    const base = getAllThemes()[activeId] || PRESETS['dtc-light'];
    Object.assign(vars, base.vars);
    // Override with editor values
    document.querySelectorAll('.te-swatch').forEach(sw => {
      if (sw.value) vars[sw.dataset.var] = sw.value;
    });
    document.querySelectorAll('.te-hex').forEach(h => {
      const v = '--' + h.id.replace('ch-','');
      if (h.value) vars[v] = h.value;
    });
    return vars;
  };

  const _renderMiniPreview = () => {
    const box = document.getElementById('te-preview-box');
    if (!box) return;
    const root = document.documentElement;
    const g = (v) => getComputedStyle(root).getPropertyValue(v).trim() || root.style.getPropertyValue(v).trim();
    box.innerHTML = `<div style="display:flex;min-height:110px">
      <div style="background:${g('--sidebar')};padding:8px 6px;display:flex;flex-direction:column;gap:3px;width:90px;flex-shrink:0">
        <div style="display:flex;align-items:center;gap:5px;padding:4px 5px;margin-bottom:4px">
          <div style="width:18px;height:18px;background:${g('--blue')};border-radius:4px"></div>
          <div style="font-size:9px;font-weight:800;color:#fff">DTC</div>
        </div>
        <div style="padding:4px 5px;border-radius:4px;font-size:8px;font-weight:600;color:#fff;background:${g('--sidebar-active-bg')};border-left:2px solid ${g('--sidebar-active-border')}">⚡ Dashboard</div>
        <div style="padding:4px 5px;border-radius:4px;font-size:8px;color:rgba(255,255,255,.45)">👤 Customers</div>
        <div style="padding:4px 5px;border-radius:4px;font-size:8px;color:rgba(255,255,255,.45)">💰 Revenue</div>
        <div style="padding:4px 5px;border-radius:4px;font-size:8px;color:rgba(255,255,255,.45)">📦 Products</div>
      </div>
      <div style="flex:1;padding:8px;background:${g('--bg')};display:flex;flex-direction:column;gap:5px">
        <div style="display:flex;gap:4px">
          <div style="flex:1;background:${g('--white')};border:1px solid ${g('--border')};border-radius:5px;padding:5px 6px"><div style="font-size:8px;font-weight:700;color:${g('--text')}">$8,420</div><div style="font-size:7px;color:${g('--muted')}">Revenue</div></div>
          <div style="flex:1;background:${g('--white')};border:1px solid ${g('--border')};border-radius:5px;padding:5px 6px"><div style="font-size:8px;font-weight:700;color:${g('--blue')}">74</div><div style="font-size:7px;color:${g('--muted')}">Activated</div></div>
          <div style="flex:1;background:${g('--white')};border:1px solid ${g('--border')};border-radius:5px;padding:5px 6px"><div style="font-size:8px;font-weight:700;color:${g('--warn')}">3</div><div style="font-size:7px;color:${g('--muted')}">Expiring</div></div>
        </div>
        <div style="background:${g('--white')};border:1px solid ${g('--border')};border-radius:5px;padding:6px 7px;flex:1">
          <div style="font-size:7px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:${g('--muted')};margin-bottom:4px">Recent activations</div>
          <div style="display:flex;align-items:center;justify-content:space-between;padding:2px 0;border-bottom:1px solid ${g('--border')}">
            <div style="font-size:8px;font-weight:600;color:${g('--text')}">Aisha M.</div>
            <span style="background:${g('--success-bg')};border:1px solid ${g('--success-border')};color:${g('--success')};font-size:7px;font-weight:700;padding:1px 5px;border-radius:99px">Activated</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;padding:2px 0">
            <div style="font-size:8px;font-weight:600;color:${g('--text')}">Wei Chen</div>
            <span style="background:${g('--warn-bg')};border:1px solid ${g('--warn-border')};color:${g('--warn')};font-size:7px;font-weight:700;padding:1px 5px;border-radius:99px">Expiring</span>
          </div>
        </div>
        <button style="background:${g('--blue')};color:#fff;border:none;border-radius:5px;padding:4px 8px;font-size:8px;font-weight:700;cursor:default;width:fit-content">⚡ Generate Link</button>
      </div>
    </div>`;
  };

  // ── Public API ───────────────────────────────────────────────────────────────
  const selectPreset = (id) => {
    _highlightActive(id);
    loadIntoEditor(id);
  };

  const loadIntoEditor = (id) => {
    const all = getAllThemes();
    const t = all[id];
    if (!t) return;
    const nameEl = document.getElementById('te-name');
    const descEl = document.getElementById('te-desc');
    if (nameEl) nameEl.value = t.name + (PRESETS[id] ? ' (copy)' : '');
    if (descEl) descEl.value = t.description || '';
    _loadEditorValues(t.vars);
    _renderMiniPreview();
  };

  const previewCurrent = () => {
    applyVars(_getCurrentEditorVars());
    _renderMiniPreview();
  };

  const resetEditor = () => {
    const id = localStorage.getItem(ACTIVE_KEY) || 'dtc-light';
    loadIntoEditor(id);
    applyTheme(id);
  };

  const saveCustom = () => {
    const name = (document.getElementById('te-name')||{}).value?.trim();
    const desc = (document.getElementById('te-desc')||{}).value?.trim();
    const okEl  = document.getElementById('te-save-ok');
    const errEl = document.getElementById('te-save-err');
    if (okEl) { okEl.classList.remove('show'); }
    if (errEl){ errEl.classList.remove('show'); }
    if (!name) { if (errEl){ errEl.textContent='Please enter a theme name.'; errEl.classList.add('show'); } return; }
    const vars = _getCurrentEditorVars();
    const id   = 'custom-' + name.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
    const preview = [vars['--bg'],vars['--sidebar'],vars['--blue'],vars['--white']];
    const custom  = _loadCustom();
    custom[id] = { name, description: desc||'', preview, vars };
    _saveCustom(custom);
    applyTheme(id);
    _renderCustomGrid();
    if (okEl) { okEl.textContent = `✓ Theme "${name}" saved and applied!`; okEl.classList.add('show'); }
    setTimeout(()=>{ if(okEl) okEl.classList.remove('show'); }, 3000);
  };

  const deleteCustom = (id) => {
    if (!confirm('Delete this theme?')) return;
    const custom = _loadCustom();
    delete custom[id];
    _saveCustom(custom);
    // If active, revert to light
    if (localStorage.getItem(ACTIVE_KEY) === id) applyTheme('dtc-light');
    _renderCustomGrid();
  };

  const exportThemes = () => {
    const custom = _loadCustom();
    const blob = new Blob([JSON.stringify({version:1,themes:custom},null,2)],{type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'dtc-themes.json';
    a.click();
  };

  const importThemes = (input) => {
    const file = input.files[0];
    if (!file) return;
    const okEl  = document.getElementById('te-import-ok');
    const errEl = document.getElementById('te-import-err');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        const themes = data.themes || data;
        if (typeof themes !== 'object') throw new Error('Invalid format');
        const custom = _loadCustom();
        let count = 0;
        Object.entries(themes).forEach(([id,t]) => { if(t.name&&t.vars){ custom[id]=t; count++; } });
        _saveCustom(custom);
        _renderCustomGrid();
        if (okEl) { okEl.textContent=`✓ Imported ${count} theme(s).`; okEl.classList.add('show'); }
        setTimeout(()=>{ if(okEl) okEl.classList.remove('show'); }, 3000);
      } catch(err) {
        if (errEl) { errEl.textContent='Invalid theme file. Make sure it was exported from DTC Admin.'; errEl.classList.add('show'); }
      }
    };
    reader.readAsText(file);
    input.value='';
  };

  return { render, restoreTheme, applyTheme, loadIntoEditor, selectPreset, previewCurrent, resetEditor, saveCustom, deleteCustom, exportThemes, importThemes };
})();
