/* ─── DTC Admin — Application State Store ───────────────────────────────── */
'use strict';

var Store = (() => {
  let _adminKey      = '';
  let _staffToken    = '';
  let _role          = '';
  let _staffName     = '';
  let _products      = [];
  let _revenue       = { total: 0, byProduct: {}, byReseller: {}, resellerTotal: 0, directTotal: 0 };
  let _settings      = {};
  let _templates     = [];
  let _tokens        = {};
  let _emailLog      = [];
  let _instructions  = { sets: {} };
  let _dashFilter    = 'all';
  let _custFilter    = 'all';

  return {
    // ── Admin key (legacy — kept for backwards compat in modules) ────────────
    get adminKey()     { return _adminKey; },
    setAdminKey(k)     { _adminKey = k; },

    // ── Staff session token ───────────────────────────────────────────────────
    get staffToken()   { return _staffToken; },
    setStaffToken(t)   { _staffToken = t; },

    // ── Role ──────────────────────────────────────────────────────────────────
    get role()         { return _role; },
    setRole(r)         { _role = r; },

    // ── Staff name ────────────────────────────────────────────────────────────
    get staffName()    { return _staffName; },
    setStaffName(n)    { _staffName = n; },

    // ── Tokens (links) ───────────────────────────────────────────────────────
    get tokens()       { return _tokens; },
    setTokens(t)       { _tokens = t || {}; },

    // ── Email log ────────────────────────────────────────────────────────────
    get emailLog()     { return _emailLog; },
    setEmailLog(l)     { _emailLog = l || []; },

    // ── Instruction sets ──────────────────────────────────────────────────────
    get instructions() { return _instructions; },
    setInstructions(i) { _instructions = i || { sets: {} }; },
    upsertInstruction(set) { _instructions.sets[set.id] = set; },
    deleteInstruction(id)  { delete _instructions.sets[id]; },

    // ── Dashboard filter ──────────────────────────────────────────────────────
    get dashFilter()   { return _dashFilter; },
    setDashFilter(f)   { _dashFilter = f; },

    // ── Customer filter ───────────────────────────────────────────────────────
    get custFilter()   { return _custFilter; },
    setCustFilter(f)   { _custFilter = f; },

    // ── Products ──────────────────────────────────────────────────────────────
    get products()     { return _products; },
    setProducts(p)     { _products = p || []; },

    // ── Revenue ───────────────────────────────────────────────────────────────
    get revenue()      { return _revenue; },
    setRevenue(r)      { _revenue = r || { total: 0, byProduct: {}, byReseller: {}, resellerTotal: 0, directTotal: 0 }; },

    // ── Settings ──────────────────────────────────────────────────────────────
    get settings()     { return _settings; },
    setSettings(s)     { _settings = s || {}; },

    // ── Templates (for dropdowns) ─────────────────────────────────────────────
    get templates()    { return _templates; },
    setTemplates(t)    { _templates = t || []; },

    // ── Bulk load after login ─────────────────────────────────────────────────
    load({ tokens, emailLog, revenue, role, staffName }) {
      this.setTokens(tokens);
      this.setEmailLog(emailLog);
      if (revenue)   this.setRevenue(revenue);
      if (role)      this.setRole(role);
      if (staffName) this.setStaffName(staffName);
    },
  };
})();
