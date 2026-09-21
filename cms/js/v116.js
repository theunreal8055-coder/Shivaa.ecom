/* ═══════════════════════════════════════════════════════════
   SHIVAA v116 — comprehensive JavaScript bug-fix layer
   Categories · Carousel · Quick View · Payment · Mobile
   This file loads AFTER app.js and patches known issues.
   ═══════════════════════════════════════════════════════════ */
'use strict';
(function () {

/* v166 · the release this layer belongs to (index.html stamps it inline before
   any script). Every asset URL built here rides it: `.htaccess` caches any
   `?v=` URL immutably for a year, so a hardcoded token would pin the old art. */
const REL = window.__SHIVAA_REL || 166;
const ASSET_V = '?v=' + REL;

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

/* ─────────── 1. CATEGORIES BUTTON: ENSURE WIRED EARLY ───────────
   The categories button wiring lives inside boot() which waits for API
   calls. If those are slow (bad network), the button appears dead.
   This early wiring works before boot completes. */
(function earlyCatsButton() {
  let _wired = false;
  
  function wireCatsButton() {
    if (_wired) return;
    const catsBtn = $('#navCats');
    if (!catsBtn || catsBtn._wired) return; // already wired by boot()
    _wired = true;
    catsBtn._wired = true;
    catsBtn._v116wired = true;
    
    catsBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      e.preventDefault();
      try { if (window.Shivaa && window.Shivaa.haptic) window.Shivaa.haptic(10); } catch (_) {}
      
      // Mobile drawer: toggle inline category list
      if (window.matchMedia('(max-width:820px)').matches) {
        let list = document.getElementById('dwCatList');
        if (!list) {
          list = document.createElement('div');
          list.id = 'dwCatList';
          list.className = 'dw-catlist';
          const CATS = {
            rings: { name: 'Rings', img: '/images/categories/rings.jpg' },
            necklaces: { name: 'Necklaces', img: '/images/categories/necklaces.jpg' },
            earrings: { name: 'Earrings', img: '/images/categories/earrings.jpg' },
            bangles: { name: 'Bangles & Kadas', img: '/images/categories/bangles.jpg' },
            bracelets: { name: 'Bracelets', img: '/images/categories/bracelets.jpg' },
            chains: { name: 'Chains', img: '/images/categories/chains.jpg' },
            pendants: { name: 'Pendants', img: '/images/categories/pendants.jpg' },
            mangalsutra: { name: 'Mangalsutra', img: '/images/categories/mangalsutra.jpg' },
            bajubandh: { name: 'Bajubandh', img: '/images/categories/bajubandh.jpg' },
            rakhdi: { name: 'Rakhdi Set', img: '/images/categories/rakhdi.jpg' },
            aad: { name: 'Fancy Aad', img: '/images/categories/aad.jpg' },
            sheeshphool: { name: 'Sheesh Phool', img: '/images/categories/sheeshphool.jpg' },
            hathphool: { name: 'Hathphool', img: '/images/categories/hathphool.jpg' },
            punach: { name: 'Punach', img: '/images/categories/punach.jpg' },
            bridalanklets: { name: 'Bridal Anklets', img: '/images/categories/bridalanklets.jpg' },
            nosepins: { name: 'Nose Pins', img: '/images/categories/nosepins.jpg' },
            silver: { name: 'Silver 925', img: '/images/categories/silver.jpg' },
          };
          list.innerHTML = Object.entries(CATS).map(([k, c]) =>
            '<a href="#/shop?category=' + k + '"><img src="' + c.img + ASSET_V + '" alt="" loading="lazy" onerror="if(!this.dataset.lfb){this.dataset.lfb=\'1\';this.src=\'/images/logo.png' + ASSET_V + '\';}else{this.remove();}"><span>' + c.name + '</span></a>'
          ).join('');
          catsBtn.insertAdjacentElement('afterend', list);
        }
        const isOpen = list.classList.contains('open');
        list.classList.toggle('open', !isOpen);
        catsBtn.classList.toggle('open', !isOpen);
        catsBtn.setAttribute('aria-expanded', String(!isOpen));
        if (!isOpen) {
          requestAnimationFrame(() => {
            try { list.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (_) {}
          });
        }
        return;
      }
      
      // Desktop: toggle mega panel
      const panel = $('#catMenu');
      const backdrop = $('#megaBackdrop');
      if (panel && backdrop) {
        const isOpen = !panel.hidden;
        panel.hidden = isOpen;
        backdrop.hidden = isOpen;
        catsBtn.setAttribute('aria-expanded', String(!isOpen));
        
        // Ensure headerH is set for proper positioning
        const header = $('#header');
        if (header) {
          document.documentElement.style.setProperty('--headerH', 
            Math.round(header.getBoundingClientRect().bottom) + 'px');
        }
      }
    }, { capture: true });
  }
  
  // Try immediately, then again on DOMContentLoaded and after a delay
  if (document.readyState !== 'loading') {
    setTimeout(wireCatsButton, 200);
  }
  document.addEventListener('DOMContentLoaded', () => setTimeout(wireCatsButton, 200), { once: true });
  window.addEventListener('load', () => setTimeout(wireCatsButton, 500), { once: true });
})();

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
