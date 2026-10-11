/* WCAG 2.x contrast ratio for the palette pairs used by the buttons and text */
const lum = hex => { const c = hex.replace('#', '').match(/../g).map(h => parseInt(h, 16) / 255)
  .map(v => (v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4)));
  return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
const pairs = [
  ['btn-gold text #fff8ea on gold #b98a2f', '#fff8ea', '#b98a2f'],
  ['btn-gold text #fff8ea on dark gold #9c7222', '#fff8ea', '#9c7222'],
  ['btn-gold text #2b1a05 on gold #b98a2f', '#2b1a05', '#b98a2f'],
  ['btn-gold text #2b1a05 on light gold #d4af5a', '#2b1a05', '#d4af5a'],
  ['btn-primary text #f9ecd2 on maroon #6e1e2a', '#f9ecd2', '#6e1e2a'],
  ['btn-outline maroon #6e1e2a on cream #faf6ef', '#6e1e2a', '#faf6ef'],
  ['btn-ghost ink-2 #5d5245 on white #fffdf9', '#5d5245', '#fffdf9'],
  ['body ink #2b2118 on cream #faf6ef', '#2b2118', '#faf6ef'],
  ['ink-3 #6f6353 on cream #faf6ef', '#6f6353', '#faf6ef'],
  ['gold text #b98a2f on cream #faf6ef (eyebrows)', '#b98a2f', '#faf6ef'],
  ['gold-2 text #d4af5a on cream #faf6ef', '#d4af5a', '#faf6ef'],
  ['gold text #9c7222 on cream #faf6ef', '#9c7222', '#faf6ef'],
  ['gold-2 #d4af5a on maroon #6e1e2a', '#d4af5a', '#6e1e2a'],
];
if (require.main === module) for (const [n, a, b] of pairs) { const r = ratio(a, b); console.log((r >= 4.5 ? 'PASS' : 'FAIL') + ' ' + r.toFixed(2).padStart(5) + '  ' + n); }
module.exports = { ratio, lum };
