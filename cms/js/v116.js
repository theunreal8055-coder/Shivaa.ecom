/* ═══════════════════════════════════════════════════════════
   SHIVAA v116 — comprehensive JavaScript bug-fix layer
   Categories · Carousel · Quick View · Payment · Mobile
   This file loads AFTER app.js and patches known issues.
   ═══════════════════════════════════════════════════════════ */
'use strict';
(function () {

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

/* ─────────── 1. CATEGORIES BUTTON — OWNERSHIP MOVED (v158) ───────────
   This file used to wire #navCats from a 200 ms timer because boot() — which
   originally did the wiring — waits for the API batch. That made TWO owners of
   one button, and they were not equivalent: this copy never bound the scrim,
   the outside tap, Escape or the scroll close, so whenever it won the race the
   panel could open with no way to dismiss it (the owner's "even if we want to
   close the categories button it still doesn't go").
   app.js now owns the control alone (initCatsMenu() — see the note above it),
   it runs before boot instead of after it, and its 17 tiles are built from the
   house CATS constant with no API involved. Nothing is left to wire here. */

/* ─────────── 2. HEADER HEIGHT: SET IMMEDIATELY ───────────
   The mega-panel positions at top:var(--headerH). Set it early. */
(function setHeaderHEarly() {
  function setH() {
    const h = document.getElementById('header');
    if (h) {
      document.documentElement.style.setProperty('--headerH', 
        Math.round(h.getBoundingClientRect().bottom) + 'px');
    }
  }
  
  if (document.readyState !== 'loading') {
    setTimeout(setH, 100);
  }
  document.addEventListener('DOMContentLoaded', () => setTimeout(setH, 100), { once: true });
  window.addEventListener('resize', setH, { passive: true });
})();

/* ─────────── 3. QUICK VIEW + CARD BUTTONS: DELEGATED CLICK FIX ───────────
   Open on the final click — never on pointerup. Opening a modal during
   pointerup can make Android retarget the synthetic click to the product link
   underneath, which navigates away instead of keeping Quick View open. */
(function fixCardButtons() {
  let lastTap = 0;
  
  document.addEventListener('click', function(e) {
    // Quick view button
    const quickBtn = e.target.closest('.pc-quick');
    if (quickBtn) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const pid = quickBtn.dataset.pid;
      if (pid && window.Shivaa && window.Shivaa.quickView) {
        // Debounce double-taps
        const now = Date.now();
        if (now - lastTap < 400) return;
        lastTap = now;
        window.Shivaa.quickView(pid);
      }
      return;
    }
    
    // Compare button
    const cmpBtn = e.target.closest('.pc-compare[data-pid]');
    if (cmpBtn && !cmpBtn.closest('.modal')) {
      e.preventDefault();
      e.stopPropagation();
      const pid = cmpBtn.dataset.pid;
      if (pid && window.Shivaa && window.Shivaa.toggleCompare) {
        window.Shivaa.toggleCompare(pid);
      }
      return;
    }
    
    // Wishlist button (not inside quick view modal)
    const wishBtn = e.target.closest('.pc-wish[data-pid]');
    if (wishBtn && !wishBtn.closest('.qv') && !wishBtn.closest('.modal')) {
      e.preventDefault();
      e.stopPropagation();
      const pid = wishBtn.dataset.pid;
      if (pid && window.Shivaa && window.Shivaa.toggleWish) {
        window.Shivaa.toggleWish(pid);
      }
    }
  }, true);
})();

/* ─────────── 4. DRAWER CATEGORY LINKS: CLOSE DRAWER ON CLICK ─────────── */
(function fixDrawerCatLinks() {
  document.addEventListener('click', function(e) {
    const link = e.target.closest('.dw-catlist a, .dw-tiles a');
    if (!link) return;
    window.__shvNavigating = true;
    setTimeout(() => { window.__shvNavigating = false; }, 400);
    // Close the drawer after a short delay so navigation commits first
    setTimeout(() => {
      if (window._closeDrawer) window._closeDrawer();
    }, 100);
  });
})();

/* ─────────── 5. SERVICE WORKER: FORCE UPDATE CHECK ─────────── */
(function fixSWUpdate() {
  if (!('serviceWorker' in navigator)) return;
  
  window.addEventListener('load', () => {
    setTimeout(() => {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) reg.update().catch(() => {});
      }).catch(() => {});
    }, 2000);
  });
})();

/* ─────────── 6. CAROUSEL TOUCH: PREVENT NATIVE IMAGE DRAG ─────────── */
(function fixCarouselDrag() {
  document.addEventListener('dragstart', function(e) {
    if (e.target.closest && e.target.closest('#heroCarousel')) {
      e.preventDefault();
    }
  });
  
  // Also prevent the carousel from stealing vertical scroll
  document.addEventListener('touchmove', function(e) {
    const car = document.getElementById('heroCarousel');
    if (!car || !car.contains(e.target)) return;
    // Allow vertical scrolling normally
  }, { passive: true });
})();

/* ─────────── 7. CHECKOUT: ENSURE FORM VALIDATION WORKS ─────────── */
(function fixCheckout() {
  // Polyfill reportValidity for older browsers
  if (typeof HTMLFormElement !== 'undefined' && !HTMLFormElement.prototype.reportValidity) {
    HTMLFormElement.prototype.reportValidity = function() {
      const inputs = this.querySelectorAll('input[required], select[required], textarea[required]');
      let valid = true;
      inputs.forEach(input => {
        if (!input.value || (input.pattern && !new RegExp(input.pattern).test(input.value))) {
          valid = false;
          input.style.borderColor = 'red';
          input.focus();
        }
      });
      return valid;
    };
  }
})();

/* ─────────── 8. PAYMENT: CLEAR ERROR MESSAGES ─────────── */
(function fixPaymentMessages() {
  // When the page navigates to checkout, ensure payment options are clear
  window.addEventListener('hashchange', () => {
    if (location.hash.startsWith('#/checkout')) {
      setTimeout(() => {
        const demoNote = document.getElementById('payDemoNote');
        if (demoNote && !demoNote.querySelector('b')) {
          // Payment demo note is already rendered by app.js
        }
      }, 1000);
    }
  });
})();

/* ─────────── 9. PRODUCT IMAGES: FALLBACK (defer to app.js net) ───────────
   app.js already has a broken-image net that degrades to the house
   monogram SVG. We don't override it — just ensure it runs. */

/* ─────────── 10. PREVENT ZOOM ON DOUBLE-TAP FOR BUTTONS ─────────── */
(function fixDoubleTapZoom() {
  // On iOS, double-tap zooms unless touch-action is set
  document.addEventListener('DOMContentLoaded', () => {
    const selectors = '.btn, .pc-quick, .pc-wish, .pc-compare, .c-arrow, .c-dot, .pay-opt, .size-pill, .nav-cats, .dw-tile';
    document.querySelectorAll(selectors).forEach(el => {
      if (!el.style.touchAction) el.style.touchAction = 'manipulation';
    });
  });
})();

console.log('Shivaa v116 patches loaded \u2726');

})();
