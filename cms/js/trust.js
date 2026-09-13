/* Feature 2 — Why Trust Shivaa. Business details, not invented assurances. */
'use strict';
(function () {
  const { esc } = window.Shivaa;
  const LINKS = Object.freeze({
    mca: 'https://www.mca.gov.in/',
    udyam: 'https://www.udyamregistration.gov.in/Udyam_Verify.aspx',
    gst: 'https://services.gst.gov.in/services/searchtp.html',
  });
  const GSTIN_SHAPE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;
  const external = 'target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer"';
  const icon = paths => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  const building = icon('<path d="M4 21V6l8-3 8 3v15M2 21h20M8 21v-5h8v5M8 8h1m6 0h1M8 12h1m6 0h1"/>');
  const pin = icon('<path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2.5"/>');
  const documentIcon = icon('<path d="M14 3H5v18h14V8l-5-5zM14 3v5h5M8 12h8M8 16h5"/>');
  let pending = null;

  function parseProfile(data) {
    const b = data?.business;
    const id = (value, pattern) => value === null || (typeof value === 'string' && value === value.trim() && pattern.test(value));
    const address = b?.address;
    if (data?.schemaVersion !== 1 || data?.source !== 'store_settings' || !b || Array.isArray(b) ||
        !id(b.cin, /^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/) ||
        !id(b.udyam, /^UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}$/) ||
        !(address === null || (typeof address === 'string' && address.trim() && [...address].length <= 500 && !/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(address))) ||
        !(data.gstin === null || (typeof data.gstin === 'string' && GSTIN_SHAPE.test(data.gstin))) ||
        !Array.isArray(data.certificates) || data.certificates.length !== 0 ||
        data.registryVerification?.performed !== false || data.registryVerification?.checkedAt !== null) {
      throw new Error('Unrecognised business profile');
    }
    // Allowlist values; no arbitrary URLs, credentials, legal flags or trust scores.
    return Object.freeze({ cin: b.cin, udyam: b.udyam, address: b.address, gstin: data.gstin });
  }

  function syncFooter(profile) {
    const identity = document.getElementById('trustFooterIdentity');
    const address = document.getElementById('trustFooterAddress');
    const gstin = document.getElementById('footGstin');
    if (identity) {
      const parts = ['© 2026 Shivaa'];
      if (profile?.cin) parts.push('CIN ' + profile.cin);
      if (profile?.udyam) parts.push(profile.udyam);
      if (profile?.gstin) parts.push('GSTIN ' + profile.gstin);
      identity.textContent = parts.join(' · ');
    }
    if (address) address.textContent = profile ? (profile.address || 'Store address not provided') : 'Store address temporarily unavailable';
    if (gstin) {
      gstin.innerHTML = profile && profile.gstin
        ? `<a href="#/trust"><small>GSTIN</small><code>${esc(profile.gstin)}</code></a>`
        : '';
    }
  }

  function loadProfile() {
    // Share concurrent initial/footer/page requests only; no persistent cache or
    // stale legal-data fallback. A later visit/retry fetches current settings.
    if (pending) return pending;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    pending = (async () => {
      const response = await fetch('/api/trust', { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: controller.signal });
      if (response.status !== 200) throw new Error('Business profile unavailable');
      const profile = parseProfile(await response.json());
      syncFooter(profile);
      return profile;
    })().catch(error => { syncFooter(null); throw error; }).finally(() => { clearTimeout(timeout); pending = null; });
    return pending;
  }

  function identityRow(key, title, value, description, link, linkLabel) {
    return `<div class="trust-id-row"><dt><b>${title}</b><span>${description}</span></dt>
      <dd>${value ? `<code id="trustValue-${key}" tabindex="0">${esc(value)}</code><div class="trust-row-actions"><button type="button" class="trust-copy" data-trust-copy="${key}">Copy ${title}</button><a href="${link}" ${external}>${linkLabel} ↗</a></div>` : '<span class="trust-missing">Not provided</span>'}</dd></div>`;
  }

  function profileHTML(profile) {
    return `<div class="trust-grid">
      <section class="trust-card trust-identity" aria-labelledby="trustBusinessTitle">
        <div class="trust-card-top"><span class="trust-icon">${building}</span><span class="trust-badge">Provided by Shivaa</span></div>
        <h2 id="trustBusinessTitle">Business identity</h2>
        <p>Identifiers you can take to the official sources for your own checks.</p>
        <dl class="trust-records">
          ${identityRow('cin', 'CIN', profile.cin, 'Corporate Identification Number', LINKS.mca, 'MCA website')}
          ${identityRow('udyam', 'UDYAM', profile.udyam, 'UDYAM registration number', LINKS.udyam, 'Official UDYAM portal')}
          ${identityRow('gstin', 'GSTIN', profile.gstin, 'Goods and Services Tax identification number', LINKS.gst, 'GST portal search')}
        </dl>
        <p class="trust-note">These are business details on record, not live government verification results. Opening an official website does not verify a registration here.</p>
      </section>
      <section class="trust-card trust-location" aria-labelledby="trustAddressTitle">
        <div class="trust-card-top"><span class="trust-icon">${pin}</span><span class="trust-badge">Store details</span></div>
        <h2 id="trustAddressTitle">An address to check</h2>
        <p>The store address supplied by Shivaa, without an assumed map pin.</p>
        ${profile.address ? `<address id="trustValue-address" tabindex="0">${esc(profile.address)}</address>
          <div class="trust-address-actions"><a class="btn btn-outline" href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(profile.address)}" ${external}>Find this address on Maps ↗</a><button type="button" class="trust-copy" data-trust-copy="address">Copy address</button></div>` : '<p class="trust-missing">Address not provided</p>'}
        <p class="trust-note">Maps opens an address search outside Shivaa. It is not a verified location, store-hours listing or delivery-serviceability check.</p>
      </section>
      <section class="trust-card trust-documents" aria-labelledby="trustDocumentsTitle">
        <div class="trust-docs-intro"><span class="trust-icon">${documentIcon}</span><div><span class="label">What is not on record</span><h2 id="trustDocumentsTitle">Documents, without assumptions</h2><p>Missing information stays visibly missing. We do not generate a registration number or substitute an unrelated PDF.</p></div></div>
        <div class="trust-document-grid">
          ${profile.gstin
            ? `<div class="trust-document has-gstin" data-trust-gstin><div><h3>GSTIN</h3><span class="trust-gstin-flag trust-badge">On record</span></div>
                <p class="trust-gstin-value"><code id="trustValue-gstin-doc" tabindex="0">${esc(profile.gstin)}</code><span class="tg-flag">Owner-provided</span></p>
                <p>Published by Shivaa so every invoice, quotation and B2B settlement can be checked against the same number. Format and checksum valid; this page does not query the GST registry.</p>
                <div class="trust-row-actions"><button type="button" class="trust-copy" data-trust-copy="gstin">Copy GSTIN</button><a href="${LINKS.gst}" ${external}>Search on the GST portal ↗</a></div></div>`
            : `<div class="trust-document" data-trust-gstin><div><h3>GSTIN</h3><span class="trust-missing">Not provided</span></div><p>No GSTIN is published in this feature. A real number must be supplied and reviewed before it appears here.</p></div>`}
          <div class="trust-document" data-trust-certificates><div><h3>Certificate files</h3><span class="trust-missing">Not provided</span></div><p>No certificate files have been provided for this page. There are no sample certificates, generated seals or placeholder downloads.</p></div>
        </div>
        <p class="trust-note">“Not provided” describes what is published here. It is not a finding about the business’s registration or legal status.</p>
      </section>
    </div>
    <p id="trustCopyStatus" class="trust-copy-status" role="status" aria-live="polite"></p>`;
  }

  function bindCopy(root, profile) {
    const status = root.querySelector('#trustCopyStatus');
    let operation = 0;
    root.querySelectorAll('[data-trust-copy]').forEach(button => {
      button.onclick = async () => {
        const key = button.dataset.trustCopy;
        const value = profile[key];
        if (!value) return;
        const serial = ++operation;
        status.textContent = '';
        try {
          if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
          await navigator.clipboard.writeText(value);
          if (root.isConnected && serial === operation) status.textContent = (key === 'address' ? 'Address' : key.toUpperCase()) + ' copied. Copying does not verify these details.';
        } catch (error) {
          if (!root.isConnected || serial !== operation) return;
          const target = root.querySelector('#trustValue-' + key);
          target?.focus();
          try {
            const range = document.createRange(); range.selectNodeContents(target);
            const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
          } catch (selectionError) { /* Text is still available for manual selection. */ }
          status.textContent = 'Clipboard access was not available. Please select and copy the details above manually.';
        }
      };
    });
  }

  function renderTrust(view) {
    // v105 — every counter on this page is read from the site's own live data.
    const st = window.Shivaa.state || {};
    const prods = st.productsCache || [];
    const stats = { designs: prods.length, cats: new Set(prods.map(p => p.category)).size, mc: (st.mcTable || []).length };
    view.innerHTML = `<section class="trust-hero">
      <span class="t-orb o1" aria-hidden="true"></span><span class="t-orb o2" aria-hidden="true"></span>
      <div class="t-grid" aria-hidden="true"></div>
      <div class="container">
      <div class="crumbs"><a href="#/">Home</a> / Why Trust Shivaa</div>
      <div class="trust-hero-grid"><div><span class="label">Clarity before confidence</span><h1>Why trust <em class="disp-italic">Shivaa?</em></h1><p>Start with the details you can check. Business identity, a store address, and an honest view of the documents available.</p></div>
        <div class="trust-principle"><span class="trust-wordmark">SHIVAA</span><p>Details on record.<br>Not assumed assurances.</p><small>Identity · Location · Documents</small></div></div>
      <div id="trustHeroGstin"></div>
    </div></section>
    <div class="container trust-page">
      <div class="trust-stats">
        <div class="tstat"><b data-count-to="designs">${stats.designs}</b><span>designs listed</span><small>each one priced from the live Jaipur rate, not a catalogue price</small></div>
        <div class="tstat"><b data-count-to="cats">${stats.cats}</b><span>categories</span><small>rings to mangalsutra, silver 925 to bridal sets</small></div>
        <div class="tstat"><b data-count-to="${stats.mc}">${stats.mc}</b><span>making-charge rows published</span><small>per category and purity — nothing averaged, nothing hidden</small></div>
        <div class="tstat"><b data-count-to="3" data-count-suffix="%">3%</b><span>GST on every bill</span><small>shown line-by-line before you pay, on every piece</small></div>
      </div>
      <div class="trust-disclosure"><span aria-hidden="true">i</span><p>This page displays information supplied by Shivaa. It does not run government-registry checks, certify jewellery, or guarantee payment or delivery services.</p></div>
      <div id="trustProfile" aria-live="polite" aria-busy="true"><div class="trust-loading" role="status">Loading business details…</div></div>
      <section class="trust-help" aria-label="Understanding these details">
        <details class="acc"><summary>Are these live government verification results?</summary><div class="acc-body">No. CIN, UDYAM and the address are supplied business details. Use the official websites for an independent check. No government lookup, verification date or trust score is created by this page.</div></details>
        <details class="acc"><summary>Does a company identifier verify my jewellery?</summary><div class="acc-body">No item-level assurance is inferred here from a business identifier. Match the HUID on your actual piece and use the official BIS Care app. The <a href="#/hallmark">HUID check guide</a> explains the process; automatic live BIS verification is not connected on this site.</div></details>
        <details class="acc"><summary>Why are GSTIN and certificate downloads empty?</summary><div class="acc-body">Real details and files need to be supplied before publication. We do not fill those gaps with sample numbers, unrelated documents or generated certificates. An empty section is not a government finding.</div></details>
      </section>
      <section class="trust-next"><div><span class="label">Before you choose</span><h2>Take a closer look.</h2><p>Compare the listed details of your shortlisted pieces, or read how to check the actual piece’s HUID.</p></div><div><a class="btn btn-primary" href="#/compare">Compare your shortlist</a><a class="btn btn-ghost" href="#/hallmark">BIS Care / HUID guide</a><a class="trust-contact" href="#/contact">Ask Shivaa a question →</a></div></section>
    </div>`;
    const root = view.querySelector('#trustProfile');
    let renderSequence = 0;
    async function refresh() {
      const sequence = ++renderSequence;
      root.setAttribute('aria-busy', 'true'); root.dataset.state = 'loading';
      root.innerHTML = '<div class="trust-loading" role="status">Loading business details…</div>';
      try {
        const profile = await loadProfile();
        if (!root.isConnected || sequence !== renderSequence) return;
        root.innerHTML = profileHTML(profile); root.dataset.state = 'ready';
        bindCopy(root, profile);
        // v105 — the hero carries the same GSTIN, prominently
        const hero = view.querySelector('#trustHeroGstin');
        if (hero) {
          hero.innerHTML = profile.gstin
            ? `<div class="t-gstin-hero"><span class="tg-k">GSTIN</span><code>${esc(profile.gstin)}</code><button type="button" class="tg-copy">Copy GSTIN</button><small>Owner-provided identifier · 15 characters, checksum valid · publishing it here is not a live government-registry verification.</small></div>`
            : '';
          hero.dataset.bound = '';
        }
      } catch (error) {
        if (!root.isConnected || sequence !== renderSequence) return;
        root.dataset.state = 'unavailable';
        root.innerHTML = '<div class="trust-error" role="alert"><h2>Business details are temporarily unavailable</h2><p>We could not load a reliable response. No previous values or sample documents have been substituted. This is a service error, not a registration finding.</p><button type="button" class="btn btn-outline" id="trustRetry">Try again</button></div>';
        root.querySelector('#trustRetry').onclick = refresh;
      } finally {
        if (root.isConnected && sequence === renderSequence) root.setAttribute('aria-busy', 'false');
      }
    }
    refresh();
  }

  window.Shivaa.routes.trust = renderTrust;
  // Keep footer identity/address sourced from the same allowlisted API as the
  // trust page; never reinstate hard-coded identifiers when a request fails.
  const bootFooter = () => loadProfile().catch(() => {});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootFooter, { once: true });
  else bootFooter();
})();
