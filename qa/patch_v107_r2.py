#!/usr/bin/env python3
"""v107 patcher — round 2 (idempotent): the three anchors round 1 missed."""
import io, os, sys

R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'cms') + os.sep

A_OLD = ("  const pickRates = () => ({ gold22: state.rates.gold22, gold24: state.rates.gold24, "
         "gold18: state.rates.gold18, silver: state.rates.silver });\n"
         "  window._co = { subtotal, freeShip: subtotal >= state.settings.freeShipAbove, coupon: null, "
         "disc: 0, items, rateLock: null, lockTimer: null, payCfg, payMethod: 'Online' };")
A_NEW = ("  const pickRates = () => ({ gold22: state.rates.gold22, gold24: state.rates.gold24, "
         "gold18: state.rates.gold18, silver: state.rates.silver });\n"
         "  /* v107 - the lock window is server-owned (pay/config lockMinutes) and a lock\n"
         "     in flight survives a refresh via localStorage. The server still enforces\n"
         "     the +/-2% band at submit, so a stale or hand-edited lock can never make\n"
         "     the shop sell below the band. */\n"
         "  const LOCKSEC = () => Math.max(300, Math.min(3600, ((window._co && window._co.lockMinutes) || 20) * 60));\n"
         "  window._co = { subtotal, freeShip: subtotal >= state.settings.freeShipAbove, coupon: null, "
         "disc: 0, items, rateLock: null, lockTimer: null, payCfg, payMethod: 'Online', "
         "lockMinutes: (payCfg && payCfg.lockMinutes) || 20 };\n"
         "  try {\n"
         "    const savedLock = JSON.parse(localStorage.getItem('shv_rate_lock') || 'null');\n"
         "    if (savedLock && savedLock.stampedAt && savedLock.rates &&\n"
         "        (Date.now() - new Date(savedLock.stampedAt).getTime()) / 1000 <= LOCKSEC()) window._co.rateLock = savedLock;\n"
         "  } catch (e) {}\n"
         "  const setLock = () => {\n"
         "    window._co.rateLock = { rates: pickRates(), stampedAt: new Date().toISOString() };\n"
         "    try { localStorage.setItem('shv_rate_lock', JSON.stringify(window._co.rateLock)); } catch (e) {}\n"
         "  };")

B_OLD = "see <b>OTP-SETUP-GUIDE.md</b>).'</p>`;"
B_NEW = "see <b>OTP-SETUP-GUIDE.md</b>).'</p>` + window.ShivaaAdmin.v107WizHTML(s);"

C_OLD = ("    if (empty($d['ok'])) jout(502, ['error' => 'The code could not be sent just now — "
         "please retry in a minute, or WhatsApp +91 89050 05921.']);")
C_NEW = ("    if (empty($d['ok'])) jout(502, ['error' => 'The code could not be sent just now — "
         "please retry in a minute, or WhatsApp +91 89050 05921.', 'channel' => $d['channel'] ?? 'none', "
         "'configured' => (bool)shivaa_sms_config()]);")

ok = True
for path, old, new, count in [('js/app.js', A_OLD, A_NEW, 1),
                              ('js/admin.js', B_OLD, B_NEW, 1),
                              ('api.php', C_OLD, C_NEW, 2)]:
    p = R + path
    s = io.open(p, encoding='utf-8').read()
    if s.count(old) == 0 and s.count(new) >= count:
        print('  = %-12s already applied' % path)
        continue
    n = s.count(old)
    if n != count:
        print('  MISMATCH %s found %d want %d' % (path, n, count)); ok = False; continue
    io.open(p, 'w', encoding='utf-8').write(s.replace(old, new))
    print('  ok %-12s x%d' % (path, n))
sys.exit(0 if ok else 1)
