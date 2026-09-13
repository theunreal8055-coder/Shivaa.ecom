import { boot, wait } from './harness.mjs';
const { window, doc, errors } = await boot('#/invoice/TST107');
await wait(900);
const bad = errors.filter(e => !/ResizeObserver|Not implemented: navigation|Could not parse CSS/i.test(e));
console.log('order page errors:', bad.length ? bad[0].slice(0, 200) : 'none');
console.log('invoice timeline:', !!doc.querySelector('.v107-tl'));
console.log('gst block:', !!doc.getElementById('v107gst'));
window.close(); process.exit(bad.length ? 1 : 0);
