/* Feature 1 — HUID format checks, staff references and official BIS handoff.
 * No local/sample/merchant data may ever be presented as a BIS lookup result.
 */
'use strict';
(function () {
  // v42: defensive init — if Shivaa shell isn't ready, retry once after a tick
  if (!window.Shivaa || !window.Shivaa.api) {
    setTimeout(() => {
      if (window.Shivaa && window.Shivaa.api) {
        // Re-trigger by dispatching a hashchange if we're on the hallmark page
        if (location.hash.startsWith('#/hallmark')) {
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        }
      }
    }, 500);
    return;
  }
  const { api, state, esc, toast, openModal } = window.Shivaa;
  const LINKS = Object.freeze({
    bisCare: 'https://www.bis.gov.in/bis-apps/?lang=en',
    android: 'https://play.google.com/store/apps/details?id=com.bis.bisapp',
    ios: 'https://apps.apple.com/in/app/bis-care-app/id6443724891',
    guidance: 'https://www.bis.gov.in/hallmarking-overview/hallmarking-faqs/hallmarking-faq/?lang=en',
  });
  const external = 'target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer"';

  function normaliseHuid(value) {
    if (typeof value !== 'string' || value.length > 64) return null;
    const text = value.replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, '');
    return /^[A-Za-z0-9]{6}$/.test(text) ? text.toUpperCase() : null;
  }

  function publicEntries(product) {
    const hm = product?.hallmark;
    if (hm?.status !== 'recorded_unverified' || hm?.source !== 'staff_entered' || hm?.verified !== false || !Array.isArray(hm.entries)) return [];
    // Unknown/legacy fields and flags are not evidence. Never render a verified
    // badge, even if an older backend or catalogue contains one.
    return hm.entries.filter(e => e && normaliseHuid(e.huid) && typeof e.pieceLabel === 'string').slice(0, 50);
  }

  function productPanel(product, inLookup = false, hideHandoffLink = false) {
    const entries = publicEntries(product);
    return `<section class="hm-product" aria-label="Piece hallmark information">
      <div class="hm-product-head"><h3>BIS hallmark / HUID</h3><span class="hm-badge">${entries.length ? 'Recorded · not verified' : 'HUID not provided'}</span></div>
      ${entries.length ? `<p>Staff-entered references only. These are <b>not BIS verification results</b> and may not identify the piece supplied to you.</p>
        <ul class="hm-records">${entries.map(e => `<li><span>${esc(e.pieceLabel)}</span><code>${esc(e.huid)}</code>${inLookup ? `<button type="button" class="btn btn-ghost btn-sm" data-hm-use="${esc(e.huid)}">Use this HUID</button>` : ''}</li>`).join('')}</ul>`
        : '<p>No piece-level HUID has been provided for this listing. This is missing catalogue data, <b>not a BIS finding</b>.</p>'}
      <p class="hm-note">A design can have multiple physical pieces or detachable parts. Match the HUID on your actual piece and check it in BIS Care. A listed purity or product description is not verification.</p>
      ${inLookup || hideHandoffLink ? '' : `<a class="hm-text-link" href="#/hallmark?product=${encodeURIComponent(product.id)}">Check a HUID with BIS Care →</a>`}
    </section>`;
  }

  function officialCard() {
    return `<aside class="hm-card hm-official" aria-labelledby="hmOfficialTitle">
      <span class="label">The official source</span>
      <h2 id="hmOfficialTitle">Finish your check<br>in BIS Care</h2>
      <p>BIS provides the “Verify HUID” feature in its own app. Open the official page for app information and download links.</p>
      <a class="btn btn-primary" href="${LINKS.bisCare}" ${external}>Open official BIS Care page ↗</a>
      <div class="hm-app-links"><a href="${LINKS.android}" ${external}>Android app ↗</a><a href="${LINKS.ios}" ${external}>iPhone app ↗</a></div>
      <ol class="hm-steps">
        <li><b>Read the actual stamp</b><span>Use the HUID on your piece. Do not substitute a SKU, barcode, purity grade or jeweller registration number.</span></li>
        <li><b>Choose “Verify HUID”</b><span>In BIS Care, enter the code and follow the app’s instructions.</span></li>
        <li><b>Compare the official details</b><span>Check the returned information against the actual piece and the information supplied by your jeweller. Ask BIS or your jeweller about any mismatch.</span></li>
      </ol>
      <p class="hm-note">These links open outside Shivaa. They do not submit your HUID or return a verification result to this website. Opening the app alone does not verify a piece.</p>
    </aside>`;
  }

  /* v101 — the on-website format checker was removed on request. Customers are
     taken straight to the official BIS Care app; this page is a handoff guide
     only — no input, no server call, no result that could be mistaken for a
     verification. Product HUID references (?product=) remain informational. */
  function renderLookup(view, query) {
    view.innerHTML = `<section class="hm-hero"><div class="container">
      <div class="crumbs"><a href="#/">Home</a> / Hallmark &amp; HUID</div>
      <span class="label">Know the piece. Check the official source.</span>
      <h1>Verify your HUID <em class="disp-italic">in BIS Care</em></h1>
      <p>Every Shivaa gold piece carries a six-character HUID stamped on it. The official verification happens in the Government of India’s <b>BIS Care app</b> — free, official, and takes under a minute.</p>
      <div class="hm-hero-cta">
        <a class="btn btn-primary" href="${LINKS.android}" ${external}>📱 Get BIS Care for Android ↗</a>
        <a class="btn btn-outline hm-ios" href="${LINKS.ios}" ${external}> iPhone / iPad ↗</a>
      </div>
    </div></section>
    <div class="container hm-page">
      <div id="hmProductContext"></div>
      <div class="hm-handoff-grid">
        <section class="hm-card hm-steps-card" aria-labelledby="hmStepsTitle">
          <span class="label">3-step official check</span>
          <h2 id="hmStepsTitle">How to check in BIS Care</h2>
          <ol class="hm-bigsteps">
            <li><span class="hm-stepn">1</span><div><b>Read the HUID on your piece</b><p>Find the six-character code stamped on the jewellery (and on your Shivaa bill). It mixes letters and numbers, e.g. <code>AB12C3</code>. Use the code on the <b>actual piece</b> — never a SKU, barcode or purity number.</p></div></li>
            <li><span class="hm-stepn">2</span><div><b>Open BIS Care → “Verify HUID”</b><p>Download the official <b>BIS Care</b> app by the Bureau of Indian Standards from the Google Play Store or Apple App Store, then choose the <b>Verify HUID</b> section.</p></div></li>
            <li><span class="hm-stepn">3</span><div><b>Enter the code and compare</b><p>Type the six characters exactly as stamped. Check that the details BIS returns match your piece and the information on your Shivaa bill. Ask us or BIS about any mismatch.</p></div></li>
          </ol>
          <div class="hm-appbtns">
            <a class="btn btn-primary" href="${LINKS.android}" ${external}>Android app ↗</a>
            <a class="btn btn-outline" href="${LINKS.ios}" ${external}>iPhone app ↗</a>
            <a class="btn btn-ghost" href="${LINKS.guidance}" ${external}>BIS hallmarking FAQs ↗</a>
          </div>
          <p class="hm-note">Shivaa never sees the HUID you type into BIS Care. These links open official BIS pages outside this website. Opening the app alone does not verify a piece — complete “Verify HUID” inside it.</p>
        </section>
        ${officialCard()}
      </div>
      <section class="hm-questions" aria-label="HUID help">
        <details class="acc" open><summary>Why no HUID checker on the Shivaa website?</summary><div class="acc-body">Because only BIS holds the hallmark register. A website box that “accepts” a six-character code could be mistaken for a genuine verification — any six letters or numbers would pass. We removed our format checker so the only check you perform is the official one, in BIS Care.</div></details>
        <details class="acc"><summary>What marks should I see on hallmarked gold?</summary><div class="acc-body">Three marks together: the <b>BIS logo</b>, the <b>six-character HUID</b>, and the <b>purity grade</b> (e.g. 22K916 for 22-carat, 18K750 for 18-carat, 14K585 for 14-carat). Every Shivaa gold piece is hallmarked, with the HUID printed on the bill.</div></details>
        <details class="acc"><summary>What if there is no HUID, no result or a mismatch?</summary><div class="acc-body">Re-read the stamp carefully — HUIDs are tiny. If BIS Care returns no result or the returned details do not match the piece, message us on WhatsApp with a photo of the stamp and your bill; we resolve it before you leave the store or within 48 hours of delivery.</div></details>
        <details class="acc"><summary>What about pairs, detachable parts or silver?</summary><div class="acc-body">Heavy or multi-piece articles (e.g. bridal sets, bangles with screws) can carry more than one HUID — check each article. Silver articles of the notified categories carry BIS hallmarking too; follow the same Verify HUID flow in BIS Care.</div></details>
        <p class="hm-source">Official: <a href="${LINKS.bisCare}" ${external}>BIS Care information ↗</a> · <a href="${LINKS.guidance}" ${external}>BIS hallmarking FAQs ↗</a>. Links reviewed 13 September 2026; this is not an item verification date.</p>
      </section>
    </div>`;

    // Product ID provides context only. A HUID in a URL is never trusted or
    // auto-submitted. Records are fetched afresh, not inferred from an SKU.
    const productId = query.get('product');
    if (productId) {
      const context = view.querySelector('#hmProductContext');
      const loadContext = async () => {
        context.textContent = 'Loading product HUID references…';
        try {
          if (!/^[\w-]+$/.test(productId)) throw new Error('Invalid product ID');
          const data = await api('/api/products/' + encodeURIComponent(productId));
          if (!context.isConnected) return;
          context.innerHTML = `<p class="hm-context-name">For <a href="#/product/${encodeURIComponent(data.product.id)}">${esc(data.product.name)}</a></p>` + productPanel(data.product, false, true);
        } catch (error) {
          if (context.isConnected) context.textContent = 'Product references could not be loaded. Use the HUID stamped on your actual piece.';
        }
      };
      loadContext();
    }
  }

  let editorSequence = 0;
  async function editRecords(id) {
    const requestId = ++editorSequence, startHash = location.hash;
    let data;
    try { data = await api('/api/admin/products/' + encodeURIComponent(id) + '/hallmark'); }
    catch (error) { toast(error.message, 'err'); return; }
    if (requestId !== editorSequence || startHash !== location.hash) return;
    const record = data?.hallmark;
    if (data?.productId !== id || typeof data?.name !== 'string' || !Number.isInteger(record?.revision) || record.revision < 0 || !Array.isArray(record?.entries) || record.entries.length > 50 || record.entries.some(e => !e || !normaliseHuid(e.huid) || typeof e.pieceLabel !== 'string' || typeof e.sourceNote !== 'string')) {
      toast('HUID records could not be loaded reliably. No changes were made.', 'err'); return;
    }
    openModal(`<h3 id="hmEditorTitle">Piece HUID records</h3><p class="hm-context-name">${esc(data.name)}</p>
      <div class="hm-connection"><div><b>Staff-entered · never BIS verified</b><p>Record only codes actually read from a piece or source document. Leave missing or unreadable codes blank. No sample values, generated HUIDs or verification checkboxes.</p></div></div>
      ${record.needsReview ? '<p class="hm-error">Unrecognised legacy hallmark data was not used. Re-enter only references you can substantiate.</p>' : ''}
      <form id="hmEditor" novalidate><p class="hm-note">One row per physical piece or detachable part, not per SKU. The piece label and HUID are public; the required source note is staff-only. Do not include personal data.</p>
        <div id="hmEditorRows"></div><p id="hmEditorEmpty" class="hm-note">No HUID records. Nothing will be invented or marked verified.</p>
        <button type="button" class="btn btn-ghost btn-sm" id="hmAddRow">+ Add actual piece HUID</button>
        <p id="hmEditorError" class="hm-error" role="alert" hidden></p>
        <div class="hm-actions"><button type="submit" class="btn btn-primary">Save staff records</button><button type="button" class="btn btn-ghost" id="hmEditorCancel">Cancel</button></div>
      </form>`, 'lg');
    const form = document.getElementById('hmEditor');
    document.getElementById('modalBox').setAttribute('aria-labelledby', 'hmEditorTitle');
    const rows = form.querySelector('#hmEditorRows'), empty = form.querySelector('#hmEditorEmpty');
    const add = form.querySelector('#hmAddRow'), errorBox = form.querySelector('#hmEditorError');
    let rowId = 0;
    function addRow(entry = {}) {
      if (rows.children.length >= 50) return;
      const key = 'hmRecord' + rowId++;
      const row = document.createElement('fieldset'); row.className = 'hm-editor-row';
      row.innerHTML = `<legend>Physical piece / part</legend>
        <div class="fld"><label for="${key}Code">Actual HUID</label><input id="${key}Code" name="huid" maxlength="64" autocomplete="off" autocapitalize="characters" spellcheck="false" value="${esc(entry.huid || '')}" required></div>
        <div class="fld"><label for="${key}Piece">Piece / part label (public)</label><input id="${key}Piece" name="pieceLabel" maxlength="80" value="${esc(entry.pieceLabel || '')}" required></div>
        <div class="fld hm-editor-source"><label for="${key}Source">Where was this code read? (staff only)</label><input id="${key}Source" name="sourceNote" maxlength="300" value="${esc(entry.sourceNote || '')}" required></div>
        <button type="button" class="hm-text-link" data-remove>Remove this record</button>`;
      row.querySelector('[data-remove]').onclick = () => { row.remove(); empty.hidden = rows.children.length > 0; add.disabled = false; add.focus(); };
      rows.appendChild(row); empty.hidden = true; add.disabled = rows.children.length >= 50;
      return row;
    }
    record.entries.forEach(e => addRow(e));
    add.onclick = () => addRow()?.querySelector('input').focus();
    form.querySelector('#hmEditorCancel').onclick = () => window.Shivaa.closeModal();
    form.onsubmit = async event => {
      event.preventDefault(); errorBox.hidden = true;
      const entries = [...rows.children].map(row => Object.fromEntries([...row.querySelectorAll('input')].map(i => [i.name, i.value])));
      if (entries.some(e => !normaliseHuid(e.huid) || !e.pieceLabel.trim() || !e.sourceNote.trim())) {
        errorBox.textContent = 'Every row needs an actual six-character HUID, a piece label and a source note. Remove empty rows; never guess a code.';
        errorBox.hidden = false; return;
      }
      const controls = [...form.querySelectorAll('button, input')];
      controls.forEach(c => { c.disabled = true; });
      try {
        const saved = await api('/api/admin/products/' + encodeURIComponent(id) + '/hallmark', {
          method: 'PUT', body: JSON.stringify({ entries, expectedRevision: record.revision }),
        });
        if (saved?.product?.id !== id || saved?.product?.hallmark?.verified !== false || saved?.hallmark?.revision !== record.revision + 1) {
          throw new Error('The save response could not be confirmed. Reopen the HUID editor and check before retrying.');
        }
        const cached = state.productsCache.find(p => p.id === id);
        if (cached) cached.hallmark = saved.product.hallmark;
        if (!form.isConnected || !document.getElementById('modalOverlay').classList.contains('open')) return;
        toast('Staff HUID records saved — not BIS verified.');
        window.Shivaa.closeModal(); window.Shivaa.redraw();
      } catch (error) {
        if (form.isConnected) { errorBox.textContent = error.message; errorBox.hidden = false; }
      } finally {
        controls.forEach(c => { c.disabled = false; }); add.disabled = rows.children.length >= 50;
      }
    };
  }

  window.ShivaaHallmark = { productPanel, editRecords };
  window.Shivaa.routes.hallmark = renderLookup;
})();
