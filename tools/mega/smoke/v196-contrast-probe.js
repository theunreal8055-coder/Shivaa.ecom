/* probe: resolved colours of the real button classes under the real stylesheet stack */
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const CMS = path.join(__dirname, '..', '..', '..', 'cms');
const html = fs.readFileSync(path.join(CMS, 'index.html'), 'utf8');
const links = [...html.matchAll(/<link rel="stylesheet" href="\/css\/([^"?]+)/g)].map(m => m[1]);
const css = links.map(f => fs.existsSync(path.join(CMS, 'css', f)) ? fs.readFileSync(path.join(CMS, 'css', f), 'utf8') : '').join('\n');
const dom = new JSDOM(`<!doctype html><html><head><style>${css}</style></head><body class="">
<div id="t"></div></body></html>`);
const d = dom.window.document;
const classes = ['btn btn-primary', 'btn btn-gold', 'btn btn-outline', 'btn btn-ghost', 'btn btn-light', 'btn'];
for (const c of classes) { const b = d.createElement('button'); b.className = c; b.textContent = 'x'; d.getElementById('t').appendChild(b); }
const gs = el => dom.window.getComputedStyle(el);
for (const b of d.querySelectorAll('button')) {
  const s = gs(b);
  console.log(JSON.stringify(b.className).padEnd(22), 'color=', s.color, ' bg=', s.backgroundColor, ' bgImg=', (s.backgroundImage || '').slice(0, 60));
}
console.log('links:', links.length, 'css chars:', css.length);
