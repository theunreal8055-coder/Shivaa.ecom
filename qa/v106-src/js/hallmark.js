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
  const FORMAT_HELP = 'Enter exactly six letters (A–Z) or numbers (0–9). No spaces or punctuation inside the HUID.';

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

  function productPanel(product, inLookup = false) {
    const entries = publicEntries(product);
    return `<section class="hm-product" aria-label="Piece hallmark information">
      <div class="hm-product-head"><h3>BIS hallmark / HUID</h3><span class="hm-badge">${entries.length ? 'Recorded · not verified' : 'HUID not provided'}</span></div>
      ${entries.length ? `<p>Staff-entered references only. These are <b>not BIS verification results</b> and may not identify the piece supplied to you.</p>
        <ul class="hm-records">${entries.map(e => `<li><span>${esc(e.pieceLabel)}</span><code>${esc(e.huid)}</code>${inLookup ? `<button type="button" class="btn btn-ghost btn-sm" data-hm-use="${esc(e.huid)}">Use this HUID</button>` : ''}</li>`).join('')}</ul>`
        : '<p>No piece-level HUID has been provided for this listing. This is missing catalogue data, <b>not a BIS finding</b>.</p>'}
      <p class="hm-note">A design can have multiple physical pieces or detachable parts. Match the HUID on your actual piece and check it in BIS Care. A listed purity or product description is not verification.</p>
      ${inLookup ? '' : `<a class="hm-text-link" href="#/hallmark?product=${encodeURIComponent(product.id)}">Check a HUID with BIS Care →</a>`}
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

  function renderLookup(view, query) {
    view.innerHTML = `<section class="hm-hero"><div class="container">
      <div class="crumbs"><a href="#/">Home</a> / Hallmark &amp; HUID</div>
      <span class="label">Know the piece. Check the source.</span>
      <h1>BIS hallmark <em class="disp-italic">&amp; HUID check</em></h1>
      <p>A six-character code is a starting point, not proof. Check the format here, then use BIS Care for the official lookup.</p>
    </div></section>
    <div class="container hm-page">
      <div class="hm-connection"><span class="hm-info-mark" aria-hidden="true">i</span><div><b>On-site live BIS verification is not connected</b><p>Shivaa cannot confirm whether a HUID exists, is active or belongs to your piece. We will not substitute a sample record or a catalogue match.</p></div></div>
      <div id="hmProductContext"></div>
      <div class="hm-grid">
        <section class="hm-card" aria-labelledby="hmFormTitle">
          <span class="label">Prepare your lookup</span>
          <h2 id="hmFormTitle">Have a HUID?</h2>
          <p>Enter the code you can actually read. If it is missing or unclear, ask the jeweller for the piece details rather than guessing.</p>
          <form id="hmForm" novalidate autocomplete="off">
            <div class="fld"><label for="hmHuid">HUID on your piece</label>
              <input id="hmHuid" name="huid" type="text" inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="64" aria-describedby="hmHelp hmInputError" placeholder="Enter the 6-character HUID">
              <small id="hmHelp">${FORMAT_HELP} Lowercase letters are accepted. This is a format check only.</small>
              <p id="hmInputError" class="hm-error" role="alert" hidden></p>
            </div>
            <div class="hm-actions"><button type="submit" class="btn btn-primary" id="hmSubmit">Check format &amp; continue</button><button type="button" class="btn btn-ghost" id="hmClear">Clear</button></div>
          </form>
          <div id="hmResult" class="hm-result" role="status" aria-live="polite" aria-atomic="true" tabindex="-1" hidden><h3 id="hmResultTitle"></h3><p id="hmResultText"></p></div>
          <div class="hm-copy-row"><button type="button" class="btn btn-outline btn-sm" id="hmCopy" hidden>Copy entered HUID</button><p id="hmCopyStatus" role="status" aria-live="polite"></p></div>
          <p class="hm-note hm-privacy">This tool does not save lookup history or add your code to a URL. The format check sends it to Shivaa’s server, not to BIS. Only “Copy” writes it to your clipboard.</p>
        </section>
        ${officialCard()}
      </div>
      <section class="hm-questions" aria-label="HUID help">
        <details class="acc"><summary>Does an accepted format mean a genuine hallmark?</summary><div class="acc-body">No. Any six letters or numbers can pass a format check. Only the official lookup can show the BIS record, and you still need to compare its details with your actual piece. This website does not assay metal or issue a certificate.</div></details>
        <details class="acc"><summary>What if there is no HUID, no result or a mismatch?</summary><div class="acc-body">A missing code on this website does not prove that a piece is unhallmarked or counterfeit. If a stamp is unreadable, BIS Care returns no result, or details differ, recheck the code and ask BIS or the jeweller for clarification. A service outage is not a “not found” result.</div></details>
        <details class="acc"><summary>What about pairs, detachable parts or silver?</summary><div class="acc-body">Do not reuse a design’s code across multiple pieces or parts. Check the stamp on each actual article and follow the current BIS guidance for its metal and hallmarking scheme. Do not substitute an older hallmark identifier for a six-character HUID.</div></details>
        <p class="hm-source">Guidance: <a href="${LINKS.guidance}" ${external}>BIS hallmarking FAQs ↗</a> · <a href="${LINKS.bisCare}" ${external}>BIS Care information ↗</a>. Links reviewed 6 September 2026; this is not an item verification date.</p>
      </section>
    </div>`;

    const form = view.querySelector('#hmForm');
    const input = view.querySelector('#hmHuid');
    const submit = view.querySelector('#hmSubmit');
    const result = view.querySelector('#hmResult');
    const inputError = view.querySelector('#hmInputError');
    const copy = view.querySelector('#hmCopy');
    const copyStatus = view.querySelector('#hmCopyStatus');
    let sequence = 0, controller = null, acceptedHuid = null;

    const showResult = (title, text, kind) => {
      result.hidden = false; result.dataset.state = kind;
      view.querySelector('#hmResultTitle').textContent = title;
      view.querySelector('#hmResultText').textContent = text;
    };
    const invalidate = () => {
      sequence++; controller?.abort(); controller = null; acceptedHuid = null;
      result.hidden = true; copy.hidden = true; copyStatus.textContent = '';
      inputError.hidden = true; inputError.textContent = ''; input.removeAttribute('aria-invalid');
      submit.disabled = false; form.removeAttribute('aria-busy');
    };
    input.addEventListener('input', invalidate);
    view.querySelector('#hmClear').onclick = () => { input.value = ''; invalidate(); input.focus(); };
    addEventListener('hashchange', invalidate, { once: true });

    form.onsubmit = async event => {
      event.preventDefault(); invalidate();
      const code = normaliseHuid(input.value);
      if (!code) {
        inputError.textContent = FORMAT_HELP + ' No BIS lookup has been performed.';
        inputError.hidden = false; input.setAttribute('aria-invalid', 'true'); input.focus(); return;
      }
      input.value = code;
      const requestId = sequence;
      controller = new AbortController();
      const activeController = controller;
      const timeout = setTimeout(() => activeController.abort(), 8000);
      submit.disabled = true; form.setAttribute('aria-busy', 'true');
      showResult('Checking service availability…', 'Your code has a six-character format. This is not a BIS verification.', 'pending');
      const stillCurrent = () => requestId === sequence && form.isConnected && normaliseHuid(input.value) === code;
      try {
        const response = await fetch('/api/hallmark/lookup', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ huid: code }),
          credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', signal: activeController.signal,
        });
        const data = await response.json();
        if (!stillCurrent()) return;
        // Only our explicit unavailable contract is understood in this release.
        // Fail closed on HTML, unknown schemas, forged "verified", or stale data.
        if (response.status !== 503 || data?.status !== 'unavailable' || data?.reason !== 'not_connected' || data?.huid !== code || data?.formatValid !== true || data?.verified !== false || data?.record !== null || data?.checkedAt !== null) {
          throw new Error('Unexpected lookup response');
        }
        acceptedHuid = code; copy.hidden = false;
        showResult('Format accepted · NOT verified', 'Entered HUID: ' + code + '. Automatic BIS verification is not connected. Copy the code if needed, then complete “Verify HUID” in the official BIS Care app. No BIS record has been retrieved here.', 'unavailable');
      } catch (error) {
        if (!stillCurrent()) return;
        showResult('Verification unavailable · no result', 'The service could not provide a trustworthy response. Your entry has NOT been verified, and this is not a “not found” result. Retry or use the official BIS Care links directly.', 'error');
      } finally {
        clearTimeout(timeout);
        if (stillCurrent()) { controller = null; submit.disabled = false; form.removeAttribute('aria-busy'); }
      }
    };

    copy.onclick = async () => {
      const code = acceptedHuid, copySequence = sequence;
      if (!code || normaliseHuid(input.value) !== code) return;
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(code);
        if (copySequence === sequence && form.isConnected) copyStatus.textContent = 'HUID copied. It has not been verified.';
      } catch (error) {
        if (copySequence !== sequence || !form.isConnected) return;
        input.focus(); input.select();
        copyStatus.textContent = 'Copy was not allowed. The code is selected; copy it manually.';
      }
    };

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
          context.innerHTML = `<p class="hm-context-name">For <a href="#/product/${encodeURIComponent(data.product.id)}">${esc(data.product.name)}</a></p>` + productPanel(data.product, true);
          context.querySelectorAll('[data-hm-use]').forEach(button => {
            button.onclick = () => { invalidate(); input.value = button.dataset.hmUse; input.focus(); };
          });
        } catch (error) {
          if (context.isConnected) context.textContent = 'Product references could not be loaded. You can still enter the HUID from your actual piece below.';
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
