/* v183 — Bridal + Mayra appointment request journey.
   Loaded before app.js; the app calls the registration hook once its route
   table exists, so a direct #/bridal link works on first paint. */
(() => {
  'use strict';

  const SOURCE_OPTIONS = [
    ['website', 'Shivaa website'], ['instagram', 'Instagram'], ['whatsapp', 'WhatsApp'],
    ['customer-referral', 'A family / customer referred me'], ['market', 'Market card / handout'],
    ['billboard', 'Billboard'], ['event', 'Local event'], ['partner', 'Local partner'],
    ['store', 'I visited the store'], ['other', 'Somewhere else'],
  ];
  const SOURCE_ALIASES = {
    ig: 'instagram', insta: 'instagram', instagram: 'instagram',
    wa: 'whatsapp', 'whats-app': 'whatsapp', whatsapp: 'whatsapp',
    referral: 'customer-referral', referred: 'customer-referral', friend: 'customer-referral', customer: 'customer-referral',
    'customer-referral': 'customer-referral', 'family-referral': 'customer-referral', 'referred-by-family': 'customer-referral',
    flyer: 'market', handout: 'market', market: 'market', print: 'market', 'market-card': 'market', 'local-market': 'market',
    billboard: 'billboard', hoarding: 'billboard', event: 'event', mela: 'event', 'local-event': 'event', exhibition: 'event',
    partner: 'partner', jeweller: 'partner', store: 'store', showroom: 'store',
    website: 'website', web: 'website', other: 'other',
  };
  const INTERESTS = {
    bridal: [
      ['aad', 'Aad'], ['timaniya', 'Timaniya'], ['rani-haar', 'Rani haar'],
      ['bangles-kada', 'Bangdi / kada'], ['borla', 'Borla / rakhdi'], ['nath', 'Nath'],
      ['hathphool', 'Hathphool'], ['mangalsutra', 'Mangalsutra'], ['payal', 'Payal'],
      ['not-sure', 'I’m still exploring'],
    ],
    mayra: [
      ['gold-jewellery', 'Gold jewellery'], ['silver-articles', 'Silver articles'],
      ['gift-combinations', 'Gift combinations'], ['presentation', 'Presentation ideas'],
      ['not-sure', 'I’m still exploring'],
    ],
  };
  const SESSION_KEY = 'shv_bridal_attribution_v183';
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
  const cleanTrack = (value, max = 80) => String(value || '').trim().replace(/[^A-Za-z0-9 _.-]/g, '').slice(0, max);
  const localISODate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const normalizeSource = value => {
    const key = String(value || '').trim().toLowerCase().replace(/[ _]+/g, '-');
    return SOURCE_ALIASES[key] || 'website';
  };
  function readAttribution(params) {
    let prior = {};
    try { prior = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}') || {}; } catch (_) {}
    const incoming = {
      source: params && (params.get('utm_source') || params.get('source') || params.get('ref_source')),
      campaign: params && (params.get('utm_campaign') || params.get('campaign')),
      referralCode: params && (params.get('ref') || params.get('code') || params.get('referral')),
    };
    const result = {
      source: normalizeSource(incoming.source || (incoming.referralCode ? 'customer-referral' : prior.source || 'website')),
      campaign: cleanTrack(incoming.campaign || prior.campaign || '', 80),
      referralCode: cleanTrack(incoming.referralCode || prior.referralCode || '', 40),
    };
    // Only campaign attribution is kept, in this browser tab; no identity or
    // contact details are stored before the customer submits the form.
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(result)); } catch (_) {}
    return result;
  }

  function renderInterestChips(root, type) {
    const host = root.querySelector('[data-interest-list]');
    if (!host) return;
    host.innerHTML = INTERESTS[type].map(([value, label]) => `
      <label class="shv-interest-chip"><input type="checkbox" name="interests" value="${value}"><span><i aria-hidden="true">✦</i>${label}</span></label>`).join('');
  }

  function register(routes) {
    routes.bridal = function bridalPage(view, params) {
      const attribution = readAttribution(params);
      const initialType = params && ['bridal', 'mayra'].includes(params.get('journey')) ? params.get('journey')
        : params && ['bridal', 'mayra'].includes(params.get('type')) ? params.get('type') : 'bridal';
      const sourceOptions = SOURCE_OPTIONS.map(([value, label]) => `<option value="${value}" ${attribution.source === value ? 'selected' : ''}>${label}</option>`).join('');
      view.innerHTML = `
        <div class="shv-bridal-page">
          <section class="shv-bridal-hero" aria-labelledby="shvBridalTitle">
            <div class="container shv-bridal-hero-in">
              <div class="shv-bridal-hero-copy">
                <span class="shv-bridal-kicker"><i aria-hidden="true">✦</i> A Shivaa Jewels family experience · Jayal</span>
                <p class="shv-bridal-overline">For the bride. For the whole family.</p>
                <h1 id="shvBridalTitle">A moment worth<br><em>remembering.</em></h1>
                <p class="shv-bridal-lede">Plan a thoughtful showroom conversation for bridal heirlooms or your family’s Mayra / Bhaat gifting. Tell us what matters; our family will call to arrange a suitable time.</p>
                <div class="shv-bridal-hero-actions">
                  <button type="button" class="shv-bridal-primary" data-journey="bridal">Plan a bridal visit <span aria-hidden="true">↓</span></button>
                  <button type="button" class="shv-bridal-secondary" data-journey="mayra">Plan a Mayra visit <span aria-hidden="true">↓</span></button>
                </div>
                <p class="shv-bridal-hero-note"><span aria-hidden="true">✦</span> Your requested date is a preference, not a confirmed appointment. We’ll confirm with you personally.</p>
              </div>
              <div class="shv-bridal-hero-seal" aria-hidden="true"><span>SHIVAA</span><i>✦</i><small>Jayal · Rajasthan</small></div>
            </div>
          </section>

          <section class="shv-bridal-intro container" aria-label="Choose a visit">
            <div class="shv-bridal-intro-copy"><span class="shv-bridal-label">Two journeys, one warm welcome</span><h2>Made for your <em>occasion.</em></h2><p>Come with a starting point—or simply with questions. A request helps our family prepare for the conversation; it never locks you into a purchase.</p></div>
            <div class="shv-journey-grid">
              <button type="button" class="shv-journey-card is-bridal" data-journey="bridal">
                <span class="shv-journey-mark" aria-hidden="true">01 <i>✦</i></span><span class="shv-journey-title">The Bridal Edit</span>
                <span class="shv-journey-copy">Explore the pieces and details you’d like to discuss for the bride—at a pace that feels right for your family.</span><span class="shv-journey-link">Plan a bridal visit <b aria-hidden="true">↗</b></span>
              </button>
              <button type="button" class="shv-journey-card is-mayra" data-journey="mayra">
                <span class="shv-journey-mark" aria-hidden="true">02 <i>✦</i></span><span class="shv-journey-title">Mayra / Bhaat</span>
                <span class="shv-journey-copy">Bring your gifting ideas together—from jewellery and silver articles to thoughtful presentation.</span><span class="shv-journey-link">Plan a Mayra visit <b aria-hidden="true">↗</b></span>
              </button>
            </div>
          </section>

          <section class="shv-bridal-ritual" aria-label="What happens next">
            <div class="container shv-bridal-ritual-in">
              <div class="shv-bridal-ritual-heading"><span class="shv-bridal-label">A more personal way to begin</span><h2>From first thought<br>to <em>in-person.</em></h2><p>No pressure to know every detail. A few preferences help us make your first conversation more useful.</p></div>
              <div class="shv-ritual-steps">
                <article><span>01</span><div><b>Share your occasion</b><p>Choose Bridal or Mayra and tell us which designs or gifts you’d like to explore.</p></div></article>
                <article><span>02</span><div><b>Request a visit</b><p>Leave a preferred day and time window. Our team will contact you to confirm what works.</p></div></article>
                <article><span>03</span><div><b>Meet us in Jayal</b><p>Talk through your questions with the Shivaa family. No purchase is required to ask or explore.</p></div></article>
              </div>
            </div>
          </section>

          <section class="shv-bridal-booking container" id="shvVisitRequest" aria-labelledby="shvBookingTitle">
            <div class="shv-booking-heading"><span class="shv-bridal-label">Your family, your moment</span><h2 id="shvBookingTitle">Begin your <em>visit request.</em></h2><p>Share only what helps us plan a helpful first conversation. We’ll call or message to agree a time before your visit.</p><div class="shv-booking-contact"><a href="tel:+918905005921">Call +91 89050 05921</a><span aria-hidden="true">·</span><button type="button" id="shvBookingWhatsApp">Or message us on WhatsApp</button></div></div>
            <div class="shv-booking-card">
              <div class="shv-booking-card-top"><span><i aria-hidden="true">✦</i> A private request to the Shivaa family</span><small>Usually takes about 2 minutes</small></div>
              <form id="shvVisitForm" novalidate>
                <input type="hidden" name="type" value="${initialType}">
                <input type="hidden" name="campaign" value="${esc(attribution.campaign)}">
                <div class="shv-form-section">
                  <div class="shv-form-step"><span>01</span><div><b>Choose your journey</b><small>What are we planning for?</small></div></div>
                  <div class="shv-journey-switch" role="group" aria-label="Choose Bridal or Mayra">
                    <button type="button" class="${initialType === 'bridal' ? 'is-active' : ''}" data-select-journey="bridal" aria-pressed="${initialType === 'bridal'}"><span aria-hidden="true">✧</span> Bridal</button>
                    <button type="button" class="${initialType === 'mayra' ? 'is-active' : ''}" data-select-journey="mayra" aria-pressed="${initialType === 'mayra'}"><span aria-hidden="true">❋</span> Mayra / Bhaat</button>
                  </div>
                  <p class="shv-form-hint" id="shvJourneyHint">A starting point is enough. You can change your mind when we speak.</p>
                </div>
                <div class="shv-form-section">
                  <div class="shv-form-step"><span>02</span><div><b>What would you like to explore?</b><small>Select any that interest you—or choose “still exploring”.</small></div></div>
                  <div class="shv-interest-list" data-interest-list></div>
                  <p class="shv-form-hint">These are conversation starters, not a promise of current stock or price.</p>
                </div>
                <div class="shv-form-section">
                  <div class="shv-form-step"><span>03</span><div><b>Help us prepare</b><small>Optional details that make the conversation more useful.</small></div></div>
                  <div class="shv-form-grid">
                    <div class="shv-field"><label for="shvName">Your name <span aria-hidden="true">*</span></label><input id="shvName" name="name" type="text" autocomplete="name" maxlength="80" placeholder="Name of the person we should ask for" required></div>
                    <div class="shv-field"><label for="shvPhone">Mobile number <span aria-hidden="true">*</span></label><div class="shv-phone-wrap"><span aria-hidden="true">+91</span><input id="shvPhone" name="phone" type="tel" inputmode="numeric" autocomplete="tel-national" maxlength="10" pattern="[6-9][0-9]{9}" placeholder="10-digit mobile number" required aria-describedby="shvPhoneHint"></div><small id="shvPhoneHint">We’ll use this only to respond to your visit request.</small></div>
                    <div class="shv-field"><label for="shvEmail">Email <small>(optional)</small></label><input id="shvEmail" name="email" type="email" autocomplete="email" maxlength="120" placeholder="If you’d prefer email"></div>
                    <div class="shv-field"><label for="shvVillage">Town or village <small>(optional)</small></label><input id="shvVillage" name="village" type="text" autocomplete="address-level2" maxlength="80" placeholder="Jayal, Nagaur, etc."></div>
                    <div class="shv-field"><label for="shvDate">Preferred visit date <small>(optional)</small></label><input id="shvDate" name="preferredDate" type="date" min="${localISODate()}" aria-describedby="shvDateHint"><small id="shvDateHint">A preference only; Shivaa will contact you to confirm.</small></div>
                    <div class="shv-field"><label for="shvTime">Preferred time window</label><select id="shvTime" name="timePreference"><option value="flexible">I’m flexible</option><option value="late-morning">Late morning</option><option value="afternoon">Afternoon</option><option value="early-evening">Early evening</option></select></div>
                    <div class="shv-field"><label for="shvTimeline">When is the occasion?</label><select id="shvTimeline" name="eventTimeline"><option value="prefer-in-person">I’ll share in person</option><option value="under-3-months">Within 3 months</option><option value="3-6-months">In 3–6 months</option><option value="6-plus-months">More than 6 months away</option></select></div>
                    <div class="shv-field"><label for="shvParty">How many may join you?</label><select id="shvParty" name="partySize"><option value="1">Just me</option><option value="2">2 people</option><option value="3">3 people</option><option value="4">4 people</option><option value="5">5 people</option><option value="6">6 people</option><option value="7">7 people</option><option value="8">8 or more</option></select></div>
                    <div class="shv-field shv-travel-field"><label class="shv-checkline"><input type="checkbox" name="travelHelp" value="yes"><span>I’d appreciate a call about planning the trip to Jayal.</span></label></div>
                  </div>
                </div>
                <div class="shv-form-section shv-attribution-section">
                  <div class="shv-form-step"><span>04</span><div><b>How did you find us?</b><small>This helps our local family understand what is useful.</small></div></div>
                  <div class="shv-form-grid shv-form-grid-short">
                    <div class="shv-field"><label for="shvSource">Your source</label><select id="shvSource" name="source">${sourceOptions}</select></div>
                    <div class="shv-field"><label for="shvReferral">Referral code <small>(if you have one)</small></label><input id="shvReferral" name="referralCode" type="text" maxlength="40" autocomplete="off" value="${esc(attribution.referralCode)}" placeholder="Optional code"></div>
                  </div>
                </div>
                <div class="shv-consent-box">
                  <label class="shv-checkline"><input type="checkbox" name="contactConsent" value="yes" required><span>I agree that Shivaa Jewels may contact me about this visit request by phone or WhatsApp (and email if provided). <b>*</b></span></label>
                  <label class="shv-checkline"><input type="checkbox" name="privacyConsent" value="yes" required><span>I have read the <a href="#/privacy">Privacy Notice</a> and agree to the use of these details to respond to this request. <b>*</b></span></label>
                  <label class="shv-checkline shv-marketing-check"><input type="checkbox" name="marketingConsent" value="yes"><span>Optional: I’d like occasional bridal-design and rate updates; I can contact Shivaa to stop them at any time.</span></label>
                </div>
                <div class="shv-trap" aria-hidden="true"><label>Leave this field blank<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
                <p class="shv-form-error" id="shvFormError" role="alert" hidden></p>
                <button class="shv-submit" type="submit"><span>Request a visit</span><b aria-hidden="true">→</b></button>
                <p class="shv-form-disclaimer">Sending this form is a request—not an appointment confirmation or an obligation to buy. Our family will contact you to confirm a day and time.</p>
              </form>
              <div class="shv-booking-success" id="shvBookingSuccess" role="status" tabindex="-1" hidden>
                <div class="shv-success-mark" aria-hidden="true">✦</div><span class="shv-bridal-label">Your note has reached our family</span><h3>Thank you, <em id="shvSuccessName">friend.</em></h3>
                <p id="shvSuccessNote">Your visit request is received. A Shivaa team member will contact you to agree a suitable time. <b>Your appointment is not confirmed yet.</b></p>
                <div class="shv-request-ref">Request reference <b id="shvRequestId"></b></div>
                <div class="shv-success-actions"><button type="button" class="shv-bridal-primary" id="shvSuccessWhatsApp">Continue on WhatsApp</button><a href="tel:+918905005921" class="shv-bridal-secondary">Call Shivaa</a></div>
                <a href="#/" class="shv-return-home">Return to Shivaa Jewels</a>
              </div>
            </div>
          </section>

          <section class="shv-sample-note container" aria-label="Product sample transparency"><span class="shv-sample-icon" aria-hidden="true">✦</span><div><span class="shv-bridal-label">A note on display samples</span><h2>See clearly. Choose confidently.</h2><p>If a gold-plated silver display or trial sample is used to show a design, we’ll identify it clearly as a sample. It is <b>not gold</b> and does not represent gold weight, feel, purity, price or availability. We’ll explain the actual piece and its details separately.</p></div></section>

          <section class="shv-bridal-endcap"><div class="container"><span class="shv-bridal-label">Shivaa Jewels · Sadar Bazaar</span><h2>We look forward to<br><em>meeting your family.</em></h2><p>Jayal, Nagaur district, Rajasthan 341023</p><div><a href="tel:+918905005921">Call +91 89050 05921</a><button type="button" id="shvEndWhatsApp">WhatsApp our family</button></div></div></section>
        </div>`;

      const form = view.querySelector('#shvVisitForm');
      const typeInput = form.elements.type;
      const journeyHint = view.querySelector('#shvJourneyHint');
      const setJourney = type => {
        if (!['bridal', 'mayra'].includes(type)) return;
        typeInput.value = type;
        view.querySelectorAll('[data-select-journey]').forEach(button => {
          const selected = button.dataset.selectJourney === type;
          button.classList.toggle('is-active', selected);
          button.setAttribute('aria-pressed', String(selected));
        });
        journeyHint.textContent = type === 'mayra'
          ? 'A Mayra / Bhaat conversation can cover gifting ideas across your family. You can change your mind when we speak.'
          : 'A starting point is enough. You can change your mind when we speak.';
        renderInterestChips(view, type);
      };
      renderInterestChips(view, initialType);
      view.querySelectorAll('[data-select-journey]').forEach(button => button.addEventListener('click', () => setJourney(button.dataset.selectJourney)));
      view.querySelectorAll('[data-journey]').forEach(button => button.addEventListener('click', () => {
        setJourney(button.dataset.journey);
        view.querySelector('#shvVisitRequest').scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.setTimeout(() => view.querySelector('[data-select-journey="' + button.dataset.journey + '"]').focus({ preventScroll: true }), 350);
      }));
      const sourceSelect = view.querySelector('#shvSource');
      const referralField = view.querySelector('#shvReferral');
      const campaignField = form.elements.campaign;
      const persistAttribution = () => {
        try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ source: sourceSelect.value, campaign: cleanTrack(campaignField.value), referralCode: cleanTrack(referralField.value, 40) })); } catch (_) {}
      };
      sourceSelect.addEventListener('change', persistAttribution);
      referralField.addEventListener('change', persistAttribution);
      const openWhatsApp = () => {
        const text = typeInput.value === 'mayra'
          ? 'Namaste Shivaa ✦ I’d like to talk about a Mayra / Bhaat visit at your Jayal showroom.'
          : 'Namaste Shivaa ✦ I’d like to talk about a bridal visit at your Jayal showroom.';
        if (window.Shivaa && window.Shivaa.waOpen) window.Shivaa.waOpen(text);
        else window.open('https://wa.me/918905005921?text=' + encodeURIComponent(text), '_blank', 'noopener');
      };
      view.querySelector('#shvBookingWhatsApp').addEventListener('click', openWhatsApp);
      view.querySelector('#shvEndWhatsApp').addEventListener('click', openWhatsApp);
      view.querySelector('#shvSuccessWhatsApp').addEventListener('click', () => {
        const id = view.querySelector('#shvRequestId').textContent;
        const first = String(form.elements.name.value || '').trim().split(/\s+/)[0];
        const text = `Namaste Shivaa ✦ I just sent visit request ${id} for ${typeInput.value === 'mayra' ? 'Mayra / Bhaat' : 'bridal'} planning. My name is ${first}. Please help me arrange a suitable time.`;
        if (window.Shivaa && window.Shivaa.waOpen) window.Shivaa.waOpen(text);
        else window.open('https://wa.me/918905005921?text=' + encodeURIComponent(text), '_blank', 'noopener');
      });

      form.addEventListener('submit', async event => {
        event.preventDefault();
        const errorEl = view.querySelector('#shvFormError');
        errorEl.hidden = true;
        if (!form.reportValidity()) return;
        const phone = String(form.elements.phone.value || '').replace(/\D/g, '');
        if (!/^[6-9]\d{9}$/.test(phone)) {
          errorEl.textContent = 'Please enter a valid 10-digit Indian mobile number.';
          errorEl.hidden = false; form.elements.phone.focus(); return;
        }
        const interests = Array.from(form.querySelectorAll('input[name="interests"]:checked')).map(input => input.value);
        if (!interests.length) {
          errorEl.textContent = 'Please choose an interest, or select “I’m still exploring”.';
          errorEl.hidden = false; view.querySelector('[data-interest-list]').scrollIntoView({ behavior: 'smooth', block: 'center' }); return;
        }
        if (form.elements.contactConsent.checked !== true || form.elements.privacyConsent.checked !== true) {
          errorEl.textContent = 'Please confirm the appointment-contact consent and read the privacy notice before sending.';
          errorEl.hidden = false; return;
        }
        const payload = {
          type: typeInput.value,
          name: String(form.elements.name.value || '').trim(),
          phone,
          email: String(form.elements.email.value || '').trim(),
          village: String(form.elements.village.value || '').trim(),
          preferredDate: form.elements.preferredDate.value || '',
          timePreference: form.elements.timePreference.value,
          eventTimeline: form.elements.eventTimeline.value,
          partySize: Number(form.elements.partySize.value || 1),
          travelHelp: form.elements.travelHelp.checked,
          interests,
          source: sourceSelect.value,
          campaign: cleanTrack(campaignField.value, 80),
          referralCode: cleanTrack(referralField.value, 40),
          contactConsent: true,
          privacyConsent: true,
          marketingConsent: form.elements.marketingConsent.checked,
          website: String(form.elements.website.value || ''),
        };
        const submit = form.querySelector('.shv-submit');
        const submitText = submit.querySelector('span');
        submit.disabled = true; submitText.textContent = 'Sending your request…';
        try {
          const result = await window.Shivaa.api('/api/services', { method: 'POST', body: JSON.stringify(payload) });
          const requestId = result && result.request && result.request.id ? String(result.request.id) : '';
          if (result && result.preview) view.querySelector('#shvSuccessNote').textContent = 'Sandbox preview only: no personal details were stored or sent to Shivaa staff, and no real appointment was booked or confirmed.';
          form.hidden = true;
          view.querySelector('#shvSuccessName').textContent = (payload.name.split(/\s+/)[0] || 'friend') + '.';
          view.querySelector('#shvRequestId').textContent = requestId || 'Received';
          view.querySelector('#shvBookingSuccess').hidden = false;
          view.querySelector('#shvBookingSuccess').focus({ preventScroll: true });
          view.querySelector('#shvBookingSuccess').scrollIntoView({ behavior: 'smooth', block: 'center' });
          try { sessionStorage.removeItem(SESSION_KEY); } catch (_) {}
        } catch (error) {
          errorEl.textContent = error && error.message ? error.message : 'We could not send the request just now. Please call or message our family instead.';
          errorEl.hidden = false;
          submit.disabled = false; submitText.textContent = 'Request a visit';
          errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    };
  }

  window.__SHIVAA_REGISTER_BRIDAL__ = register;
})();
