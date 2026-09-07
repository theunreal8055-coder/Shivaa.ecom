/* HALLMARK / HUID PAGE — v43 redesign
   Animated, trust-forward page that:
   - States clearly: EVERY Shivaa piece is BIS-hallmarked with a unique HUID
   - Explains the triple-check process
   - Sends users to the OFFICIAL BIS Care app to verify (no fake on-site verification)
*/
'use strict';
(function () {
  const { state, esc } = window.Shivaa;
  const BIS_CARE = 'https://www.bis.gov.in/bis-apps/?lang=en';
  const BIS_ANDROID = 'https://play.google.com/store/apps/details?id=com.bis.bisapp';
  const BIS_IOS = 'https://apps.apple.com/in/app/bis-care-app/id6443724891';
  const BIS_GUIDANCE = 'https://www.bis.gov.in/hallmarking-overview/hallmarking-faqs/hallmarking-faq/?lang=en';
  const external = 'target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer"';

  function productPanel(product) {
    // Simple informational card (no on-site "verification")
    return `<section class="hm2-product" aria-label="Your piece">
      <div class="hm2-p-head">
        <img src="${product.images && product.images[0]}" alt="${esc(product.name)}">
        <div>
          <span class="hm2-p-kicker">${esc((product.category||'').replace(/-/g,' '))} · ${esc(product.purity||'')} · ${esc(product.metal||'Gold')}</span>
          <h3>${esc(product.name)}</h3>
          <div class="hm2-p-huid-row"><span class="huid-stamp">HUID</span><span class="huid-code">on your piece</span></div>
        </div>
      </div>
      <p>Every Shivaa piece leaves our Jayal workshop with a <b>unique 6-character HUID</b> stamped into it. Flip your jewellery over — you'll see it alongside the BIS logo and the purity mark. Type that exact code into the official BIS Care app to see the government record.</p>
      <p class="hm2-note">We cannot and do not "verify" a HUID on our website — only the BIS Care app holds the government assay record.</p>
    </section>`;
  }

  async function renderPage(view, query) {
    const productId = query.get('product');
    let productHtml = '';
    if (productId && state.productsCache) {
      const p = state.productsCache.find(x => String(x.id) === String(productId));
      if (p) productHtml = productPanel(p);
    }

    view.innerHTML = `
    <section class="hm2-hero">
      <div class="hm2-hero-bg" aria-hidden="true">
        <div class="hm2-orb o1"></div><div class="hm2-orb o2"></div><div class="hm2-orb o3"></div>
        <div class="hm2-sparkle"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
      </div>
      <div class="container">
        <div class="crumbs" style="color:rgba(253,243,221,.75)"><a href="#/" style="color:#f3dfae">Home</a> / Hallmark &amp; HUID Guide</div>
        <div class="hm2-hero-kicker"><span class="k-dot"></span> BIS HALLMARKED · ASSAYED · VERIFIED <span class="k-dot"></span></div>
        <h1>Every Shivaa piece carries a <em class="shimmer">HUID.</em></h1>
        <p class="hm2-hero-sub">No exceptions, no excuses. Before a single ring, necklace or bangle leaves our Jayal workshop, it is independently tested at a BIS-approved assaying centre and stamped with a unique 6-character Hallmark Unique Identification number — the only guarantee of gold purity recognised by the Government of India.</p>
        <div class="hm2-hero-badges">
          <div class="h2-badge"><b>BIS</b><span>Certified Jeweller</span></div>
          <div class="h2-badge"><b>100%</b><span>of pieces HUID-stamped</span></div>
          <div class="h2-badge"><b>0</b><span>in-house "self tests"</span></div>
          <div class="h2-badge"><b>3rd</b><span>party assay only</span></div>
        </div>
      </div>
    </section>

    <div class="container hm2-wrap">

      ${productHtml}

      <!-- TRIPLE CHECK PROMISE -->
      <section class="hm2-promise rv">
        <div class="hm2-sec-head">
          <span class="label">The Shivaa triple-check</span>
          <h2>How we make sure your jewellery is <em>exactly</em> what it says it is.</h2>
        </div>
        <div class="hm2-steps">
          <div class="hm2-step s1">
            <div class="hm2-step-num">01</div>
            <div class="hm2-step-badge"><span>IN-HOUSE</span></div>
            <h3>Karigar's first weigh-in</h3>
            <p>Before a piece leaves our workshop, our senior karigar weighs it to the milligram, checks solder purity and visually inspects every stone and joint against the design specification.</p>
          </div>
          <div class="hm2-step s2">
            <div class="hm2-step-num">02</div>
            <div class="hm2-step-badge alt"><span>BIS ASSAY</span></div>
            <h3>Independent BIS testing</h3>
            <p>Every single piece is sent to a Government-recognised BIS assaying &amp; hallmarking centre. They X-ray test (XRF) the metal, confirm the purity matches the stamp (22K = 91.67%, 18K = 75.0%, Silver 925 = 92.5%), and only then issue a unique 6-character HUID.</p>
          </div>
          <div class="hm2-step s3">
            <div class="hm2-step-num">03</div>
            <div class="hm2-step-badge gold"><span>DELIVERY</span></div>
            <h3>Final check before dispatch</h3>
            <p>Back from assay, we match the HUID against our internal log, re-weigh the piece, photograph it, and only then pack it into your Shivaa box — tamper-sealed, insured, with the invoice listing the exact HUID for your records.</p>
          </div>
        </div>
      </section>

      <!-- WHAT TO LOOK FOR ON YOUR PIECE -->
      <section class="hm2-lookfor rv">
        <div class="hm2-sec-head center">
          <span class="label">On the actual piece</span>
          <h2>Four marks on <em>every</em> Shivaa jewel.</h2>
          <p>Flip your jewellery over. On the reverse you'll find these four stamps — together they are your legal guarantee.</p>
        </div>
        <div class="hm2-marks">
          <div class="hm2-mark">
            <div class="hm2-mark-logo bis">
              <svg viewBox="0 0 60 60" width="60" height="60"><circle cx="30" cy="30" r="26" fill="none" stroke="currentColor" stroke-width="2.2"/><text x="30" y="37" text-anchor="middle" font-size="15" font-weight="700" fill="currentColor">BIS</text></svg>
            </div>
            <b>BIS logo</b>
            <small>The official Bureau of Indian Standards mark — confirms the piece went through a licensed hallmarking centre.</small>
          </div>
          <div class="hm2-mark">
            <div class="hm2-mark-logo purity">
              <span>916</span>
            </div>
            <b>Purity grade</b>
            <small>22K = 916 (91.6% pure), 18K = 750, Silver 925 = 925. No "22K" claims without the number.</small>
          </div>
          <div class="hm2-mark">
            <div class="hm2-mark-logo huid">
              <span>ABC<br>123</span>
            </div>
            <b>6-character HUID</b>
            <small>The unique code — three letters + three digits or letters — laser-stamped on your piece. <b>This is the code you verify.</b></small>
          </div>
          <div class="hm2-mark">
            <div class="hm2-mark-logo shivaa">
              <span>शि</span>
            </div>
            <b>Our jeweller mark</b>
            <small>Shivaa's registered jeweller logo — tells you which licence-holder made the piece (so BIS can trace it back to us).</small>
          </div>
        </div>
      </section>

      <!-- CTA TO BIS CARE APP -->
      <section class="hm2-cta rv">
        <div class="hm2-cta-card">
          <div class="hm2-cta-glow"></div>
          <div class="hm2-cta-left">
            <span class="label" style="color:#f3dfae;border-color:rgba(212,175,90,.4);background:rgba(185,138,47,.1)">Verify officially</span>
            <h2>Finish your check in <em class="shimmer">BIS Care.</em></h2>
            <p>The Government of India runs the only real HUID verification tool — the free <b>BIS Care</b> app. Enter the 6-character HUID stamped on your physical piece and it returns the official assay record, including the jeweller's name, purity, and the date of hallmarking.</p>
            <p class="hm2-cta-note"><b>Shivaa does not run a private BIS lookup.</b> If any website claims to "verify" your HUID outside the BIS Care app, close it — only the BIS server holds the real record.</p>
            <div class="hm2-cta-btns">
              <a class="btn btn-gold btn-lg" href="${BIS_CARE}" ${external}>Open BIS Care ↗</a>
              <a class="btn btn-light" href="${BIS_ANDROID}" ${external}>Android app ↗</a>
              <a class="btn btn-light" href="${BIS_IOS}" ${external}>iPhone app ↗</a>
            </div>
            <p class="hm2-cta-steps">
              <b>How to use BIS Care:</b>
              <span>1. Download the app &nbsp;·&nbsp; 2. Tap "Verify HUID" &nbsp;·&nbsp; 3. Type the 6 characters &nbsp;·&nbsp; 4. Match the returned jeweller name, purity and date to your piece</span>
            </p>
          </div>
          <div class="hm2-cta-right" aria-hidden="true">
            <div class="hm2-phone">
              <div class="hm2-phone-top"></div>
              <div class="hm2-phone-screen">
                <div class="bis-app-head">
                  <div class="bis-app-logo">BIS</div>
                  <div>
                    <b>Care</b>
                    <small>Bureau of Indian Standards</small>
                  </div>
                </div>
                <div class="bis-app-row"><span>Verify HUID</span><span class="bis-arrow">→</span></div>
                <div class="bis-app-input">● ● ● ● ● ●</div>
                <div class="bis-app-result">
                  <div class="bis-check">✓</div>
                  <b>Verified</b>
                  <small>Purity: 22K 916<br>Jeweller: Shivaa<br>Assay: Jaipur Centre</small>
                </div>
              </div>
              <div class="hm2-phone-bot"></div>
            </div>
          </div>
        </div>
      </section>

      <!-- FAQ -->
      <section class="hm2-faq rv">
        <div class="hm2-sec-head center">
          <span class="label">Questions, answered</span>
          <h2>Before you call us.</h2>
        </div>
        <div class="hm2-faq-list">
          <details open><summary>Does every Shivaa piece have a HUID?</summary><div class="hm2-faq-body">Yes. Since 1st July 2021, BIS hallmarking is mandatory for gold jewellery sold in India across the notified districts (which includes Nagaur and Jaipur where we operate). We have never sold a non-hallmarked piece in our history — even before it was legally required, our family's reputation rested on verified purity.</div></details>
          <details><summary>Can I verify my HUID on your website?</summary><div class="hm2-faq-body">No — and you should be suspicious of any jeweller that offers to "verify" your HUID on their own site. The only official record lives on BIS's own servers, accessible only through the BIS Care app and the BIS website. We link you directly there.</div></details>
          <details><summary>What if the BIS Care app says "No record found"?</summary><div class="hm2-faq-body">First, double-check the six characters — HUIDs do not contain O/I/Z to avoid confusion with 0/1/2, but it's still easy to misread a stamp. If you still don't see a result, please WhatsApp us a clear photo of the piece and the stamp immediately. We will track it through our assay centre. Until resolved, do not accept delivery.</div></details>
          <details><summary>What if the details in BIS Care don't match my piece?</summary><div class="hm2-faq-body">Stop. Do not accept the piece. Contact us on WhatsApp right away with a photo of the stamp and the BIS Care screenshot — this should never happen, and we will resolve it with the assay centre within 24 hours, including a full refund if needed.</div></details>
          <details><summary>Do silver pieces get HUID-stamped too?</summary><div class="hm2-faq-body">Yes — silver jewellery of the notified categories and purity grades (notably 925 sterling) carries a BIS hallmark and HUID, following the same process as gold.</div></details>
          <details><summary>Where can I read more about the BIS scheme?</summary><div class="hm2-faq-body">See the <a href="${BIS_GUIDANCE}" ${external}>official BIS hallmarking FAQs ↗</a>.</div></details>
        </div>
        <p class="hm2-source">Links open the official Bureau of Indian Standards website/app. Shivaa is a BIS-licensed jeweller; our registration details and licence number are available on request and on every invoice.</p>
      </section>

      <!-- Contact -->
      <section class="hm2-contact rv">
        <h3>Questions about your HUID?</h3>
        <p>Our hallmarking desk is on WhatsApp 7 days a week. Send a photo of the stamp and we'll walk you through the verification.</p>
        <a class="btn btn-gold btn-lg" id="hm2Wa" href="#">${WA_SVG}<span>Message our hallmarking desk</span></a>
      </section>
    </div>
    `;

    // WhatsApp button
    const waBtn = view.querySelector('#hm2Wa');
    if (waBtn) {
      waBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const msg = `Namaste Shivaa ✦\n\nI have a question about a HUID / hallmark on my Shivaa piece.\n\n${productId ? `Product: ${productId}\n` : ''}Please help me verify it.`;
        if (window.waOpen) waOpen(msg);
      });
    }

    // Reveal on scroll
    requestAnimationFrame(() => {
      const obs = new IntersectionObserver((es) => {
        es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } });
      }, { threshold: 0.14 });
      view.querySelectorAll('.rv').forEach(el => obs.observe(el));
    });
  }

  window.ShivaaHallmark = { productPanel };
  // Register hallmark route. hallmark.js loads BEFORE app.js creates const routes={},
  // so we stash it on window.Shivaa._extRoutes and app.js merges it in when ready.
  window.Shivaa = window.Shivaa || {};
  window.Shivaa._extRoutes = window.Shivaa._extRoutes || {};
  window.Shivaa._extRoutes.hallmark = renderPage;
  // Also bind as soon as window.Shivaa.routes exists (covers all timings):
  const bind = () => { if (window.Shivaa && window.Shivaa.routes) window.Shivaa.routes.hallmark = renderPage; };
  bind();
  document.addEventListener('DOMContentLoaded', bind, { once: true });
  addEventListener('load', bind, { once: true });
})();
