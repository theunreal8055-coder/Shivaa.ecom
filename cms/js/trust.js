/* Feature 2 — Why Trust Shivaa. Business details, not invented assurances. */
'use strict';
(function () {
  const { esc } = window.Shivaa;
  const LINKS = Object.freeze({
    mca: 'https://www.mca.gov.in/',
    udyam: 'https://www.udyamregistration.gov.in/Udyam_Verify.aspx',
    gst: 'https://services.gst.gov.in/services/searchtp',
  });
  const external = 'target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer"';
  const icon = paths => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  const building = icon('<path d="M4 21V6l8-3 8 3v15M2 21h20M8 21v-5h8v5M8 8h1m6 0h1M8 12h1m6 0h1"/>');
  const pin = icon('<path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2.5"/>');
  const documentIcon = icon('<path d="M14 3H5v18h14V8l-5-5zM14 3v5h5M8 12h8M8 16h5"/>');
  let pending = null;

  /* v103 — exactly one certificate type is allowlisted, stored at a fixed
     path shape; anything else (other types, URLs, legacy fields) is rejected
     wholesale so the page never publishes a document it cannot account for. */
  function parseCertificate(c) {
    if (!c || typeof c !== 'object' || Array.isArray(c)) return null;
    if (c.type !== 'gst-registration') return null;
    if (typeof c.file !== 'string' || !/^\/uploads\/trust\/[A-Za-z0-9._-]{1,90}\.(pdf|jpe?g|png|webp)$/i.test(c.file)) return null;
    if (c.label !== undefined && c.label !== 'GST registration certificate') return null;
    if (typeof c.uploadedAt !== 'string' || !/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}/.test(c.uploadedAt)) return null;
    return Object.freeze({ type: 'gst-registration', label: 'GST registration certificate', file: c.file, uploadedAt: c.uploadedAt });
  }
  function parseProfile(data) {
    const b = data?.business;
    const id = (value, pattern) => value === null || (typeof value === 'string' && value === value.trim() && pattern.test(value));
    const name = value => value === null || (typeof value === 'string' && value === value.trim() && value.length >= 2 && value.length <= 160 && /^[\p{L}\p{N}&.,()'’\-/ ]{2,}$/u.test(value));
    const address = b?.address;
    const certificates = Array.isArray(data?.certificates) ? data.certificates.map(parseCertificate) : null;
    if (data?.schemaVersion !== 1 || data?.source !== 'store_settings' || !b || Array.isArray(b) ||
        !name(b.legalName) || !name(b.brand) ||
        !id(b.cin, /^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/) ||
        !id(b.udyam, /^UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}$/) ||
        !(address === null || (typeof address === 'string' && address.trim() && [...address].length <= 500 && !/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(address))) ||
        !id(data.gstin, /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/) ||
        certificates === null || certificates.length > 1 || certificates.some(c => !c) ||
        data.registryVerification?.performed !== false || data.registryVerification?.checkedAt !== null) {
      throw new Error('Unrecognised business profile');
    }
    // Allowlist values; no arbitrary URLs, credentials, legal flags or trust scores.
    return Object.freeze({
      legalName: b.legalName, brand: b.brand, gstin: data.gstin,
      cin: b.cin, udyam: b.udyam, address: b.address,
      certificates,
    });
  }

  function syncFooter(profile) {
    const identity = document.getElementById('trustFooterIdentity');
    const address = document.getElementById('trustFooterAddress');
    if (identity) {
      const parts = ['© 2026 ' + (profile?.brand || 'Shivaa Jewels')];
      if (profile?.legalName) parts.push(profile.legalName);
      if (profile?.gstin) parts.push('GSTIN ' + profile.gstin);
      identity.textContent = parts.join(' · ');
    }
    if (address) address.textContent = profile ? (profile.address || 'Store address not provided') : 'Store address temporarily unavailable';
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
  function nameRow(title, value, description) {
    if (!value) return '';
    return `<div class="trust-id-row trust-name-row"><dt><b>${title}</b><span>${description}</span></dt>
      <dd><b class="trust-name-val">${esc(value)}</b></dd></div>`;
  }

  function profileHTML(profile) {
    const cert = profile.certificates && profile.certificates[0];
    return `<div class="trust-grid">
      <section class="trust-card trust-identity" aria-labelledby="trustBusinessTitle">
        <div class="trust-card-top"><span class="trust-icon">${building}</span><span class="trust-badge">Provided by Shivaa</span></div>
        <h2 id="trustBusinessTitle">Business identity</h2>
        <p>${profile.brand ? `<b>${esc(profile.brand)}</b> is the jewellery brand of ${profile.legalName ? `<b>${esc(profile.legalName)}</b>` : 'our registered company'}. ` : ''}Identifiers below can be taken to the official sources for your own checks.</p>
        <dl class="trust-records">
          ${nameRow('Registered company', profile.legalName, 'Legal entity operating shivaa.in & the Shivaa Jewels showrooms')}
          ${nameRow('Brand', profile.brand, 'The public trade name on our bills and storefront')}
          ${identityRow('gstin', 'GSTIN', profile.gstin, 'Goods & Services Tax Identification Number', LINKS.gst, 'GST taxpayer search')}
          ${identityRow('cin', 'CIN', profile.cin, 'Corporate Identification Number', LINKS.mca, 'MCA website')}
          ${identityRow('udyam', 'UDYAM', profile.udyam, 'UDYAM registration number', LINKS.udyam, 'Official UDYAM portal')}
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
          <div class="trust-document" data-trust-gstin><div><h3>GSTIN</h3>${profile.gstin
            ? `<code class="trust-provided">${esc(profile.gstin)}</code><span class="trust-provided-note">Published with the application · verify it independently on the GST portal</span>`
            : '<span class="trust-missing">Not provided</span>'}</div><p>${profile.gstin
            ? 'The store’s GSTIN appears in the Business identity card above with a Copy action and a link to the official GST taxpayer search. Displaying it here is not a live verification result.'
            : 'No GSTIN is published in this feature. A real number must be supplied and reviewed before it appears here.'}</p></div>
          ${cert ? `<div class="trust-document" data-trust-certificates><div><h3>GST registration certificate</h3>
            <a class="trust-cert-link" href="${cert.file}" ${external}>
              <span class="trust-cert-ic">${/\.pdf$/i.test(cert.file) ? '📄' : '🖼'}</span>
              <span><b>View GST certificate ${/\.pdf$/i.test(cert.file) ? '(PDF ↗)' : '(image ↗)'}</b>
              <small>Uploaded by Shivaa · ${new Date(cert.uploadedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</small></span>
            </a></div>
            <p>The owner supplied this document for this page. It is business evidence on record, not a live GST-portal result — confirm it yourself with the official Search Taxpayer link alongside the GSTIN above.</p></div>`
          : `<div class="trust-document" data-trust-certificates><div><h3>Certificate files</h3><span class="trust-missing">Not provided</span></div><p>No certificate files have been provided for this page. There are no sample certificates, generated seals or placeholder downloads.</p></div>`}
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
    view.innerHTML = `<section class="trust-hero"><div class="container">
      <div class="crumbs"><a href="#/">Home</a> / Why Trust Shivaa</div>
      <div class="trust-hero-grid"><div><span class="label">Clarity before confidence</span><h1>Why trust <em class="disp-italic">Shivaa?</em></h1><p>Start with the details you can check. Business identity, a store address, and an honest view of the documents available.</p></div>
        <div class="trust-principle"><span class="trust-wordmark">SHIVAA</span><p>Details on record.<br>Not assumed assurances.</p><small>Identity · Location · Documents</small></div></div>
    </div></section>
    <div class="container trust-page">
      <div class="trust-disclosure"><span aria-hidden="true">i</span><p>This page displays information supplied by Shivaa. It does not run government-registry checks, certify jewellery, or guarantee payment or delivery services.</p></div>
      <div id="trustProfile" aria-live="polite" aria-busy="true"><div class="trust-loading" role="status">Loading business details…</div></div>
      <section class="trust-help" aria-label="Understanding these details">
        <details class="acc"><summary>Are these live government verification results?</summary><div class="acc-body">No. CIN, UDYAM and the address are supplied business details. Use the official websites for an independent check. No government lookup, verification date or trust score is created by this page.</div></details>
        <details class="acc"><summary>Does a company identifier verify my jewellery?</summary><div class="acc-body">No item-level assurance is inferred here from a business identifier. Match the HUID on your actual piece and use the official BIS Care app. The <a href="#/hallmark">HUID check guide</a> explains the process; automatic live BIS verification is not connected on this site.</div></details>
        <details class="acc"><summary>How do I independently verify the GSTIN?</summary><div class="acc-body">Open the official GST taxpayer search (services.gst.gov.in → Search Taxpayer), enter <b>08AAICE5666R1ZP</b> when published, and confirm the legal name <b>Ernate Shine Jewellery Private Limited</b> matches your bill. A number displayed on this page is a business detail on record, not a live government result. Certificate files are not published because none have been supplied for this page — we do not substitute sample documents.</div></details>
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
