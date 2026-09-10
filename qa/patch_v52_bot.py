# -*- coding: utf-8 -*-
"""v52 Saathi patch: Hindi/Hinglish engine, voice input, test hooks."""
p = 'cms/js/bot.js'
s = open(p, encoding='utf-8').read()
o = s

def rep(old, new, label):
    global s
    c = s.count(old)
    assert c == 1, f'{label}: count={c}'
    s = s.replace(old, new, 1)
    print('ok:', label)

rep("""  /* ── state ── */""",
"""  /* ── v52: Hindi/Hinglish engine ── */
  const HI_WORD = { 'अंगूठी': 'ring', 'झुमका': 'jhumka', 'झुमकी': 'jhumka', 'हार': 'necklace', 'कंगन': 'bangle', 'चूड़ी': 'bangle', 'मंगलसूत्र': 'mangalsutra', 'बाली': 'earring', 'चेन': 'chain', 'सोना': 'gold', 'चांदी': 'silver', 'लॉकेट': 'pendant', 'नेकलेस': 'necklace', 'रिंग': 'ring' };
  const isHi = (t) => /[\\u0900-\\u097F]/.test(t) || /\\b(kitna|kitni|kya|kaisa|kaisi|dikhao|dikhaiye|sasta|sasti|mehnga|mehngi|chahiye|batao|bataiye|kaise|kab|kahan|mujhe|mera|meri|bhai|dooj|shaadi|tohfa|karo|hain|hai)\\b/.test(t);
  const FACTS_HI = {
    ship: 'हर ऑर्डर <b class="g">टैंपर-सील और पूरी तरह बीमित</b> होकर भेजा जाता है, पूरे भारत में — 48 घंटे में डिस्पैच।',
    ret: '<b class="g">7 दिन में आसान रिटर्न</b>, कोई सवाल नहीं — साथ में <b class="g">लाइफटाइम एक्सचेंज</b> लाइव रेट पर।',
    hallmark: 'हर पीस <b class="g">BIS हॉलमार्क</b> है। HUID खुद जाँचिए — BIS Care ऐप में; गाइड मेन्यू के “Hallmark” सेक्शन में है।',
    emi: '<b class="g">3 महीने नो-कॉस्ट EMI</b>, 6 महीने स्टैंडर्ड EMI — कार्ड और UPI ऑटोपे पर; मंथली आंकड़ा हर प्रोडक्ट पेज पर।',
    gst: 'बिल में <b class="g">3% GST</b> के साथ पूरा वज़न + मेकिंग चार्ज का ब्रेकअप — ऑर्डर करने से पहले दिखता है।',
    buyback: 'बायबैक और एक्सचेंज <b class="g">लाइव रेट</b> पर — वज़न और असे के हिसाब से, जयल काउंटर पर।',
    finale: 'हमारा <b class="g">भाई दूज गोल्ड फिनाले</b>: एक ग्राहक जीतेगा <b class="g">10 ग्राम सर्टिफाइड 24K सोना</b> — CA की मौजूदगी में लाइव ड्रॉ, <b class="g">भाई दूज, 11 नवंबर 2026</b> को। तीन बराबर-मौके वाले रास्ते — 3 ग्राम+ सोने की खरीद, 100 ग्राम चांदी का ऑर्डर, या फ्री क्विज़। एक व्यक्ति = एक एंट्री; खरीदारी से मौके कभी नहीं बढ़ते।',
    catalog: 'हमारा पूरा <b class="g">4,00,000+ डिज़ाइन</b> का कैटलॉग अभी फोटोग्राफ हो रहा है। आज 65 सिग्नेचर रिंग्स ऑर्डर हो सकते हैं — और मैं ढूँढने/चुनने में मदद कर सकती हूँ।',
  };
  const F = (k) => (ctx.lang === 'hi' && FACTS_HI[k]) ? FACTS_HI[k] : FACTS[k];
  const L = (en, hi) => (ctx.lang === 'hi' ? hi : en);

  /* ── state ── */""", 'Hindi engine + FACTS_HI')

rep("const ctx = { cat: null, budget: null, occ: null, last: [] };",
    "const ctx = { cat: null, budget: null, occ: null, last: [], lang: 'en' };", 'ctx.lang')

rep("""'<div class="sa-in"><input id="saathiIn\"""",
    """'<div class="sa-in"><button id="saathiMic" title="Speak" aria-label="Speak to Saathi">🎤</button><input id="saathiIn\"""", 'mic button')

rep("""    $('#saathiIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });""",
"""    $('#saathiIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
    bindMic();""", 'bindMic call')

rep("  function tickRates() {",
"""  /* v52: free on-device voice input — nothing is recorded server-side */
  function bindMic() {
    const mic = $('#saathiMic'); if (!mic) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { mic.style.display = 'none'; return; }
    mic.onclick = () => {
      if (mic.dataset.on) return;
      const r = new SR();
      r.lang = ctx.lang === 'hi' ? 'hi-IN' : 'en-IN';
      r.interimResults = false; r.maxAlternatives = 1;
      mic.dataset.on = '1'; mic.classList.add('live');
      push('bot', L('Listening… go ahead 🎤', 'बोलिए… मैं सुन रही हूँ 🎤'), null, false);
      r.onresult = (e) => { const txt = e.results[0][0].transcript; $('#saathiIn').value = ''; userSay(txt); };
      r.onerror = () => push('bot', L('The mic did not work on this device — typing works as always 🙏', 'माइक नहीं चला — टाइप कर दीजिए 🙏'), null, false);
      r.onend = () => { delete mic.dataset.on; mic.classList.remove('live'); };
      try { r.start(); } catch (e) { delete mic.dataset.on; mic.classList.remove('live'); }
    };
  }
  function tickRates() {""", 'bindMic fn')

rep("""    const t = raw.toLowerCase().replace(/\\s+/g, ' ').trim();
    await boot();""",
"""    let t = raw.toLowerCase().replace(/\\s+/g, ' ').trim();
    t = t.replace(/[\\u0966-\\u096F]/g, (d) => String('०१२३४५६७८९'.indexOf(d)));   // Devanagari digits → ASCII
    ctx.lang = isHi(t) ? 'hi' : 'en';
    for (const [hi, en] of Object.entries(HI_WORD)) if (t.includes(hi)) t += ' ' + en;
    await boot();""", 'language detect in respond')

rep("    if (/(bhai ?dooj|bhaiya ?dooj|scheme|offer|contest|draw|finale|quiz|win)/.test(t)) { push('bot', FACTS.finale);",
    "    if (/(bhai ?dooj|bhaiya ?dooj|scheme|offer|contest|draw|finale|quiz|win)/.test(t)) { push('bot', F('finale'));", 'finale answer bilingual')

rep("      if (rx.test(t)) { push('bot', FACTS[key] + feedback());",
    "      if (rx.test(t)) { push('bot', F(key) + feedback());", 'policies bilingual')

rep("""    push('bot', 'I’d rather get it right than guess. Try <b class="g">“jhumka under 50k”</b>, <b class="g">“cheaper”</b>, <b class="g">“choose for me”</b> — or I’ll hand you to a human.');""",
"""    push('bot', L('I’d rather get it right than guess. Try <b class="g">“jhumka under 50k”</b>, <b class="g">“cheaper”</b>, <b class="g">“choose for me”</b> — or I’ll hand you to a human.',
      'मैं अंदाज़ा लगाने के बजाय सही जवाब देना चाहूँगी। ट्राई कीजिए <b class="g">“50 हजार से कम झुमका”</b>, <b class="g">“सस्ता दिखाओ”</b>, <b class="g">“मेरे लिए चुनो”</b> — या इंसान से बात करा दूँ।'));""", 'fallback bilingual')

rep("""    push('bot', 'Namaste 🙏 I’m <b class="g">Saathi</b> — your Shivaa guide. I know every design we sell, the live gold rate, and every policy from hallmark to buyback.<br><br>Confused? Say <b class="g">“choose for me”</b> and I’ll decide with you.');
    push('bot', '', '<div class="sa-tiles">' +
      [['✦', 'Show designs', 'show rings'], ['↻', 'Gold rate', "today's gold rate"], ['🎁', 'Choose for me', 'choose for me'], ['☎', 'Talk to a human', 'talk to a human']]""",
"""    push('bot', ctx.lang === 'hi'
      ? 'नमस्ते 🙏 मैं <b class="g">साथी</b> — आपकी शिवा गाइड। मुझे हर डिज़ाइन, आज का भाव और हॉलमार्क से बायबैक तक हर पॉलिसी पता है।<br><br>समझ नहीं आ रहा? कहिए <b class="g">“मेरे लिए चुनो”</b>।'
      : 'Namaste 🙏 I’m <b class="g">Saathi</b> — your Shivaa guide. I know every design we sell, the live gold rate, and every policy from hallmark to buyback.<br><br>Confused? Say <b class="g">“choose for me”</b> and I’ll decide with you.');
    const hiTiles = ctx.lang === 'hi';
    push('bot', '', '<div class="sa-tiles">' +
      [['✦', hiTiles ? 'डिज़ाइन दिखाओ' : 'Show designs', 'show rings'], ['↻', hiTiles ? 'आज का भाव' : 'Gold rate', "today's gold rate"], ['🎁', hiTiles ? 'मेरे लिए चुनो' : 'Choose for me', 'choose for me'], ['☎', hiTiles ? 'इंसान से बात' : 'Talk to a human', 'talk to a human']]""", 'greet bilingual + tiles')

rep("      flow = { stage: 'occasion' }; push('bot', 'Happy to choose with you. First — the occasion?');",
    "      flow = { stage: 'occasion' }; push('bot', L('Happy to choose with you. First — the occasion?', 'खुशी से चुनूँगी। पहले बताइए — मौका क्या है?'));", 'choose prompt bilingual')

rep("  window.Saathi = { open, close };",
    "  window.Saathi = { open, close, _test: { budgetOf, findCat, findOcc, tokens, scoreSearch, isHi, HI_WORD } };", 'test hooks')

open(p, 'w', encoding='utf-8').write(s)
print('bot.js v52 patched:', s != o)
