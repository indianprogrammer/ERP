const INVOICE_THEMES = {
  classic: { label: 'Classic Blue', desc: 'Traditional blue header, bordered table — suits most GST invoices', accent: '#1A56DB', headBg: '#1A56DB', thBg: '#E8F0FE', border: '#C6D4F5' },
  'band-navy': { label: 'Navy', desc: 'Deep navy band, formal & authoritative', accent: '#1A3A6B', headBg: '#1A3A6B', thBg: '#E3EAF6', border: '#C9D6EC' },
  'band-ocean': { label: 'Ocean', desc: 'Bright ocean blue with pale sky table', accent: '#0277BD', headBg: '#0277BD', thBg: '#E1F5FE', border: '#B3E5FC' },
  'band-teal': { label: 'Teal', desc: 'Teal band — clean tech-services feel', accent: '#00796B', headBg: '#00796B', thBg: '#E0F2F1', border: '#B2DFDB' },
  green: { label: 'Verdant', desc: 'Green header band — eco / services feel', accent: '#0B8043', headBg: '#0B8043', thBg: '#E6F4EA', border: '#B7DFC6' },
  'band-forest': { label: 'Forest', desc: 'Deep olive-forest band, earthy & steady', accent: '#33691E', headBg: '#33691E', thBg: '#F1F8E9', border: '#DCEDC8' },
  'band-crimson': { label: 'Crimson', desc: 'Bold crimson band that demands attention', accent: '#C62828', headBg: '#C62828', thBg: '#FFEBEE', border: '#FFCDD2' },
  'band-ruby': { label: 'Ruby', desc: 'Magenta-ruby band — vibrant & premium', accent: '#AD1457', headBg: '#AD1457', thBg: '#FCE4EC', border: '#F8BBD0' },
  'band-amber': { label: 'Amber', desc: 'Warm amber band with dark orange type', accent: '#E65100', headBg: '#E65100', thBg: '#FFF3E0', border: '#FFE0B2' },
  'band-plum': { label: 'Plum', desc: 'Rich plum band — creative agencies', accent: '#8E24AA', headBg: '#8E24AA', thBg: '#F3E5F5', border: '#E1BEE7' },
  'band-slate': { label: 'Slate', desc: 'Industrial slate band, no-nonsense', accent: '#455A64', headBg: '#455A64', thBg: '#ECEFF1', border: '#CFD8DC' },
  'band-indigo': { label: 'Indigo', desc: 'Corporate indigo with lavender table', accent: '#283593', headBg: '#283593', thBg: '#E8EAF6', border: '#C5CAE9' },
  modern: { label: 'Modern Dark', desc: 'Charcoal header, red accent stripe — flat & minimal', accent: '#EA4335', headBg: '#202124', thBg: '#202124', border: '#E5E7EB' },
  'dark-midnight': { label: 'Midnight', desc: 'Near-black navy header, steel blue accents', accent: '#1565C0', headBg: '#0D1B2A', thBg: '#0D1B2A', border: '#1E3A5F' },
  'dark-graphite': { label: 'Graphite', desc: 'Grey-graphite header, soft silver accents', accent: '#90A4AE', headBg: '#37474F', thBg: '#37474F', border: '#CFD8DC' },
  'dark-obsidian': { label: 'Obsidian', desc: 'Pure black header with gold accents', accent: '#FFB300', headBg: '#000000', thBg: '#000000', border: '#424242' },
  'dark-slate': { label: 'Dark Slate', desc: 'Blue-grey dark header, cyan highlights', accent: '#26C6DA', headBg: '#263238', thBg: '#263238', border: '#455A64' },
  'dark-onyx': { label: 'Onyx', desc: 'Soft-black header, signal-red totals', accent: '#E53935', headBg: '#1A1A1A', thBg: '#1A1A1A', border: '#424242' },
  'mini-ink': { label: 'Minimal Ink', desc: 'No header fill — thin ink rules only', accent: '#202124', border: '#E0E0E0' },
  'mini-blue': { label: 'Minimal Blue', desc: 'White header, blue underline accents', accent: '#1565C0', border: '#E3F2FD' },
  'mini-emerald': { label: 'Minimal Emerald', desc: 'Clean white with green hairlines', accent: '#2E7D32', border: '#E8F5E9' },
  'mini-crimson': { label: 'Minimal Crimson', desc: 'Sparse layout, red total line', accent: '#C62828', border: '#FFEBEE' },
  'mini-amber': { label: 'Minimal Amber', desc: 'Airy layout, burnt-orange accents', accent: '#EF6C00', border: '#FFF3E0' },
  'mini-violet': { label: 'Minimal Violet', desc: 'Whitespace-first with violet rules', accent: '#6A1B9A', border: '#F3E5F5' },
  'mini-teal': { label: 'Minimal Teal', desc: 'Light & modern teal hairlines', accent: '#00838F', border: '#E0F2F1' },
  'mini-gray': { label: 'Minimal Gray', desc: 'Monotone grey — maximum neutrality', accent: '#616161', border: '#EEEEEE' },
  'out-blue': { label: 'Outline Blue', desc: 'Fully boxed blue borders on white', accent: '#1565C0', border: '#BBDEFB' },
  'out-red': { label: 'Outline Red', desc: 'Crisp red frame, airy interior', accent: '#C62828', border: '#FFCDD2' },
  'out-green': { label: 'Outline Green', desc: 'Green wireframe border style', accent: '#2E7D32', border: '#C8E6C9' },
  'out-amber': { label: 'Outline Amber', desc: 'Orange outline — friendly & warm', accent: '#EF6C00', border: '#FFE0B2' },
  'out-violet': { label: 'Outline Violet', desc: 'Purple framed blocks', accent: '#6A1B9A', border: '#E1BEE7' },
  'out-teal': { label: 'Outline Teal', desc: 'Teal wireframe, technical feel', accent: '#00838F', border: '#B2DFDB' },
  'strip-blue': { label: 'Strip Blue', desc: 'Thin blue crown over white header', accent: '#1565C0', border: '#E3F2FD' },
  'strip-red': { label: 'Strip Red', desc: 'Red top-rule, otherwise plain', accent: '#C62828', border: '#FFEBEE' },
  'strip-green': { label: 'Strip Green', desc: 'Green crown stripe, light rows', accent: '#2E7D32', border: '#E8F5E9' },
  'strip-amber': { label: 'Strip Amber', desc: 'Orange crown, soft peach rows', accent: '#EF6C00', border: '#FFF3E0' },
  'strip-violet': { label: 'Strip Violet', desc: 'Purple top-rule on white', accent: '#6A1B9A', border: '#F3E5F5' },
  'strip-teal': { label: 'Strip Teal', desc: 'Teal crown, calm & clinical', accent: '#00838F', border: '#E0F2F1' },
  'grad-sunrise': { label: 'Sunrise', desc: 'Orange→red gradient header', accent: '#F57C00', headBg: '#F57C00', headBg2: '#E53935', thBg: '#FFF3E0', border: '#FFCCBC' },
  'grad-ocean': { label: 'Ocean Mist', desc: 'Blue→cyan gradient header', accent: '#0277BD', headBg: '#0277BD', headBg2: '#00ACC1', thBg: '#E1F5FE', border: '#B3E5FC' },
  'grad-violet': { label: 'Violet Dusk', desc: 'Purple→magenta gradient header', accent: '#6A1B9A', headBg: '#6A1B9A', headBg2: '#E040FB', thBg: '#F3E5F5', border: '#E1BEE7' },
  'grad-forest': { label: 'Emerald Flow', desc: 'Green→lime gradient header', accent: '#2E7D32', headBg: '#2E7D32', headBg2: '#7CB342', thBg: '#E8F5E9', border: '#C8E6C9' },
  'ctr-classic': { label: 'Centered Blue', desc: 'Symmetric centred layout, blue band', accent: '#1A56DB', headBg: '#1A56DB', thBg: '#E8F0FE', border: '#C6D4F5' },
  'ctr-navy': { label: 'Centered Navy', desc: 'Centred formal navy, invitation feel', accent: '#1A3A6B', headBg: '#1A3A6B', thBg: '#E3EAF6', border: '#C9D6EC' },
  'ctr-crimson': { label: 'Centered Crimson', desc: 'Centred red band, bold statement', accent: '#C62828', headBg: '#C62828', thBg: '#FFEBEE', border: '#FFCDD2' },
  'ctr-emerald': { label: 'Centered Emerald', desc: 'Centred green band, balanced & calm', accent: '#0B8043', headBg: '#0B8043', thBg: '#E6F4EA', border: '#B7DFC6' },
  'box-blue': { label: 'Boxed Blue', desc: 'Whole invoice inside a blue card', accent: '#1A56DB', headBg: '#1A56DB', thBg: '#E8F0FE', border: '#C6D4F5' },
  'box-emerald': { label: 'Boxed Emerald', desc: 'Green card border, soft interior', accent: '#0B8043', headBg: '#0B8043', thBg: '#E6F4EA', border: '#B7DFC6' },
  'sb-blue': { label: 'Executive Blue', desc: 'Heavy sidebar stripe, navy header', accent: '#4FC3F7', headBg: '#10265E', thBg: '#E3EAF6', border: '#C9D6EC' },
  'sb-dark': { label: 'Executive Dark', desc: 'Dark header with warm sidebar edge', accent: '#FF8A65', headBg: '#263238', thBg: '#ECEFF1', border: '#CFD8DC' },
  'serif-ivory': { label: 'Ivory Serif', desc: 'Cream header, serif body — classic letterpress', accent: '#8D6E63', headBg: '#FFF8E1', headFg: '#3E2723', thBg: '#EFEBE9', border: '#D7CCC8', font: 'serif' },
  'serif-midnight': { label: 'Midnight Serif', desc: 'Indigo header, serif type, gold totals', accent: '#FFD54F', headBg: '#1A237E', headFg: '#E8EAF6', thBg: '#E8EAF6', border: '#9FA8DA', font: 'serif' },
  'serif-sage': { label: 'Sage Serif', desc: 'Pale green header, botanical serif', accent: '#558B2F', headBg: '#E8F5E9', headFg: '#33691E', thBg: '#F1F8E9', border: '#DCEDC8', font: 'serif' },
  'serif-burgundy': { label: 'Burgundy Serif', desc: 'Plum header, lilac type — wine-label luxe', accent: '#CE93D8', headBg: '#4A148C', headFg: '#F3E5F5', thBg: '#F3E5F5', border: '#E1BEE7', font: 'serif' },
  'mono-ledger': { label: 'Mono Ledger', desc: 'Monospace typewriter ledger — utility look', accent: '#000000', headBg: '#000000', thBg: '#F5F5F5', border: '#BDBDBD', font: 'mono' }
};

const RECEIPT_THEMES = {
  simple: { label: 'Simple Ink', desc: 'Plain compact receipt — print friendly', accent: '#202124', variant: 'plain' },
  'plain-blue': { label: 'Plain Blue', desc: 'Minimal receipt with blue rule', accent: '#1565C0', variant: 'plain' },
  'plain-green': { label: 'Plain Green', desc: 'Minimal receipt, green accents', accent: '#2E7D32', variant: 'plain' },
  'plain-crimson': { label: 'Plain Crimson', desc: 'Minimal receipt, red accents', accent: '#C62828', variant: 'plain' },
  'plain-amber': { label: 'Plain Amber', desc: 'Minimal receipt, orange accents', accent: '#EF6C00', variant: 'plain' },
  'plain-violet': { label: 'Plain Violet', desc: 'Minimal receipt, purple accents', accent: '#6A1B9A', variant: 'plain' },
  'plain-teal': { label: 'Plain Teal', desc: 'Minimal receipt, teal accents', accent: '#00838F', variant: 'plain' },
  'plain-charcoal': { label: 'Plain Charcoal', desc: 'Minimal receipt, slate accents', accent: '#455A64', variant: 'plain' },
  boxed: { label: 'Boxed Blue', desc: 'Card-style bordered receipt with accent header', accent: '#1A56DB', headBg: '#1A56DB', variant: 'boxed' },
  'boxed-navy': { label: 'Boxed Navy', desc: 'Deep navy card receipt', accent: '#1A3A6B', headBg: '#1A3A6B', variant: 'boxed' },
  'boxed-teal': { label: 'Boxed Teal', desc: 'Teal card receipt', accent: '#00796B', headBg: '#00796B', variant: 'boxed' },
  'boxed-emerald': { label: 'Boxed Emerald', desc: 'Green card receipt', accent: '#0B8043', headBg: '#0B8043', variant: 'boxed' },
  'boxed-crimson': { label: 'Boxed Crimson', desc: 'Red card receipt', accent: '#C62828', headBg: '#C62828', variant: 'boxed' },
  'boxed-amber': { label: 'Boxed Amber', desc: 'Orange card receipt', accent: '#E65100', headBg: '#E65100', variant: 'boxed' },
  'boxed-violet': { label: 'Boxed Violet', desc: 'Purple card receipt', accent: '#6A1B9A', headBg: '#6A1B9A', variant: 'boxed' },
  'boxed-charcoal': { label: 'Boxed Charcoal', desc: 'Dark grey card receipt', accent: '#37474F', headBg: '#37474F', variant: 'boxed' },
  thermal: { label: 'Thermal', desc: 'Narrow 80mm-style strip for POS printers', accent: '#000000', variant: 'thermal' },
  'thermal-blue': { label: 'Thermal Blue', desc: '80mm strip with blue ink', accent: '#1565C0', variant: 'thermal' },
  'thermal-green': { label: 'Thermal Green', desc: '80mm strip with green ink', accent: '#2E7D32', variant: 'thermal' },
  'thermal-red': { label: 'Thermal Red', desc: '80mm strip with red ink', accent: '#C62828', variant: 'thermal' },
  'rc-strip-blue': { label: 'Strip Blue', desc: 'Thin blue crown over plain body', accent: '#1565C0', variant: 'strip' },
  'rc-strip-red': { label: 'Strip Red', desc: 'Red top-rule receipt', accent: '#C62828', variant: 'strip' },
  'rc-strip-green': { label: 'Strip Green', desc: 'Green top-rule receipt', accent: '#2E7D32', variant: 'strip' },
  'rc-strip-amber': { label: 'Strip Amber', desc: 'Orange top-rule receipt', accent: '#EF6C00', variant: 'strip' },
  'rc-strip-violet': { label: 'Strip Violet', desc: 'Purple top-rule receipt', accent: '#6A1B9A', variant: 'strip' },
  'rc-strip-teal': { label: 'Strip Teal', desc: 'Teal top-rule receipt', accent: '#00838F', variant: 'strip' },
  'rc-ctr-blue': { label: 'Centered Blue', desc: 'All-centred blue layout', accent: '#1A56DB', headBg: '#1A56DB', variant: 'centered' },
  'rc-ctr-green': { label: 'Centered Green', desc: 'All-centred green layout', accent: '#0B8043', headBg: '#0B8043', variant: 'centered' },
  'rc-ctr-crimson': { label: 'Centered Crimson', desc: 'All-centred red layout', accent: '#C62828', headBg: '#C62828', variant: 'centered' },
  'rc-ctr-amber': { label: 'Centered Amber', desc: 'All-centred orange layout', accent: '#E65100', headBg: '#E65100', variant: 'centered' },
  'rc-ctr-navy': { label: 'Centered Navy', desc: 'All-centred navy layout', accent: '#1A3A6B', headBg: '#1A3A6B', variant: 'centered' },
  'rc-mini-ink': { label: 'Bare Ink', desc: 'Bare-bones grey lines, zero colour', accent: '#202124', variant: 'minimal' },
  'rc-mini-blue': { label: 'Bare Blue', desc: 'Ultra-light blue receipt', accent: '#1565C0', variant: 'minimal' },
  'rc-mini-green': { label: 'Bare Green', desc: 'Ultra-light green receipt', accent: '#2E7D32', variant: 'minimal' },
  'rc-mini-crimson': { label: 'Bare Crimson', desc: 'Ultra-light red receipt', accent: '#C62828', variant: 'minimal' },
  'rc-mini-violet': { label: 'Bare Violet', desc: 'Ultra-light purple receipt', accent: '#6A1B9A', variant: 'minimal' },
  'rc-dark-charcoal': { label: 'Dark Charcoal', desc: 'Grey header band, silver accents', accent: '#B0BEC5', headBg: '#37474F', variant: 'dark' },
  'rc-dark-navy': { label: 'Dark Navy', desc: 'Midnight header, sky-blue accents', accent: '#64B5F6', headBg: '#0D1B2A', variant: 'dark' },
  'rc-dark-forest': { label: 'Dark Forest', desc: 'Deep green header, mint accents', accent: '#A5D6A7', headBg: '#1B5E20', variant: 'dark' },
  'rc-dark-ruby': { label: 'Dark Ruby', desc: 'Deep red header, rose accents', accent: '#F48FB1', headBg: '#B71C1C', variant: 'dark' },
  'rc-out-blue': { label: 'Outlined Blue', desc: 'Blue wireframe border receipt', accent: '#1565C0', variant: 'outlined' },
  'rc-out-green': { label: 'Outlined Green', desc: 'Green wireframe border receipt', accent: '#2E7D32', variant: 'outlined' },
  'rc-out-crimson': { label: 'Outlined Crimson', desc: 'Red wireframe border receipt', accent: '#C62828', variant: 'outlined' },
  'rc-out-amber': { label: 'Outlined Amber', desc: 'Orange wireframe border receipt', accent: '#EF6C00', variant: 'outlined' },
  'rc-out-violet': { label: 'Outlined Violet', desc: 'Purple wireframe border receipt', accent: '#6A1B9A', variant: 'outlined' },
  'ticket-kraft': { label: 'Ticket Kraft', desc: 'Dashed kraft-brown torn-ticket look', accent: '#8D6E63', variant: 'ticket' },
  'ticket-blueprint': { label: 'Ticket Blueprint', desc: 'Dashed blue engineering-ticket look', accent: '#1565C0', variant: 'ticket' },
  'rc-grad-sunrise': { label: 'Sunrise', desc: 'Orange→red gradient header', accent: '#F57C00', headBg: '#F57C00', headBg2: '#E53935', variant: 'gradient' },
  'rc-grad-ocean': { label: 'Ocean Mist', desc: 'Blue→cyan gradient header', accent: '#0277BD', headBg: '#0277BD', headBg2: '#00ACC1', variant: 'gradient' },
  'rc-grad-violet': { label: 'Violet Dusk', desc: 'Purple→magenta gradient header', accent: '#6A1B9A', headBg: '#6A1B9A', headBg2: '#E040FB', variant: 'gradient' },
  'rc-grad-forest': { label: 'Emerald Flow', desc: 'Green→lime gradient header', accent: '#2E7D32', headBg: '#2E7D32', headBg2: '#7CB342', variant: 'gradient' },
  'rc-serif-classic': { label: 'Serif Classic', desc: 'Serif body, warm brown rules', accent: '#8D6E63', variant: 'plain', font: 'serif' }
};

App.registerView('settings', {
  async render(params) {
    const tab = params.tab || 'company';
    const tabs = [
      ['company', '🏢 Company Profile'], ['invoice', '🧾 Invoice Theme'], ['receipt', '🧾 Receipt Theme'],
      ['terms', '📜 Terms & Conditions'], ['payments', '🏦 Bank / UPI / QR'], ['stages', '🎯 Lead Stages']
    ];
    return `
    <div class="page-head"><div><h1>Company Settings</h1><div class="sub">Profile · GST details · invoice &amp; receipt themes · terms · payment details · lead stages</div></div>
      <div class="flex" id="set-actions"></div></div>
    <div class="tabs">${tabs.map(([k, l]) => `<button class="${tab === k ? 'active' : ''}" onclick="App.navigate('#/settings?tab=${k}')">${l}</button>`).join('')}</div>
    <div id="set-body"><div class="empty">Loading…</div></div>`;
  },
  async mount(params) {
    const tab = params.tab || 'company';
    const body = document.getElementById('set-body');
    const actions = document.getElementById('set-actions');
    actions.innerHTML = '';
    let s;
    try { s = (await UI.api('/api/settings')).settings; }
    catch (e) { body.innerHTML = `<div class="panel"><div class="form-error">${UI.esc(e.message)}</div></div>`; return; }
    this._s = s;
    if (tab === 'company') this.renderCompany(body, actions, s);
    if (tab === 'invoice') this.renderInvoiceTheme(body, actions, s);
    if (tab === 'receipt') this.renderReceiptTheme(body, actions, s);
    if (tab === 'terms') this.renderTerms(body, actions, s);
    if (tab === 'payments') this.renderPayments(body, actions, s);
    if (tab === 'stages') await this.renderStages(body, actions, s);
  },
  async save(fields) {
    try {
      const { settings } = await UI.api('/api/settings', { method: 'PUT', body: fields });
      this._s = settings;
      UI.toast('Settings saved', 'ok');
      return settings;
    } catch (e) { UI.toast(e.message, 'err'); return null; }
  },

  // ---------- Company profile ----------
  renderCompany(body, actions, s) {
    body.innerHTML = `
      <div class="panel"><h2>Company Profile &amp; GST Details</h2>
        <div class="form-grid" id="cf">
          ${UI.field('company_name', 'Company Name', s.company_name)}
          ${UI.field('company_gstin', 'GSTIN (15 chars)', s.company_gstin, 'text', 'maxlength="15"')}
          ${UI.field('company_pan', 'PAN', s.company_pan, 'text', 'maxlength="10"')}
          ${UI.field('company_state_code', 'State Code (e.g. 27)', s.company_state_code, 'text', 'maxlength="4"')}
          ${UI.field('company_phone', 'Phone', s.company_phone)}
          ${UI.field('company_email', 'Email', s.company_email)}
        </div>
        ${UI.textarea('company_address', 'Registered Address', s.company_address)}
        <p class="k-sub mt">Company name, GSTIN and address are used on tax invoices, E-Way bills and GSTR exports.</p>
      </div>`;
    actions.innerHTML = '<button class="btn btn-primary" id="cf-save">Save Profile</button>';
    document.getElementById('cf-save').onclick = async () => {
      const d = UI.formValues('cf');
      d.company_address = body.querySelector('[name=company_address]').value.trim();
      if (d.company_gstin && !/^[0-9A-Za-z]{15}$/.test(d.company_gstin)) return UI.toast('GSTIN must be 15 characters', 'err');
      if (await this.save(d)) this.mount({ tab: 'company' });
    };
  },

  themeSwatchStyle(t) {
    const bg = t.headBg2
      ? `linear-gradient(135deg,${t.headBg || t.accent},${t.headBg2})`
      : (t.headBg || t.accent);
    return `background:${bg};color:${t.headFg || '#fff'}`;
  },
  themeCards(reg, name, cur) {
    return Object.entries(reg).map(([id, t]) => `
      <label class="theme-card ${cur === id ? 'sel' : ''}" data-search="${UI.esc((t.label + ' ' + t.desc + ' ' + id).toLowerCase())}">
        <input type="radio" name="${name}" value="${id}" ${cur === id ? 'checked' : ''}>
        <div class="theme-swatch" style="${this.themeSwatchStyle(t)}">${UI.esc(t.label.toUpperCase())}</div>
        <b>${UI.esc(t.label)}</b><div class="k-sub">${UI.esc(t.desc)}</div>
      </label>`).join('');
  },
  wireThemeFilter(body, inputId) {
    const fi = document.getElementById(inputId);
    if (!fi) return;
    fi.oninput = () => {
      const q = fi.value.trim().toLowerCase();
      body.querySelectorAll('.theme-card').forEach(c => c.style.display = (!q || c.dataset.search.includes(q)) ? '' : 'none');
    };
  },

  // ---------- Invoice theme ----------
  renderInvoiceTheme(body, actions, s) {
    const cur = INVOICE_THEMES[s.invoice_theme] ? s.invoice_theme : 'classic';
    const n = Object.keys(INVOICE_THEMES).length;
    const curSize = ['a4', 'letter', 'legal'].includes(s.invoice_page_size) ? s.invoice_page_size : 'a4';
    body.innerHTML = `
      <div class="settings-split">
        <div class="settings-split__opts">
          <div class="panel"><h2>Invoice Theme <span class="k-sub">${n} designs</span></h2>
            <input type="text" class="input-inline theme-filter" id="inv-filter" placeholder="Search ${n} themes — try blue, dark, serif, gradient…">
            <div class="theme-grid" id="inv-themes">${this.themeCards(INVOICE_THEMES, 'invoice_theme', cur)}</div>
            <p class="k-sub mt">Shown on the invoice preview &amp; printed invoices.</p>
          </div>
        </div>
        <div class="settings-split__preview">
          <div class="panel">
            <div class="preview-toolbar">
              <h2>Preview</h2>
              <div id="inv-page">${UI.select('invoice_page_size', 'Page Size', [{ value: 'a4', label: 'A4 (210 × 297 mm)' }, { value: 'letter', label: 'US Letter (8.5 × 11 in)' }, { value: 'legal', label: 'US Legal (8.5 × 14 in)' }], curSize)}</div>
            </div>
            <div class="preview-stage" id="inv-preview"></div>
          </div>
        </div>
      </div>`;
    this.wireThemeFilter(body, 'inv-filter');
    const draw = () => {
      const theme = body.querySelector('[name=invoice_theme]:checked').value;
      const pageSize = body.querySelector('[name=invoice_page_size]').value;
      const stage = document.getElementById('inv-preview');
      stage.innerHTML = `<div class="preview-scaler">${this.invoiceHtml(theme, this.sampleInvoice(s), s, true, pageSize)}</div>`;
      this.fitPreview(stage, this.pageWidthPx(pageSize));
      body.querySelectorAll('.theme-card').forEach(c => c.classList.toggle('sel', c.querySelector('input').checked));
    };
    body.querySelectorAll('[name=invoice_theme]').forEach(r => r.onchange = draw);
    body.querySelector('[name=invoice_page_size]').onchange = draw;
    if (this._previewResize) window.removeEventListener('resize', this._previewResize);
    this._previewResize = () => this.fitPreview(document.getElementById('inv-preview'), this.pageWidthPx(body.querySelector('[name=invoice_page_size]').value));
    window.addEventListener('resize', this._previewResize);
    draw();
    actions.innerHTML = '<button class="btn btn-primary" id="it-save">Save Theme</button>';
    document.getElementById('it-save').onclick = async () => {
      if (await this.save({
        invoice_theme: body.querySelector('[name=invoice_theme]:checked').value,
        invoice_page_size: body.querySelector('[name=invoice_page_size]').value
      })) this.mount({ tab: 'invoice' });
    };
  },

  pageWidthPx(size) {
    return { a4: 794, letter: 816, legal: 816 }[size] || 794;
  },
  fitPreview(stage, natural) {
    if (!stage) return;
    const box = stage.querySelector('.preview-scaler');
    if (!box) return;
    box.style.transform = '';
    stage.style.height = '';
    const avail = stage.clientWidth;
    if (!avail) return;
    const scale = Math.min(1, avail / natural);
    box.style.transformOrigin = 'top left';
    box.style.transform = `scale(${scale})`;
    stage.style.height = (box.offsetHeight * scale) + 'px';
  },
  amountInWords(n) {
    n = Math.round(Number(n || 0));
    if (!n) return 'Zero Rupees Only';
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const two = x => x < 20 ? a[x] : b[Math.floor(x / 10)] + (x % 10 ? ' ' + a[x % 10] : '');
    const three = x => x < 100 ? two(x) : a[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' + two(x % 100) : '');
    const words = [];
    const cr = Math.floor(n / 10000000); n %= 10000000;
    const lk = Math.floor(n / 100000); n %= 100000;
    const th = Math.floor(n / 1000); n %= 1000;
    if (cr) words.push(three(cr) + ' Crore');
    if (lk) words.push(three(lk) + ' Lakh');
    if (th) words.push(three(th) + ' Thousand');
    if (n) words.push(three(n));
    return words.join(' ').replace(/\s+/g, ' ').trim() + ' Rupees Only';
  },

  sampleInvoice(s) {
    return {
      doc_no: 'INV-2026-0042', doc_type: 'TaxInvoice', doc_date: new Date(),
      customer_name: 'Sample Customer Pvt Ltd', customer_gstin: '27ABCCC1234D1Z5',
      customer_address: 'Andheri East, Mumbai 400069', place_of_supply: 'Maharashtra (27)',
      terms_conditions: 'Payment due within 30 days of invoice date.\nInterest @18% p.a. is charged on overdue amounts.\nSubject to Mumbai jurisdiction only.',
      taxable_value: 50000, cgst: 4500, sgst: 4500, igst: 0, grand_total: 59000,
      items: [
        { description: 'Managed Network Services — Annual', hsn_sac: '998314', qty: 1, unit_price: 30000, gst_rate: 18, amount: 30000 },
        { description: 'CCTV Camera 4MP (IP)', hsn_sac: '852589', qty: 5, unit_price: 4000, gst_rate: 18, amount: 20000 }
      ]
    };
  },

  invoiceThemeCss(t) {
    const a = t.accent, hb = t.headBg || a, hf = t.headFg || '#fff';
    const tb = t.thBg || '#F1F3F4', tf = t.thBg ? a : '#fff';
    const bd = t.border || '#E5E7EB';
    const fontCss = t.font === 'serif' ? `.iv{font-family:Georgia,'Times New Roman',serif}`
      : t.font === 'mono' ? `.iv{font-family:'Courier New',Courier,monospace}` : '';
    if (t.headBg2) return fontCss + `.iv-hd{background:linear-gradient(135deg,${t.headBg},${t.headBg2});color:${hf}}.iv-hd h2{color:${hf}}.iv-tbl th{background:${tb};color:${a};border:1px solid ${bd}}.iv-tbl td{border:1px solid ${bd}}.iv-tot{border-top:3px solid ${a}}.iv-amt{color:${a}}`;
    if (t.variant === 'dark' || (t.headBg && t.thBg === t.headBg && a !== hb)) return fontCss + `.iv-hd{background:${hb};color:${hf};border-left:8px solid ${a}}.iv-hd h2{color:${hf}}.iv-tbl th{background:${hb};color:${hf};border:1px solid ${bd}}.iv-tbl td{border-bottom:1px solid ${bd}}.iv-tot{border-top:3px solid ${a}}.iv-amt{color:${a}}`;
    if (!t.headBg) {
      if (t.accent === '#000000' && t.font === 'mono') return fontCss + `.iv-hd{background:#000;color:#fff;border-left:8px solid #000}.iv-hd h2{color:#fff}.iv-tbl th{background:#F5F5F5;color:#000;border-bottom:2px solid #000}.iv-tbl td{border-bottom:1px solid ${bd}}.iv-tot{border-top:3px double #000}.iv-amt{color:#000}`;
      return fontCss + `.iv-hd{background:none;color:#202124;border-bottom:1px solid ${bd};padding:4px 0 10px;border-radius:0}.iv-hd h2{color:${a}}.iv-tbl th{background:none;color:${a};border-bottom:2px solid ${a}}.iv-tbl td{border-bottom:1px solid ${bd}}.iv-foot{border-top:1px solid ${bd};padding-top:8px}.iv-tot{border-top:2px solid ${a}}.iv-amt{color:${a}}`;
    }
    if (t.centered) return '';
    return fontCss + `.iv-hd{background:${hb};color:${hf}}.iv-hd h2{color:${hf}}.iv-tbl th{background:${tb};color:${a};border:1px solid ${bd}}.iv-tbl td{border:1px solid ${bd}}.iv-tot{border-top:3px solid ${a}}.iv-amt{color:${a}}`;
  },

  invoiceHtml(theme, doc, s, embedded = false, pageSize) {
    const inter = Number(doc.igst || 0) > 0;
    const items = doc.items || [];
    const t = INVOICE_THEMES[theme] || INVOICE_THEMES.classic;
    const ps = this.pageCss(pageSize || s.invoice_page_size);
    const a = t.accent, hb = t.headBg || a, hf = t.headFg || '#fff';
    const tb = t.thBg || '#F1F3F4';
    const bd = t.border || '#E5E7EB';
    const fontCss = t.font === 'serif' ? `.iv{font-family:Georgia,'Times New Roman',serif}`
      : t.font === 'mono' ? `.iv{font-family:'Courier New',Courier,monospace}` : '';
    const isCentered = ['ctr-classic', 'ctr-navy', 'ctr-crimson', 'ctr-emerald'].includes(theme);
    const isStrip = theme.startsWith('strip-');
    const isOutline = theme.startsWith('out-');
    const isBoxed = theme.startsWith('box-');
    const isSidebar = theme.startsWith('sb-');
    const isDark = theme === 'modern' || theme.startsWith('dark-');
    const isMonoLedger = theme === 'mono-ledger';
    let themeStyle;
    if (isMonoLedger) {
      themeStyle = fontCss + `.iv{border-color:#BDBDBD}.iv-hd{background:#000;color:#fff;border-left:8px solid #000}.iv-hd h2{color:#fff}.iv-tbl th{background:#F5F5F5;color:#000;border:1px solid #BDBDBD}.iv-tbl td{border:1px solid #BDBDBD}.iv-foot{border-top:1px solid #BDBDBD;padding-top:8px}.iv-tot{border-top:3px double #000}.iv-amt{color:#000}.iv-sign{border-color:#BDBDBD}`;
    } else if (isCentered) {
      themeStyle = fontCss + `.iv-hd{background:${hb};color:${hf};text-align:center;flex-direction:column;align-items:center}.iv-title{text-align:center;margin-top:8px}.iv-meta{text-align:center;justify-content:center;gap:34px}.iv-meta span{margin-top:2px}.iv-tbl th{background:${tb};color:${a};border:1px solid ${bd}}.iv-tbl td{border:1px solid ${bd}}.iv-foot{justify-content:center;gap:44px}.iv-below{text-align:center}.iv-tot{text-align:center;min-width:auto;border-top:3px solid ${a}}.iv-amt{color:${a}}.iv-sign{text-align:center}`;
    } else if (isStrip) {
      themeStyle = fontCss + `.iv{border-top:5px solid ${a}}.iv-hd{background:#fff;color:#202124;border-bottom:1px solid ${bd}}.iv-hd h2{color:${a}}.iv-tbl th{background:none;color:${a};border-bottom:2px solid ${a}}.iv-tbl td{border-bottom:1px solid ${bd}}.iv-tot{border-top:2px solid ${a}}.iv-amt{color:${a}}`;
    } else if (isOutline) {
      themeStyle = fontCss + `.iv{border:1.5px solid ${a}}.iv-hd{background:#fff;color:#202124;border:1.5px solid ${a};border-bottom:none}.iv-hd h2{color:${a}}.iv-tbl th{background:#fff;color:${a};border:1px solid ${a}}.iv-tbl td{border:1px solid ${bd}}.iv-tot{border-top:2px solid ${a}}.iv-amt{color:${a}}.iv-sign{border-color:${a}}`;
    } else if (isBoxed) {
      themeStyle = fontCss + `.iv{border:2px solid ${a};border-radius:12px}.iv-hd{background:${hb};color:${hf};border-radius:10px 10px 0 0}.iv-hd h2{color:${hf}}.iv-tbl th{background:${tb};color:${a};border:1px solid ${bd}}.iv-tbl td{border:1px solid ${bd}}.iv-tot{border-top:3px solid ${a}}.iv-amt{color:${a}}`;
    } else if (isSidebar) {
      themeStyle = fontCss + `.iv-hd{background:${hb};color:${hf};border-left:12px solid ${a}}.iv-hd h2{color:${hf}}.iv-tbl th{background:${tb};color:${a};border:1px solid ${bd}}.iv-tbl td{border:1px solid ${bd}}.iv-tot{border-top:3px solid ${a}}.iv-amt{color:${a}}`;
    } else if (isDark) {
      themeStyle = fontCss + `.iv-hd{background:${hb};color:${hf};border-left:8px solid ${a}}.iv-hd h2{color:${hf}}.iv-tbl th{background:${hb};color:${hf};border:1px solid ${bd}}.iv-tbl td{border-bottom:1px solid ${bd}}.iv-tot{border-top:3px solid ${a}}.iv-amt{color:${a}}`;
    } else if (t.headBg2) {
      themeStyle = fontCss + `.iv-hd{background:linear-gradient(135deg,${t.headBg},${t.headBg2});color:${hf}}.iv-hd h2{color:${hf}}.iv-tbl th{background:${tb};color:${a};border:1px solid ${bd}}.iv-tbl td{border:1px solid ${bd}}.iv-tot{border-top:3px solid ${a}}.iv-amt{color:${a}}`;
    } else if (!t.headBg) {
      themeStyle = fontCss + this.invoiceThemeCss(t);
    } else {
      themeStyle = fontCss + `.iv-hd{background:${hb};color:${hf}}.iv-hd h2{color:${hf}}.iv-tbl th{background:${tb};color:${a};border:1px solid ${bd}}.iv-tbl td{border:1px solid ${bd}}.iv-tot{border-top:3px solid ${a}}.iv-amt{color:${a}}`;
    }
    const bankBlock = (s.bank_name || s.upi_id) ? `
      <div class="iv-bank">
        <b>Payment Details</b>
        ${s.bank_name ? `<div>${UI.esc(s.bank_name)}${s.bank_branch ? ' · ' + UI.esc(s.bank_branch) : ''}</div>` : ''}
        ${s.bank_account_no ? `<div>A/c: <b>${UI.esc(s.bank_account_no)}</b>${s.bank_ifsc ? ' · IFSC: ' + UI.esc(s.bank_ifsc) : ''}</div>` : ''}
        ${s.upi_id ? `<div>UPI: <b>${UI.esc(s.upi_id)}</b></div>` : ''}
        ${s.qr_image ? `<img class="iv-qr" src="${s.qr_image}" alt="UPI QR">` : ''}
      </div>` : '';
    const termsBlock = s.terms_conditions ? `
      <div class="iv-terms">
        <div class="iv-terms-hd">Terms &amp; Conditions</div>
        <div class="iv-terms-body">${UI.esc(s.terms_conditions).replace(/\n/g, '<br>')}</div>
      </div>` : '';
    const html = `
      <div class="iv-page">
      <div class="iv">
        <style>${themeStyle}</style>
        <div class="iv-hd"><div><h2>${UI.esc(s.company_name || 'Your Company')}</h2>
          <div>${UI.esc(s.company_address || '')}</div>
          <div>GSTIN: ${UI.esc(s.company_gstin || '—')}${s.company_pan ? ' · PAN: ' + UI.esc(s.company_pan) : ''}${s.company_phone ? ' · ☎ ' + UI.esc(s.company_phone) : ''}</div></div>
          <div class="iv-title"><b>${doc.doc_type === 'TaxInvoice' ? 'TAX INVOICE' : UI.esc(doc.doc_type)}</b><div>${UI.esc(doc.doc_no)}</div></div></div>
        <div class="iv-meta">
          <div><span>Bill To</span><b>${UI.esc(doc.customer_name)}</b><div>${UI.esc(doc.customer_address || '')}</div><div>GSTIN: ${UI.esc(doc.customer_gstin || 'URP')}</div></div>
          <div><span>Invoice Date</span>${UI.fmtDate(doc.doc_date)}<br><span>Place of Supply</span>${UI.esc(doc.place_of_supply || '—')}</div>
        </div>
        <div class="iv-items">
        <table class="iv-tbl"><thead><tr><th>#</th><th>Description</th><th>HSN</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">GST</th><th class="num">Amount</th></tr></thead>
        <tbody>${items.map((i, n) => `<tr><td>${n + 1}</td><td>${UI.esc(i.description)}</td><td>${UI.esc(i.hsn_sac || '')}</td><td class="num">${i.qty}</td><td class="num">${UI.money(i.unit_price)}</td><td class="num">${i.gst_rate}%</td><td class="num">${UI.money(i.amount)}</td></tr>`).join('')}</tbody></table>
        </div>
        <div class="iv-bottom">
          <div class="iv-words"><span>Amount in Words:</span> <b>${UI.esc(this.amountInWords(doc.grand_total))}</b></div>
          <div class="iv-foot">
            <div class="iv-below">
              <div>Taxable Value: ${UI.money(doc.taxable_value)}</div>
              ${inter
                ? `<div>IGST: ${UI.money(doc.igst)}</div>`
                : `<div>CGST: ${UI.money(doc.cgst)}</div><div>SGST: ${UI.money(doc.sgst)}</div>`}
            </div>
            <div class="iv-tot"><span>Grand Total</span><b class="iv-amt">${UI.money(doc.grand_total)}</b></div>
          </div>
          <div class="iv-lower">
            ${termsBlock || '<div></div>'}
            <div class="iv-lower-right">
              ${bankBlock}
              <div class="iv-sign">Authorised Signatory</div>
            </div>
          </div>
        </div>
      </div>
      </div>`;
    if (embedded) return `<style>${ps}${this.invoiceFrameCss()}</style>${html}`;
    return `<style>${ps}${this.invoiceFrameCss()}</style><body style="margin:0;background:#f0f0f0">${html}</body>`;
  },
  pageCss(size) {
    const dims = {
      a4: { w: '210mm', h: '297mm' },
      letter: { w: '8.5in', h: '11in' },
      legal: { w: '8.5in', h: '14in' }
    }[size] || { w: '210mm', h: '297mm' };
    return `@page{size:${dims.w} ${dims.h};margin:8mm}:root{--pg-h:calc(${dims.h} - 16mm)}.iv-page{width:${dims.w};height:var(--pg-h)}`;
  },
  invoiceFrameCss() {
    return `
    .iv-page{width:210mm;height:calc(297mm - 16mm);margin:0 auto;padding:12px;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,.12);border:1px solid #E5E7EB;box-sizing:border-box}
    .iv{font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#202124;width:100%;max-width:none;margin:0;box-sizing:border-box;padding:14px;border:1px solid #E5E7EB;background:#fff;display:flex;flex-direction:column;min-height:calc(var(--pg-h) - 24px)}
    @media print{body{margin:0;background:#fff}.iv-page{width:100%;height:auto;min-height:var(--pg-h);padding:0;margin:0;border:none;box-shadow:none;background:#fff;box-sizing:border-box}.iv{min-height:var(--pg-h)}}
    .iv-hd{display:flex;justify-content:space-between;gap:16px;padding:14px 16px;border-radius:6px 6px 0 0;align-items:flex-start}
    .iv-hd h2{margin:0 0 4px;font-size:18px;letter-spacing:.2px}.iv-hd div{line-height:1.5}
    .iv-title{text-align:right;white-space:nowrap}
    .iv-title b{font-size:14px;letter-spacing:1px;text-transform:uppercase}
    .iv-meta{display:flex;justify-content:space-between;gap:16px;margin:14px 0;padding:10px 12px;border:1px solid #f0f1f3;background:#fcfcfd;border-radius:6px}
    .iv-items{flex:1 1 auto}
    .iv-tbl{width:100%;border-collapse:collapse;margin-top:6px}
    .iv-tbl thead tr{border-bottom:2px solid #e6e8eb}
    .iv-tbl th,.iv-tbl td{padding:8px 10px;text-align:left;border-bottom:1px solid #f0f1f3}
    .iv-tbl th{text-transform:uppercase;font-size:10px;letter-spacing:.6px;color:#4b4f56}
    .iv-tbl tbody tr:last-child td{border-bottom:none}
    .num{text-align:right}
    .iv-bottom{margin-top:18px}
    .iv-words{border-top:1px dashed #c0c4c9;padding-top:8px;margin-bottom:10px;font-size:11.5px;color:#3c4043}
    .iv-words span{color:#5f6368;text-transform:uppercase;font-size:10px;letter-spacing:.6px;margin-right:4px}
    .iv-foot{display:flex;justify-content:space-between;align-items:flex-end;margin-top:8px;gap:20px;padding-top:10px;border-top:1px solid #f0f1f3}
    .iv-below{text-align:right;line-height:1.8;color:#5f6368}
    .iv-tot{min-width:230px;text-align:right;padding:10px 12px;border:1px solid #e6e8eb;border-radius:6px;background:#fcfcfd}
    .iv-tot span{color:#5f6368;margin-right:10px;text-transform:uppercase;font-size:10px;letter-spacing:.6px}.iv-tot b{font-size:18px}
    .iv-lower{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-top:16px}
    .iv-lower-right{min-width:230px;display:flex;flex-direction:column;align-items:flex-end;gap:12px}
    .iv-terms{flex:1;min-width:0;border:1px solid #e6e8eb;border-left:3px solid #9aa0a6;border-radius:4px;padding:10px 12px;font-size:11.5px;line-height:1.6;color:#3c4043;background:#fcfcfd}
    .iv-terms-hd{font-weight:bold;color:#202124;margin-bottom:5px;text-transform:uppercase;font-size:10px;letter-spacing:.6px}
    .iv-terms-body{white-space:pre-wrap}
    .iv-bank{width:100%;padding:10px 12px;border:1px dashed #9aa0a6;border-radius:6px;font-size:11.5px;line-height:1.6;background:#fcfcfd}
    .iv-qr{display:block;width:96px;height:96px;margin-top:8px;margin-left:auto}
    .iv-sign{color:#5f6368;font-size:11px;border-top:1px solid #e6e8eb;padding-top:6px;width:100%;text-align:center;margin-top:30px}`;
  },

  // ---------- Receipt theme ----------
  renderReceiptTheme(body, actions, s) {
    const cur = RECEIPT_THEMES[s.receipt_theme] ? s.receipt_theme : 'simple';
    const n = Object.keys(RECEIPT_THEMES).length;
    const curSize = ['a4', 'a5'].includes(s.receipt_page_size) ? s.receipt_page_size : 'a5';
    body.innerHTML = `
      <div class="settings-split">
        <div class="settings-split__opts">
          <div class="panel"><h2>Receipt Theme <span class="k-sub">${n} designs</span></h2>
            <input type="text" class="input-inline theme-filter" id="rc-filter" placeholder="Search ${n} themes — try thermal, boxed, gradient…">
            <div class="theme-grid" id="rc-themes">${this.themeCards(RECEIPT_THEMES, 'receipt_theme', cur)}</div>
            <p class="k-sub mt">Used when printing payment receipts.</p>
          </div>
        </div>
        <div class="settings-split__preview">
          <div class="panel">
            <div class="preview-toolbar">
              <h2>Preview</h2>
              <div id="rc-page">${UI.select('receipt_page_size', 'Page Size', [{ value: 'a4', label: 'A4 (210 × 297 mm)' }, { value: 'a5', label: 'A5 (148 × 210 mm)' }], curSize)}</div>
            </div>
            <div class="preview-stage" id="rc-preview"></div>
          </div>
        </div>
      </div>`;
    this.wireThemeFilter(body, 'rc-filter');
    const draw = () => {
      const theme = body.querySelector('[name=receipt_theme]:checked').value;
      const pageSize = body.querySelector('[name=receipt_page_size]').value;
      const stage = document.getElementById('rc-preview');
      stage.innerHTML = `<div class="preview-scaler">${this.receiptHtml(theme, this.sampleReceipt(s), s, true, pageSize)}</div>`;
      const base = this.receiptBaseWidth(pageSize);
      this.fitReceiptPreview(stage, base);
      body.querySelectorAll('.theme-card').forEach(c => c.classList.toggle('sel', c.querySelector('input').checked));
    };
    body.querySelectorAll('[name=receipt_theme]').forEach(r => r.onchange = draw);
    body.querySelector('[name=receipt_page_size]').onchange = draw;
    if (this._rcPreviewResize) window.removeEventListener('resize', this._rcPreviewResize);
    this._rcPreviewResize = () => this.fitReceiptPreview(document.getElementById('rc-preview'), this.receiptBaseWidth(body.querySelector('[name=receipt_page_size]').value));
    window.addEventListener('resize', this._rcPreviewResize);
    draw();
    actions.innerHTML = '<button class="btn btn-primary" id="rt-save">Save Theme</button>';
    document.getElementById('rt-save').onclick = async () => {
      if (await this.save({ receipt_theme: body.querySelector('[name=receipt_theme]:checked').value, receipt_page_size: body.querySelector('[name=receipt_page_size]').value })) this.mount({ tab: 'receipt' });
    };
  },
  receiptBaseWidth(size) {
    return { a4: 794, a5: 420 }[size] || 420;
  },
  receiptPageCss(size) {
    const dims = {
      a4: { w: '210mm', h: '297mm' },
      a5: { w: '148mm', h: '210mm' }
    }[size] || { w: '148mm', h: '210mm' };
    return `@page{size:${dims.w} ${dims.h};margin:6mm}:root{--rc-pg-w:${dims.w};--rc-pg-h:calc(${dims.h} - 12mm)}.rc-page{width:var(--rc-pg-w);height:var(--rc-pg-h)}`;
  },
  fitReceiptPreview(stage, base = 340) {
    if (!stage) return;
    const box = stage.querySelector('.preview-scaler');
    if (!box) return;
    box.style.transform = '';
    stage.style.height = '';
    const avail = stage.clientWidth;
    if (!avail) return;
    const scale = Math.min(1, avail / base);
    box.style.transformOrigin = 'top left';
    box.style.transform = `scale(${scale})`;
    stage.style.height = (box.offsetHeight * scale) + 'px';
  },
  sampleReceipt(s) {
    return {
      receipt_no: 'RCPT-2026-0018', receipt_date: new Date(), amount: 25000, mode: 'UPI',
      ref_no: 'UPI44829910', customer_name: 'Sample Customer Pvt Ltd',
      doc_no: 'INV-2026-0042', notes: 'Against INV-2026-0042'
    };
  },
  receiptThemeCss(t) {
    const a = t.accent, hb = t.headBg || a, hf = t.headFg || '#fff';
    const fontCss = t.font === 'serif' ? `.rc{font-family:Georgia,'Times New Roman',serif}` : '';
    switch (t.variant) {
      case 'thermal': return fontCss + `.rc{max-width:300px;font-family:'Courier New',monospace;font-size:11px}.rc-hd{background:none;color:#000;text-align:center;border-bottom:1px dashed #000}.rc-hd h3{color:${a};font-size:13px}.rc-row span{color:#000}.rc-amt{color:${a};border-top:1px dashed #000}.rc-thanks{color:${a}}`;
      case 'boxed': return fontCss + `.rc{border:2px solid ${a};border-radius:10px}.rc-hd{background:${hb};color:${hf}}.rc-hd h3{color:${hf}}.rc-row span{color:${a}}.rc-amt{color:${a}}`;
      case 'strip': return fontCss + `.rc{border:1px solid #E5E7EB;border-top:4px solid ${a};border-radius:0 0 8px 8px}.rc-hd{background:none;color:#202124}.rc-hd h3{color:${a}}.rc-row span{color:${a}}.rc-amt{color:${a}}`;
      case 'centered': return fontCss + `.rc{text-align:center}.rc-hd{background:${hb};color:${hf};border-radius:8px 8px 0 0}.rc-hd h3{color:${hf}}.rc-row{justify-content:center;gap:8px;border-bottom:none}.rc-row span{color:${a}}.rc-amt{justify-content:center;gap:12px;color:${a}}.rc-thanks{color:${a}}`;
      case 'minimal': return fontCss + `.rc{border:none;border-radius:0}.rc-hd{background:none;color:#202124;border-bottom:1px solid #E0E0E0;padding-bottom:6px}.rc-hd h3{color:#202124;font-size:14px}.rc-row{border-bottom:1px dotted #dadce0}.rc-row span{color:#5f6368}.rc-amt{color:${a};border-top:1px solid ${a}}.rc-thanks{color:#5f6368}`;
      case 'dark': return fontCss + `.rc{border:1px solid #E5E7EB}.rc-hd{background:${hb};color:${hf};border-radius:6px}.rc-hd h3{color:${hf}}.rc-row span{color:${a}}.rc-amt{color:${a};border-top:2px solid ${a}}.rc-thanks{color:${a}}`;
      case 'outlined': return fontCss + `.rc{border:2px solid ${a};border-radius:10px}.rc-hd{background:none;color:${a};border-bottom:2px solid ${a}}.rc-hd h3{color:${a}}.rc-row span{color:${a}}.rc-amt{color:${a};border-top:2px solid ${a}}.rc-thanks{color:${a}}`;
      case 'ticket': return fontCss + `.rc{border:2px dashed ${a};border-radius:0;font-family:'Courier New',monospace}.rc-hd{background:none;color:#202124;border-bottom:2px dashed ${a}}.rc-hd h3{color:${a}}.rc-row{border-bottom:1px dashed #D7CCC8}.rc-row span{color:#5f6368}.rc-amt{color:${a};border-top:2px dashed ${a}}.rc-thanks{color:${a}}`;
      case 'gradient': return fontCss + `.rc{border:1px solid #E5E7EB}.rc-hd{background:linear-gradient(135deg,${t.headBg},${t.headBg2});color:${hf};border-radius:8px 8px 0 0}.rc-hd h3{color:${hf}}.rc-row span{color:${a}}.rc-amt{color:${a}}.rc-thanks{color:${a}}`;
      default: return fontCss + `.rc{border:none;border-radius:0}.rc-hd{background:none;color:#202124;border-bottom:2px solid ${a};padding-bottom:8px}.rc-hd h3{color:${a}}.rc-row span{color:#5f6368}.rc-amt{color:#202124;border-top:2px solid ${a}}.rc-thanks{color:#5f6368}`;
    }
  },
  receiptHtml(theme, r, s, embedded = false, pageSize) {
    const t = RECEIPT_THEMES[theme] || RECEIPT_THEMES.simple;
    const narrow = t.variant === 'thermal';
    const ps = this.receiptPageCss(pageSize || s.receipt_page_size);
    const themeStyle = `<style>${this.receiptThemeCss(t)}</style>`;
    const html = `
      <div class="rc-page ${narrow ? 'rc-narrow' : ''}">
      <div class="rc">
        ${themeStyle}
        <div class="rc-hd"><h3>${UI.esc(s.company_name || 'Your Company')}</h3>
          <div>${UI.esc(s.company_address || '')}</div>
          <div>GSTIN: ${UI.esc(s.company_gstin || '—')}</div>
          <div class="rc-title">PAYMENT RECEIPT</div></div>
        <div class="rc-body">
          <div class="rc-row"><span>Receipt #</span><b>${UI.esc(r.receipt_no)}</b></div>
          <div class="rc-row"><span>Date</span>${UI.fmtDate(r.receipt_date)}</div>
          <div class="rc-row"><span>Received From</span>${UI.esc(r.customer_name)}</div>
          <div class="rc-row"><span>Against</span>${UI.esc(r.doc_no || r.notes || '—')}</div>
          <div class="rc-row"><span>Mode</span>${UI.esc(r.mode)}${r.ref_no ? ' · Ref ' + UI.esc(r.ref_no) : ''}</div>
          <div class="rc-amt"><span>Amount</span><b>${UI.money(r.amount)}</b></div>
          ${s.upi_id ? `<div class="rc-upi">UPI: ${UI.esc(s.upi_id)}${s.qr_image ? `<img class="rc-qr" src="${s.qr_image}" alt="QR">` : ''}</div>` : ''}
        </div>
        <div class="rc-thanks">Thank you for your payment!</div>
      </div>
      </div>`;
    const css = `
    .rc-page{width:var(--rc-pg-w,148mm);height:var(--rc-pg-h);margin:0 auto;padding:8px;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,.12);border:1px solid #E5E7EB;box-sizing:border-box}
    .rc{font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:#202124;width:100%;margin:0;box-sizing:border-box;padding:10px;border:1px solid #E5E7EB;background:#fff;border-radius:8px;display:flex;flex-direction:column;min-height:calc(var(--rc-pg-h) - 16px)}
    .rc-narrow .rc{max-width:280px;margin:0 auto}
    @media print{body{margin:0;background:#fff}.rc-page{width:100%;height:auto;min-height:var(--rc-pg-h);padding:0;margin:0;border:none;box-shadow:none;background:#fff;box-sizing:border-box}.rc{border:none;padding:8px;border-radius:0}}
    .rc-hd{padding:10px 10px 12px;border-radius:6px 6px 0 0;text-align:center;line-height:1.5}
    .rc-hd h3{margin:0 0 4px;font-size:15px}
    .rc-title{margin-top:8px;font-weight:700;letter-spacing:1.2px;font-size:12px;color:#3c4043;text-transform:uppercase}
    .rc-body{border:1px solid #f0f1f3;border-radius:6px;background:#fcfcfd;padding:8px 10px;margin-top:8px;flex:1 1 auto}
    .rc-row{display:flex;justify-content:space-between;gap:12px;padding:6px 2px;border-bottom:1px dotted #dadce0}
    .rc-row:last-of-type{border-bottom:none}
    .rc-row span{font-size:10px;text-transform:uppercase;letter-spacing:.6px;color:#5f6368}
    .rc-amt{display:flex;justify-content:space-between;align-items:center;padding:10px 4px;font-size:16px;border-top:1px solid #e6e8eb;margin-top:4px}
    .rc-upi{text-align:center;margin-top:10px;font-size:11.5px}
    .rc-qr{display:block;width:96px;height:96px;margin:8px auto 0}
    .rc-thanks{text-align:center;margin-top:12px;font-size:11px;color:#5f6368;font-style:italic}`;
    if (embedded) return `<style>${ps}${css}</style>${html}`;
    return `<style>${ps}${css}</style><body style="margin:0;background:#f5f5f5">${html}</body>`;
  },

  // ---------- Terms ----------
  renderTerms(body, actions, s) {
    body.innerHTML = `
      <div class="panel"><h2>Terms &amp; Conditions</h2>
        ${UI.textarea('terms_conditions', 'Printed on invoices & receipts', s.terms_conditions || '')}
        <div class="flex mt" style="gap:8px;flex-wrap:wrap">
          ${['Payment due within 15 days of invoice.', 'Interest @18% p.a. on overdue amounts.', 'Goods once sold will not be taken back.', 'Subject to Mumbai jurisdiction only.'].map(t =>
      `<button class="btn btn-tonal btn-sm t-quick" data-t="${UI.esc(t)}">+ ${UI.esc(t)}</button>`).join('')}
        </div>
        <p class="k-sub mt">Click a common clause to append it. Line breaks are preserved on the invoice.</p>
      </div>`;
    const ta = body.querySelector('[name=terms_conditions]');
    body.querySelectorAll('.t-quick').forEach(b => b.onclick = () => {
      ta.value = (ta.value.trim() ? ta.value.trim() + '\n' : '') + b.dataset.t;
      ta.focus();
    });
    actions.innerHTML = '<button class="btn btn-primary" id="tc-save">Save Terms</button>';
    document.getElementById('tc-save').onclick = async () => {
      if (await this.save({ terms_conditions: ta.value })) this.mount({ tab: 'terms' });
    };
  },

  // ---------- Payments ----------
  renderPayments(body, actions, s) {
    body.innerHTML = `
      <div class="panel"><h2>Bank Account</h2>
        <div class="form-grid" id="bf">
          ${UI.field('bank_name', 'Bank Name', s.bank_name)}
          ${UI.field('bank_branch', 'Branch', s.bank_branch)}
          ${UI.field('bank_account_no', 'Account Number', s.bank_account_no)}
          ${UI.field('bank_ifsc', 'IFSC', s.bank_ifsc)}
        </div>
      </div>
      <div class="panel"><h2>UPI &amp; QR Code</h2>
        <div class="form-grid" id="uf">
          ${UI.field('upi_id', 'UPI ID (e.g. name@okhdfc)', s.upi_id)}
          <label class="field"><span>QR Code Image</span><input type="file" id="qr-file" accept="image/*"></label>
        </div>
        <div class="mt flex" style="gap:14px;align-items:center">
          <div id="qr-prev">${s.qr_image ? `<img src="${s.qr_image}" alt="QR" style="width:110px;height:110px;border:1px solid #E5E7EB;border-radius:8px">` : '<span class="k-sub">No QR uploaded</span>'}</div>
          <div class="k-sub">Shows on invoices &amp; receipts. PNG/JPG under ~350KB works best.<br>Leave unchanged to keep the current QR.</div>
          ${s.qr_image ? '<button class="link-btn danger" id="qr-clear">Remove QR</button>' : ''}
        </div>
      </div>`;
    let qrData;
    document.getElementById('qr-file').onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      if (f.size > 350 * 1024) { UI.toast('Image too large — max 350KB', 'err'); e.target.value = ''; return; }
      const rd = new FileReader();
      rd.onload = () => { qrData = rd.result; document.getElementById('qr-prev').innerHTML = `<img src="${qrData}" style="width:110px;height:110px;border:1px solid #E5E7EB;border-radius:8px">`; };
      rd.readAsDataURL(f);
    };
    document.getElementById('qr-clear')?.addEventListener('click', async () => {
      if (await this.save({ qr_image: '' })) this.mount({ tab: 'payments' });
    });
    actions.innerHTML = '<button class="btn btn-primary" id="pf-save">Save Payment Details</button>';
    document.getElementById('pf-save').onclick = async () => {
      const d = { ...UI.formValues('bf'), ...UI.formValues('uf') };
      if (qrData !== undefined) d.qr_image = qrData;
      if (await this.save(d)) this.mount({ tab: 'payments' });
    };
  },

  // ---------- Lead stages ----------
  async renderStages(body, actions, s) {
    let stages = [];
    try { stages = (await UI.api('/api/settings/lead-stages')).stages; }
    catch (e) { body.innerHTML = `<div class="panel"><div class="form-error">${UI.esc(e.message)}</div></div>`; return; }
    body.innerHTML = `
      <div class="panel"><h2>CRM Lead Stages <span class="k-sub">${stages.length} stages</span></h2>
        <p class="k-sub mb">Pipeline stages shown on the CRM Kanban board. Drag the ⠿ handle to reorder, or use the arrows. Order below = board order (left → right).</p>
        <div id="stage-list">${stages.map((st, i) => `
          <div class="stage-row" data-id="${st.id}">
            <span class="stage-grip" draggable="true" title="Drag to reorder">⠿</span>
            <span class="stage-dot" style="background:${UI.esc(st.color)}"></span>
            <b>${UI.esc(st.name)}</b>
            <span class="badge ${st.name.toLowerCase() === 'won' ? 'b-green' : st.name.toLowerCase() === 'lost' ? 'b-red' : 'b-gray'}">${st.lead_count || 0} lead${st.lead_count == 1 ? '' : 's'}</span>
            <span class="flex" style="gap:6px;margin-left:auto">
              <button class="icon-btn st-up" title="Move up" ${i === 0 ? 'disabled' : ''}>↑</button>
              <button class="icon-btn st-down" title="Move down" ${i === stages.length - 1 ? 'disabled' : ''}>↓</button>
              <button class="link-btn st-edit">Edit</button>
              <button class="link-btn danger st-del">Delete</button>
            </span>
          </div>`).join('')}</div>
        ${!stages.length ? '<div class="empty">No stages yet — add one below</div>' : ''}
      </div>
      <div class="panel"><h2>Add Stage</h2>
        <div class="form-grid" id="sf">
          ${UI.field('name', 'Stage Name *')}
          <label class="field"><span>Colour</span><input name="color" type="color" value="#1A73E8"></label>
        </div>
        <button class="btn btn-primary mt" id="st-add">Add Stage</button>
      </div>`;
    const reload = () => this.renderStages(body, actions, s);
    document.getElementById('st-add').onclick = async () => {
      const d = UI.formValues('sf');
      if (!d.name) return UI.toast('Stage name required', 'err');
      try {
        await UI.api('/api/settings/lead-stages', { method: 'POST', body: { name: d.name, color: d.color } });
        UI.toast('Stage added', 'ok'); reload();
      } catch (e) { UI.toast(e.message, 'err'); }
    };
    const persistOrder = async (order) => {
      try { await UI.api('/api/settings/lead-stages/reorder', { method: 'POST', body: { ids: order.map(x => x.id) } }); reload(); }
      catch (e) { UI.toast(e.message, 'err'); }
    };
    let dragId = null;
    body.querySelectorAll('.stage-row').forEach(row => {
      const id = Number(row.dataset.id);
      const st = stages.find(x => x.id === id);
      row.querySelector('.st-up').onclick = async () => {
        const i = stages.findIndex(x => x.id === id);
        if (i <= 0) return;
        [stages[i - 1], stages[i]] = [stages[i], stages[i - 1]];
        persistOrder(stages);
      };
      row.querySelector('.st-down').onclick = async () => {
        const i = stages.findIndex(x => x.id === id);
        if (i >= stages.length - 1) return;
        [stages[i + 1], stages[i]] = [stages[i], stages[i + 1]];
        persistOrder(stages);
      };
      const grip = row.querySelector('.stage-grip');
      row.addEventListener('dragover', (e) => {
        if (dragId == null || id === dragId) return;
        e.preventDefault();
        try { e.dataTransfer.dropEffect = 'move'; } catch (_) {}
        const rect = row.getBoundingClientRect();
        const before = (e.clientY - rect.top) < rect.height / 2;
        row.dataset.before = before ? '1' : '0';
        row.classList.toggle('drag-over-top', before);
        row.classList.toggle('drag-over-bottom', !before);
      });
      row.addEventListener('dragleave', () => row.classList.remove('drag-over-top', 'drag-over-bottom'));
      row.addEventListener('drop', (e) => {
        if (dragId == null || id === dragId) return;
        e.preventDefault();
        const before = row.dataset.before === '1';
        row.classList.remove('drag-over-top', 'drag-over-bottom');
        const from = stages.findIndex(x => x.id === dragId);
        if (from < 0) return;
        const [moved] = stages.splice(from, 1);
        let to = stages.findIndex(x => x.id === id);
        if (to < 0) to = stages.length;
        stages.splice(before ? to : to + 1, 0, moved);
        dragId = null;
        persistOrder(stages);
      });
      grip.addEventListener('dragstart', (e) => {
        dragId = id;
        row.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(id));
        try { e.dataTransfer.setDragImage(row, 24, 24); } catch (_) {}
      });
      grip.addEventListener('dragend', () => {
        dragId = null;
        body.querySelectorAll('.stage-row').forEach(r => r.classList.remove('dragging', 'drag-over-top', 'drag-over-bottom'));
      });
      row.querySelector('.st-edit').onclick = () => {
        const b = UI.modal('Edit Stage', `
          <div class="form-grid" id="esf">
            ${UI.field('name', 'Stage Name *', st.name)}
            <label class="field"><span>Colour</span><input name="color" type="color" value="${UI.esc(st.color)}"></label>
          </div>`,
          `<button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
           <button class="btn btn-primary" id="es-save">Save</button>`);
        b.querySelector('#es-save').onclick = async () => {
          const d = UI.formValues('esf');
          if (!d.name) return UI.toast('Stage name required', 'err');
          try {
            await UI.api('/api/settings/lead-stages/' + id, { method: 'PUT', body: { name: d.name, color: d.color } });
            UI.closeModal(); UI.toast('Stage updated', 'ok'); reload();
          } catch (e) { UI.toast(e.message, 'err'); }
        };
      };
      row.querySelector('.st-del').onclick = () => {
        const others = stages.filter(x => x.id !== id);
        if ((st.lead_count || 0) > 0) {
          if (!others.length) return UI.toast('Cannot delete — no other stage to move leads to', 'err');
          const b = UI.modal('Delete Stage', `
            <p class="mb">"<b>${UI.esc(st.name)}</b>" has <b>${st.lead_count}</b> lead${st.lead_count == 1 ? '' : 's'}. Move them to another stage before deleting:</p>
            ${UI.select('move_to', 'Move leads to', others.map(o => ({ value: o.id, label: o.name })), others[0].id)}`,
            `<button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
             <button class="btn btn-danger" id="sd-go">Move &amp; Delete</button>`);
          b.querySelector('#sd-go').onclick = async () => {
            const mv = Number(b.querySelector('[name=move_to]').value);
            try {
              await UI.api('/api/settings/lead-stages/' + id, { method: 'DELETE', body: { move_to: mv } });
              UI.closeModal(); UI.toast('Stage deleted, leads moved', 'ok'); reload();
            } catch (e) { UI.toast(e.message, 'err'); }
          };
        } else {
          UI.confirm(`Delete stage "${st.name}"?`, async () => {
            try {
              await UI.api('/api/settings/lead-stages/' + id, { method: 'DELETE' });
              UI.toast('Stage deleted', 'ok'); reload();
            } catch (e) { UI.toast(e.message, 'err'); }
          });
        }
      };
    });
    actions.innerHTML = '';
  },

  // ---------- printable helpers (used by sales view) ----------
  async openInvoicePrint(doc, items) {
    const s = this._s || (await UI.api('/api/settings')).settings;
    const w = window.open('', '_blank');
    if (!w) return UI.toast('Allow popups to print', 'err');
    w.document.write(this.invoiceHtml(s.invoice_theme, { ...doc, items }, s, false, s.invoice_page_size));
    w.document.close();
    setTimeout(() => w.print(), 250);
  },
  async openReceiptPrint(receipt) {
    const s = this._s || (await UI.api('/api/settings')).settings;
    const w = window.open('', '_blank');
    if (!w) return UI.toast('Allow popups to print', 'err');
    w.document.write(this.receiptHtml(s.receipt_theme, receipt, s, false, s.receipt_page_size));
    w.document.close();
    setTimeout(() => w.print(), 250);
  }
});
