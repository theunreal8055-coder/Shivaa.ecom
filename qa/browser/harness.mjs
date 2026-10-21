/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA · browser-behaviour harness (jsdom)
   ───────────────────────────────────────────────────────────────────────
   Boots the real index.html + the real js/ files against the preview shim
   (qa/preview_shim.py, port 8090) which mirrors cms/api.php response shapes.

   jsdom does not implement fetch, matchMedia, IntersectionObserver,
   ResizeObserver, scrollTo, the async clipboard or <canvas> 2D contexts, and
   it reports 'ontouchstart' in window as true. Every one of those is
   polyfilled/removed below so the site's own feature detection sees a normal
   desktop-ish browser. Tests may override any of it after boot().

   opts.noObservers (v223): IntersectionObserver still EXISTS, but the stub
   never fires — it models "nothing has come into view yet", which is how the
   v223 suite proves the films do not fetch their video files at mount.

   Usage:  const { window, doc, errors } = await boot('#/shop');
   ═══════════════════════════════════════════════════════════════════════ */
import { createRequire } from 'node:module';
const require = createRequire('/tmp/');            // jsdom lives outside the repo
const { JSDOM, VirtualConsole } = require('jsdom');

export const BASE = process.env.SHIVAA_BASE || 'http://127.0.0.1:8090';

/* an unhandled rejection inside the page must not kill the test runner */
export const pageFaults = [];
process.on('unhandledRejection', r => pageFaults.push('unhandledRejection: ' + ((r && (r.stack || r.message)) || String(r))));
process.on('uncaughtException', e => pageFaults.push('uncaughtException: ' + ((e && (e.stack || e.message)) || String(e))));
export const wait = ms => new Promise(r => setTimeout(r, ms));

export async function until(fn, timeout = 8000, step = 40) {
  const t0 = Date.now();
  for (;;) {
    let v = null;
    try { v = await fn(); } catch (e) { v = null; }
    if (v) return v;
    if (Date.now() - t0 > timeout) return null;
    await wait(step);
  }
}

export async function boot(hash = '#/', opts = {}) {
  const errors = [];
  /* an uncaught error inside a page handler must be *recorded*, never allowed to
     take the test runner down with it (that is what jsdom does by default). */
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push('jsdomError: ' + ((e.detail && (e.detail.stack || e.detail.message)) || e.message || String(e))));
  vc.on('error', (...a) => errors.push('console.error: ' + a.map(String).join(' ')));
  const dom = await JSDOM.fromURL(BASE + '/' + (hash || ''), {
    virtualConsole: vc,
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    beforeParse(window) {
      /* desktop by default; opts.mobile gives a 390×780 touch viewport so the
         mobile-only branches (bottom sheets, drag-to-dismiss) can be tested */
      const MOBILE = !!opts.mobile;
      if (!MOBILE) { try { delete window.ontouchstart; } catch (e) {} }
      Object.defineProperty(window.navigator, 'maxTouchPoints', { value: MOBILE ? 5 : 0, configurable: true });
      Object.defineProperty(window, 'innerWidth', { value: MOBILE ? 390 : 1280, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: MOBILE ? 780 : 900, configurable: true });

      window.matchMedia = q => {
        const mq = String(q);
        let matches = false;
        const maxW = mq.match(/max-width:\s*(\d+)px/);
        const minW = mq.match(/min-width:\s*(\d+)px/);
        const vw = MOBILE ? 390 : 1280;
        if (maxW) matches = vw <= +maxW[1];
        else if (minW) matches = vw >= +minW[1];
        else if (/hover:\s*none/.test(mq)) matches = MOBILE;
        else if (/pointer:\s*coarse/.test(mq)) matches = MOBILE;
        else if (/hover:\s*hover/.test(mq)) matches = !MOBILE;
        else if (/prefers-reduced-motion:\s*reduce/.test(mq)) matches = !!opts.reduceMotion;
        return { matches, media: mq, onchange: null, addListener() {}, removeListener() {},
                 addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } };
      };

      class IO { constructor(cb) { this.cb = cb; this.els = []; }
        observe(el) { this.els.push(el); if (opts.noObservers) return; setTimeout(() => this.cb([{ isIntersecting: true, target: el, intersectionRatio: 1 }], this), 0); }
        unobserve() {} disconnect() {} takeRecords() { return []; } }
      window.IntersectionObserver = IO;
      class RO { constructor(cb) { this.cb = cb; } observe(el) { setTimeout(() => this.cb([{ target: el, contentRect: { width: 320, height: 420 } }], this), 0); } unobserve() {} disconnect() {} }
      window.ResizeObserver = RO;
      window.scrollTo = () => {};
      /* jsdom has no element scrolling — give the app the real browser API */
      window.Element.prototype.scrollBy = function (x) { this.scrollLeft += (typeof x === 'object' ? x.left : arguments[0]) || 0; };
      window.Element.prototype.scrollTo = function (x) { this.scrollLeft = (typeof x === 'object' ? x.left : arguments[0]) || 0; };
      window.Element.prototype.scrollIntoView = function () {};
      window.print = () => {};
      window.alert = () => {};
      window.confirm = () => true;

      /* fetch → the preview shim, with the same signature the app uses.
         v229 — the bytes are read ONCE, as an ArrayBuffer, and every accessor
         is derived from that single read: a real Response body cannot be
         consumed twice, and a bill is a PNG or a PDF that r.text() would
         mangle. FormData bodies pass straight through (the bill desk uploads
         real multipart). */
      const nf = globalThis.fetch;
      window.fetch = (url, o = {}) => {
        const u = String(url).startsWith('http') ? String(url) : BASE + (String(url).startsWith('/') ? url : '/' + url);
        return nf(u, o).then(async r => {
          const buf = await r.arrayBuffer();
          const bytes = new Uint8Array(buf);
          let body = '';
          try { body = new TextDecoder('utf-8').decode(bytes); } catch (e) { body = ''; }
          let json; let parsed = false;
          const asJson = () => {
            if (!parsed) { parsed = true; try { json = body ? JSON.parse(body) : null; } catch (e) { json = null; } }
            return json;
          };
          return { ok: r.ok, status: r.status, statusText: r.statusText, headers: r.headers,
                   text: async () => body,
                   json: async () => { const j = asJson(); if (j === null) throw new Error('not json: ' + body.slice(0, 120)); return j; },
                   arrayBuffer: async () => buf,
                   blob: async () => new window.Blob([bytes], { type: r.headers.get('content-type') || '' }) };
        });
      };

      /* v229 — jsdom has neither of these, and the bill viewer needs both.
         They are backed by a countable map so a suite can prove the property
         that actually matters: opening a second file revokes the first, so a
         customer flicking through six pages never leaks six blobs. */
      window.__blobStore = new Map();
      let __blobSeq = 0;
      window.URL.createObjectURL = (blob) => {
        const url = 'blob:shivaa/' + (++__blobSeq);
        window.__blobStore.set(url, blob);
        return url;
      };
      window.URL.revokeObjectURL = (url) => { window.__blobStore.delete(String(url)); };

      /* v229 — opts.seed(window) runs before a single byte of app.js executes,
         which is the only moment a suite can put a token in localStorage: the
         app reads shv_token during its own boot and hydrates state.user from
         /api/auth/me, and every JSDOM.fromURL gets a fresh localStorage. */
      if (typeof opts.seed === 'function') {
        try { opts.seed(window); } catch (e) { errors.push('opts.seed threw: ' + (e && e.message)); }
      }

      window.navigator.clipboard = { writeText: async () => {}, readText: async () => '' };
      window.HTMLCanvasElement.prototype.getContext = () => null;   // app.js guards every use
      window.addEventListener('error', e => errors.push('window.onerror: ' + (e.error && e.error.stack || e.message)));
      const ce = window.console.error.bind(window.console);
      window.console.error = (...a) => { errors.push('console.error: ' + a.map(x => (x && x.stack) || String(x)).join(' ')); ce(...a); };
      window.console.warn = () => {};
    },
  });
  const window = dom.window;
  window.__MOBILE__ = !!opts.mobile;
  await until(() => window.Shivaa && window.Shivaa.state && window.document.getElementById('view'), 15000);
  await until(() => (window.Shivaa.state.productsCache || []).length > 0, 20000);
  await wait(600);
  return { dom, window, doc: window.document, errors };
}

/* click an element the way a finger/mouse would, through jsdom's event path */
export function click(window, el) {
  if (!el) return false;
  el.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, cancelable: true }));
  el.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  el.dispatchEvent(new window.MouseEvent('mouseup', { bubbles: true, cancelable: true }));
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  return true;
}
export function type(window, el, value) {
  if (!el) return;
  el.value = String(value);
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
  el.dispatchEvent(new window.Event('change', { bubbles: true }));
}
export function key(window, el, k) {
  el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
}
export const touch = (window, el, type, y) => {
  const t = { clientX: 100, clientY: y, target: el };
  const ev = new window.Event(type, { bubbles: true, cancelable: true });
  ev.touches = type === 'touchend' ? [] : [t];
  ev.changedTouches = [t];
  el.dispatchEvent(ev);
};
