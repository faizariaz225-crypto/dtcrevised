/* ─── DTC Admin — Landing Page Editor ───────────────────────────────────── */
'use strict';

var Landing = (() => {

  let _current = {};

  // ── Load ─────────────────────────────────────────────────────────────────
  const load = async () => {
    try {
      const d = await api(`/admin/landing-content?adminKey=${encodeURIComponent(Store.adminKey)}`);
      _current = (d && !d.error) ? d : {};
      _render();
    } catch(e) {
      _render();
    }
  };

  const _g = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const _s = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined && val !== null) el.value = val; };
  const _safeJSON = (s, fb) => { try { return JSON.parse(s); } catch { return fb; } };

  // ── Save section ─────────────────────────────────────────────────────────
  const saveSection = async (section) => {
    const content = _collectSection(section);
    const d = await api('/admin/landing-content', { adminKey: Store.adminKey, content });
    showMsg('lp-ok-' + section, 'lp-err-' + section, d?.success,
      d?.success ? '✓ Saved! Changes are live.' : (d?.error || 'Failed to save.'));
    if (d?.success) { Object.assign(_current, content); _updatePreview(); }
  };

  const saveAll = async () => {
    const sections = ['hero','stats','solutions','products','pricing','about','testimonials','faq','contact','footer'];
    const content = {};
    sections.forEach(s => Object.assign(content, _collectSection(s)));
    const d = await api('/admin/landing-content', { adminKey: Store.adminKey, content });
    showMsg('lp-ok-all', 'lp-err-all', d?.success,
      d?.success ? '✓ All changes saved and live!' : (d?.error || 'Failed to save.'));
    if (d?.success) Object.assign(_current, content);
  };

  const _collectSection = (s) => {
    const c = {};
    if (s === 'hero') {
      c.companyName   = _g('lp-company-name');
      c.companyTagline= _g('lp-company-tagline');
      c.heroBadge     = _g('lp-hero-badge');
      c.heroTitle     = _g('lp-hero-title');
      c.heroSubtitle  = _g('lp-hero-sub');
      c.heroCta1      = _g('lp-cta1');
      c.heroCta2      = _g('lp-cta2');
    } else if (s === 'stats') {
      c.statCustomers   = _g('lp-stat-customers');
      c.statActivations = _g('lp-stat-activations');
      c.statTools       = _g('lp-stat-tools');
      c.statCountries   = _g('lp-stat-countries');
      c.statLabel1      = _g('lp-stat-lbl1');
      c.statLabel2      = _g('lp-stat-lbl2');
      c.statLabel3      = _g('lp-stat-lbl3');
      c.statLabel4      = _g('lp-stat-lbl4');
    } else if (s === 'solutions') {
      c.solutionsTitle    = _g('lp-solutions-title');
      c.solutionsSubtitle = _g('lp-solutions-sub');
      c.solutions = JSON.stringify(_collectRepeater('solutions-repeater', ['icon','title','desc']));
    } else if (s === 'products') {
      c.productsTitle    = _g('lp-products-title');
      c.productsSubtitle = _g('lp-products-sub');
      c.products = JSON.stringify(_collectRepeater('products-repeater', ['icon','name','category','desc','from','color']));
    } else if (s === 'pricing') {
      c.pricingTitle    = _g('lp-pricing-title');
      c.pricingSubtitle = _g('lp-pricing-sub');
      c.tiers = JSON.stringify(_collectPricingTiers());
    } else if (s === 'about') {
      c.aboutTitle    = _g('lp-about-title');
      c.aboutDesc     = _g('lp-about-desc');
      c.aboutFeatures = JSON.stringify(_collectRepeater('about-features-repeater', ['icon','title','desc']));
    } else if (s === 'testimonials') {
      c.testimonialsTitle = _g('lp-test-title');
      c.testimonials = JSON.stringify(_collectRepeater('test-repeater', ['name','role','product','quote']));
    } else if (s === 'faq') {
      c.faqTitle = _g('lp-faq-title');
      c.faqs = JSON.stringify(_collectRepeater('faq-repeater', ['q','a']));
    } else if (s === 'contact') {
      c.email       = _g('lp-email');
      c.whatsapp    = _g('lp-whatsapp');
      c.wechatQrUrl = _g('lp-wechat-qr');
    } else if (s === 'footer') {
      c.ctaTitle      = _g('lp-cta-title');
      c.ctaSubtitle   = _g('lp-cta-sub');
      c.ctaCta1       = _g('lp-cta-btn1');
      c.ctaCta2       = _g('lp-cta-btn2');
      c.copyrightText = _g('lp-copyright');
      c.navLinks      = _g('lp-nav-links');
      c.footerCols    = _g('lp-footer-cols');
    }
    return c;
  };

  const _collectRepeater = (id, fields) => {
    const wrap = document.getElementById(id); if (!wrap) return [];
    return [...wrap.querySelectorAll('.lp-rep-item')].map(item => {
      const obj = {};
      fields.forEach(f => {
        const el = item.querySelector(`[data-field="${f}"]`);
        obj[f] = el ? el.value.trim() : '';
      });
      return obj;
    }).filter(o => Object.values(o).some(v => v));
  };

  const _collectPricingTiers = () => {
    const wrap = document.getElementById('pricing-tiers-repeater'); if (!wrap) return [];
    return [...wrap.querySelectorAll('.lp-tier-item')].map(item => ({
      name:      item.querySelector('[data-field="name"]')?.value.trim() || '',
      desc:      item.querySelector('[data-field="desc"]')?.value.trim() || '',
      price:     item.querySelector('[data-field="price"]')?.value.trim() || '',
      period:    item.querySelector('[data-field="period"]')?.value.trim() || '/month',
      cta:       item.querySelector('[data-field="cta"]')?.value.trim() || 'Get started',
      highlight: item.querySelector('[data-field="highlight"]')?.checked || false,
      features:  (item.querySelector('[data-field="features"]')?.value || '').split('\n').map(s=>s.trim()).filter(Boolean),
    })).filter(t => t.name);
  };

  // ── Repeater helpers ──────────────────────────────────────────────────────
  const addRepItem = (containerId, fields, values = {}) => {
    const wrap = document.getElementById(containerId); if (!wrap) return;
    const div = document.createElement('div');
    div.className = 'lp-rep-item';
    div.style.cssText = 'background:var(--bg);border:1px solid var(--border);border-radius:9px;padding:.85rem;margin-bottom:.6rem;position:relative';
    div.innerHTML = fields.map(f => `
      <div style="margin-bottom:.5rem">
        <label style="font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);display:block;margin-bottom:.2rem">${f}</label>
        ${f === 'desc' || f === 'a' || f === 'features' ?
          `<textarea data-field="${f}" rows="${f==='features'?4:2}" style="width:100%;font-family:'Inter',sans-serif;font-size:.8rem;resize:vertical;padding:.4rem .6rem;border:1.5px solid var(--border);border-radius:7px;color:var(--text);background:var(--white);outline:none">${esc(values[f]||'')}</textarea>` :
          `<input data-field="${f}" value="${esc(values[f]||'')}" style="width:100%;font-size:.8rem;padding:.4rem .6rem;border:1.5px solid var(--border);border-radius:7px;color:var(--text);background:var(--white);outline:none"/>`
        }
      </div>`).join('') +
      `<button onclick="this.parentElement.remove()" style="position:absolute;top:.5rem;right:.6rem;background:none;border:none;cursor:pointer;color:var(--muted);font-size:.85rem;line-height:1" title="Remove">✕</button>`;
    wrap.appendChild(div);
  };

  const addTierItem = (values = {}) => {
    const wrap = document.getElementById('pricing-tiers-repeater'); if (!wrap) return;
    const div = document.createElement('div');
    div.className = 'lp-tier-item';
    div.style.cssText = 'background:var(--bg);border:1px solid var(--border);border-radius:9px;padding:.85rem;margin-bottom:.6rem;position:relative';
    div.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;margin-bottom:.5rem">
        <div><label style="font-size:.63rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);display:block;margin-bottom:.2rem">Name</label><input data-field="name" value="${esc(values.name||'')}" style="width:100%;font-size:.8rem;padding:.4rem .6rem;border:1.5px solid var(--border);border-radius:7px;color:var(--text);background:var(--white);outline:none"/></div>
        <div><label style="font-size:.63rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);display:block;margin-bottom:.2rem">Price (e.g. $35)</label><input data-field="price" value="${esc(values.price||'')}" style="width:100%;font-size:.8rem;padding:.4rem .6rem;border:1.5px solid var(--border);border-radius:7px;color:var(--text);background:var(--white);outline:none"/></div>
        <div><label style="font-size:.63rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);display:block;margin-bottom:.2rem">Period (e.g. /month)</label><input data-field="period" value="${esc(values.period||'/month')}" style="width:100%;font-size:.8rem;padding:.4rem .6rem;border:1.5px solid var(--border);border-radius:7px;color:var(--text);background:var(--white);outline:none"/></div>
        <div><label style="font-size:.63rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);display:block;margin-bottom:.2rem">CTA button text</label><input data-field="cta" value="${esc(values.cta||'Get started')}" style="width:100%;font-size:.8rem;padding:.4rem .6rem;border:1.5px solid var(--border);border-radius:7px;color:var(--text);background:var(--white);outline:none"/></div>
      </div>
      <div style="margin-bottom:.5rem"><label style="font-size:.63rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);display:block;margin-bottom:.2rem">Short description</label><input data-field="desc" value="${esc(values.desc||'')}" style="width:100%;font-size:.8rem;padding:.4rem .6rem;border:1.5px solid var(--border);border-radius:7px;color:var(--text);background:var(--white);outline:none"/></div>
      <div style="margin-bottom:.5rem"><label style="font-size:.63rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);display:block;margin-bottom:.2rem">Features (one per line)</label><textarea data-field="features" rows="4" style="width:100%;font-family:'Inter',sans-serif;font-size:.8rem;resize:vertical;padding:.4rem .6rem;border:1.5px solid var(--border);border-radius:7px;color:var(--text);background:var(--white);outline:none">${esc((values.features||[]).join('\n'))}</textarea></div>
      <label style="display:flex;align-items:center;gap:.5rem;font-size:.78rem;cursor:pointer;color:var(--text)"><input type="checkbox" data-field="highlight" ${values.highlight?'checked':''}/> Highlight this tier (most popular)</label>
      <button onclick="this.parentElement.remove()" style="position:absolute;top:.5rem;right:.6rem;background:none;border:none;cursor:pointer;color:var(--muted);font-size:.85rem;line-height:1" title="Remove">✕</button>`;
    wrap.appendChild(div);
  };

  // ── Render the full page ──────────────────────────────────────────────────
  const _render = () => {
    const el = document.getElementById('page-landing'); if (!el) return;
    const c = _current;
    const safeJ = (key, fb) => _safeJSON(c[key], fb);
    const secCard = (title, sectionId, content) => `
      <div class="setting-block" style="margin-bottom:1.2rem">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem">
          <div class="setting-block-title" style="font-size:.88rem;font-weight:700">${title}</div>
          <div style="display:flex;gap:.5rem;align-items:center">
            <div class="msg ok" id="lp-ok-${sectionId}" style="margin:0;font-size:.72rem"></div>
            <div class="msg err" id="lp-err-${sectionId}" style="margin:0;font-size:.72rem"></div>
            <button class="btn btn-primary btn-sm" onclick="Landing.saveSection('${sectionId}')">Save section</button>
          </div>
        </div>
        ${content}
      </div>`;

    el.innerHTML = `
    <div class="ph">
      <div class="ph-left">
        <div class="ph-title">Landing Page Editor</div>
        <div class="ph-sub">Every section is managed here. Changes go live instantly when you save.</div>
      </div>
      <div style="display:flex;gap:.6rem;align-items:center;flex-wrap:wrap">
        <button class="btn btn-outline btn-sm" onclick="Landing.openLandingPage()">👁 Preview live</button>
        <button class="btn btn-primary btn-sm" onclick="Landing.saveAll()">💾 Save all changes</button>
      </div>
    </div>
    <div class="msg ok" id="lp-ok-all" style="margin-bottom:1rem"></div>
    <div class="msg err" id="lp-err-all" style="margin-bottom:1rem"></div>

    ${secCard('🏢 Brand & Company', 'hero', `
      <div class="form-row">
        <div class="form-group"><label>Company name</label><input id="lp-company-name" value="${esc(c.companyName||'DTC')}"/></div>
        <div class="form-group"><label>Company tagline (footer)</label><input id="lp-company-tagline" value="${esc(c.companyTagline||'')}"/></div>
      </div>
      <div class="form-group"><label>Hero badge text</label><input id="lp-hero-badge" value="${esc(c.heroBadge||'')}"/></div>
      <div class="form-group"><label>Hero headline (HTML allowed — use &lt;em&gt; for blue text)</label><input id="lp-hero-title" value="${esc(c.heroTitle||'')}"/></div>
      <div class="form-group"><label>Hero subtitle</label><textarea id="lp-hero-sub" rows="3" style="font-family:'Inter',sans-serif">${esc(c.heroSubtitle||'')}</textarea></div>
      <div class="form-row">
        <div class="form-group"><label>CTA button 1 text</label><input id="lp-cta1" value="${esc(c.heroCta1||'View Plans')}"/></div>
        <div class="form-group"><label>CTA button 2 text</label><input id="lp-cta2" value="${esc(c.heroCta2||'Talk to Sales')}"/></div>
      </div>
    `)}

    ${secCard('📊 Stats Bar', 'stats', `
      <div class="form-row">
        <div class="form-group"><label>Customers value</label><input id="lp-stat-customers" value="${esc(c.statCustomers||'2,000+')}"/></div>
        <div class="form-group"><label>Customers label</label><input id="lp-stat-lbl1" value="${esc(c.statLabel1||'Active clients')}"/></div>
        <div class="form-group"><label>Activations value</label><input id="lp-stat-activations" value="${esc(c.statActivations||'10,000+')}"/></div>
        <div class="form-group"><label>Activations label</label><input id="lp-stat-lbl2" value="${esc(c.statLabel2||'Accounts activated')}"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Tools value</label><input id="lp-stat-tools" value="${esc(c.statTools||'100+')}"/></div>
        <div class="form-group"><label>Tools label</label><input id="lp-stat-lbl3" value="${esc(c.statLabel3||'Tools available')}"/></div>
        <div class="form-group"><label>Countries value</label><input id="lp-stat-countries" value="${esc(c.statCountries||'50+')}"/></div>
        <div class="form-group"><label>Countries label</label><input id="lp-stat-lbl4" value="${esc(c.statLabel4||'Countries served')}"/></div>
      </div>
    `)}

    ${secCard('🎯 Solutions Section', 'solutions', `
      <div class="form-row">
        <div class="form-group"><label>Section title</label><input id="lp-solutions-title" value="${esc(c.solutionsTitle||'')}"/></div>
        <div class="form-group"><label>Subtitle</label><input id="lp-solutions-sub" value="${esc(c.solutionsSubtitle||'')}"/></div>
      </div>
      <div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:var(--muted);margin-bottom:.6rem">Solution cards</div>
      <div id="solutions-repeater"></div>
      <button class="btn btn-ghost-blue btn-sm" onclick="Landing.addSolution()">+ Add solution card</button>
    `)}

    ${secCard('📦 Products Grid', 'products', `
      <div class="form-row">
        <div class="form-group"><label>Section title (HTML allowed)</label><input id="lp-products-title" value="${esc(c.productsTitle||'')}"/></div>
        <div class="form-group"><label>Subtitle</label><input id="lp-products-sub" value="${esc(c.productsSubtitle||'')}"/></div>
      </div>
      <div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:var(--muted);margin-bottom:.6rem">Products (icon, name, category, description, from price, hex colour)</div>
      <div id="products-repeater"></div>
      <button class="btn btn-ghost-blue btn-sm" onclick="Landing.addProduct()">+ Add product</button>
    `)}

    ${secCard('💰 Pricing Tiers', 'pricing', `
      <div class="form-row">
        <div class="form-group"><label>Section title</label><input id="lp-pricing-title" value="${esc(c.pricingTitle||'')}"/></div>
        <div class="form-group"><label>Subtitle</label><input id="lp-pricing-sub" value="${esc(c.pricingSubtitle||'')}"/></div>
      </div>
      <div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:var(--muted);margin-bottom:.6rem">Pricing tiers</div>
      <div id="pricing-tiers-repeater"></div>
      <button class="btn btn-ghost-blue btn-sm" onclick="Landing.addTier()">+ Add pricing tier</button>
    `)}

    ${secCard('🏆 About Section', 'about', `
      <div class="form-row">
        <div class="form-group"><label>Title (HTML allowed)</label><input id="lp-about-title" value="${esc(c.aboutTitle||'')}"/></div>
      </div>
      <div class="form-group"><label>Body text</label><textarea id="lp-about-desc" rows="3" style="font-family:'Inter',sans-serif">${esc(c.aboutDesc||'')}</textarea></div>
      <div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:var(--muted);margin-bottom:.6rem">Feature points</div>
      <div id="about-features-repeater"></div>
      <button class="btn btn-ghost-blue btn-sm" onclick="Landing.addAboutFeature()">+ Add feature point</button>
    `)}

    ${secCard('💬 Testimonials', 'testimonials', `
      <div class="form-group"><label>Section title (HTML allowed for &lt;em&gt; blue text)</label><input id="lp-test-title" value="${esc(c.testimonialsTitle||'')}"/></div>
      <div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:var(--muted);margin-bottom:.6rem">Reviews (name, role, product, quote)</div>
      <div id="test-repeater"></div>
      <button class="btn btn-ghost-blue btn-sm" onclick="Landing.addTestimonial()">+ Add testimonial</button>
    `)}

    ${secCard('❓ FAQ', 'faq', `
      <div class="form-group"><label>Section title</label><input id="lp-faq-title" value="${esc(c.faqTitle||'')}"/></div>
      <div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:var(--muted);margin-bottom:.6rem">Questions & answers</div>
      <div id="faq-repeater"></div>
      <button class="btn btn-ghost-blue btn-sm" onclick="Landing.addFaq()">+ Add FAQ item</button>
    `)}

    ${secCard('📞 Contact & WeChat', 'contact', `
      <div class="form-row">
        <div class="form-group"><label>Email address</label><input id="lp-email" type="email" value="${esc(c.email||'')}"/></div>
        <div class="form-group"><label>WhatsApp number</label><input id="lp-whatsapp" value="${esc(c.whatsapp||'')}"/></div>
      </div>
      <div class="form-group">
        <label>WeChat QR code</label>
        <div style="display:flex;gap:.75rem;align-items:flex-start;flex-wrap:wrap">
          <div style="flex:1;min-width:200px"><input id="lp-wechat-qr" placeholder="Paste image URL or upload below…" value="${esc(c.wechatQrUrl||'')}"/></div>
          ${c.wechatQrUrl ? `<img src="${esc(c.wechatQrUrl)}" style="width:72px;height:72px;object-fit:cover;border-radius:8px;border:1px solid var(--border)" id="lp-qr-preview"/>` : '<div id="lp-qr-preview"></div>'}
        </div>
        <div style="margin-top:.5rem;display:flex;gap:.5rem;align-items:center">
          <label class="btn btn-outline btn-sm" style="cursor:pointer;display:inline-flex">Upload QR image <input type="file" accept="image/*" onchange="Landing.handleQrUpload(this)" style="display:none"/></label>
          <span style="font-size:.7rem;color:var(--muted)">Max 500 KB, stored as base64</span>
        </div>
      </div>
    `)}

    ${secCard('🔗 CTA Band & Footer', 'footer', `
      <div class="form-row">
        <div class="form-group"><label>CTA band title</label><input id="lp-cta-title" value="${esc(c.ctaTitle||'')}"/></div>
        <div class="form-group"><label>CTA band subtitle</label><input id="lp-cta-sub" value="${esc(c.ctaSubtitle||'')}"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>CTA button 1 text</label><input id="lp-cta-btn1" value="${esc(c.ctaCta1||'')}"/></div>
        <div class="form-group"><label>CTA button 2 text</label><input id="lp-cta-btn2" value="${esc(c.ctaCta2||'')}"/></div>
      </div>
      <div class="form-group"><label>Copyright text</label><input id="lp-copyright" value="${esc(c.copyrightText||'')}"/></div>
      <div class="form-group"><label>Nav links (JSON array of {label, href})</label><textarea id="lp-nav-links" rows="6" style="font-family:'JetBrains Mono',monospace;font-size:.75rem">${esc(c.navLinks||'[]')}</textarea></div>
      <div class="form-group"><label>Footer columns (JSON array of {title, links:[{label,href}]})</label><textarea id="lp-footer-cols" rows="10" style="font-family:'JetBrains Mono',monospace;font-size:.75rem">${esc(c.footerCols||'[]')}</textarea></div>
    `)}`;

    // Populate repeaters
    const sols = safeJ('solutions', []);
    sols.forEach(s => addRepItem('solutions-repeater', ['icon','title','desc'], s));
    if (!sols.length) {
      [['🎓','Academic & Research','Students and researchers get affordable access to AI writing and research tools.'],
       ['💼','Enterprise Teams','Bulk subscriptions for companies with centralised billing.']].forEach(([icon,title,desc]) =>
        addRepItem('solutions-repeater', ['icon','title','desc'], {icon,title,desc}));
    }

    const prods = safeJ('products', []);
    prods.forEach(p => addRepItem('products-repeater', ['icon','name','category','desc','from','color'], p));
    if (!prods.length)
      addRepItem('products-repeater', ['icon','name','category','desc','from','color'], {icon:'⚡',name:'Claude Pro',category:'AI Chat',desc:'Extended context and priority access.',from:'$15',color:'#2563eb'});

    const tiers = safeJ('tiers', []);
    tiers.forEach(t => addTierItem(t));
    if (!tiers.length)
      addTierItem({name:'Professional',price:'$35',period:'/month',desc:'Most popular for researchers',features:['3 AI subscriptions','Priority support','Same-day activation'],cta:'Get started',highlight:true});

    const aboutF = safeJ('aboutFeatures', []);
    aboutF.forEach(f => addRepItem('about-features-repeater', ['icon','title','desc'], f));
    if (!aboutF.length)
      addRepItem('about-features-repeater', ['icon','title','desc'], {icon:'✓',title:'Official access',desc:'Every account is real and personal — never shared.'});

    const tests = safeJ('testimonials', []);
    tests.forEach(t => addRepItem('test-repeater', ['name','role','product','quote'], t));
    if (!tests.length)
      addRepItem('test-repeater', ['name','role','product','quote'], {name:'Aisha M.',role:'PhD Student, Nigeria',product:'Claude Pro',quote:'Activated within 2 hours. Highly recommended.'});

    const faqs = safeJ('faqs', []);
    faqs.forEach(f => addRepItem('faq-repeater', ['q','a'], f));
    if (!faqs.length)
      addRepItem('faq-repeater', ['q','a'], {q:'How does activation work?',a:'After payment is verified, we send a personal activation link by email.'});
  };

  // ── Update preview ────────────────────────────────────────────────────────
  const _updatePreview = () => {};

  // ── Public add helpers ────────────────────────────────────────────────────
  const addSolution    = () => addRepItem('solutions-repeater', ['icon','title','desc'], {icon:'🔧',title:'',desc:''});
  const addProduct     = () => addRepItem('products-repeater', ['icon','name','category','desc','from','color'], {icon:'🔧',color:'#2563eb'});
  const addTier        = () => addTierItem({name:'',price:'$0',period:'/month',features:[],cta:'Get started'});
  const addAboutFeature= () => addRepItem('about-features-repeater', ['icon','title','desc'], {icon:'✓'});
  const addTestimonial = () => addRepItem('test-repeater', ['name','role','product','quote'], {});
  const addFaq         = () => addRepItem('faq-repeater', ['q','a'], {});

  const handleQrUpload = (input) => {
    const file = input.files?.[0]; if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image.'); return; }
    if (file.size > 600*1024) { alert('Image must be under 600 KB.'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const el = document.getElementById('lp-wechat-qr'); if (el) el.value = e.target.result;
      const prev = document.getElementById('lp-qr-preview');
      if (prev) prev.innerHTML = `<img src="${e.target.result}" style="width:72px;height:72px;object-fit:cover;border-radius:8px;border:1px solid var(--border)"/>`;
    };
    reader.readAsDataURL(file);
  };

  const openLandingPage = () => window.open('/', '_blank');

  // Expose for buttons that call Landing.save() (legacy)
  const save = () => saveAll();
  const reset = () => { if (confirm('Reload current saved content?')) { _current = {}; _render(); load(); } };

  return { load, save, saveAll, saveSection, reset, handleQrUpload, openLandingPage,
           addSolution, addProduct, addTier, addAboutFeature, addTestimonial, addFaq };
})();
