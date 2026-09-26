#!/usr/bin/env bash
# Shivaa Inc. — 90s animated explainer assembly.
#
# Input : launch/omni-90s/raw/01.mp4 .. 09.mp4 (each 10.0s, 720p24, watermark burned in)
# Output: launch/out/
#   Shivaa-Explainer-90s-Hindi.mp4        16:9 1080p, exactly 90.00s  (YouTube / website)
#   Shivaa-Explainer-90s-Hindi-9x16.mp4   9:16 vertical  (Reel / Shorts / Status)
#
# Chapter 6 fix: Omni invented fake rupee figures on the bill cards
# (METAL Rs 73,000 / MAKING Rs 1,94,900 / GST Rs 33,500). A clean number-free
# METAL/MAKING/GST panel (launch/omni-90s/fix/pricing-panel.png) is composited over them.
set -euo pipefail

FF="${FF:-$(python3 -c 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())')}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RAW="$HERE/raw"; OUT="$HERE/../out"; FIX="$HERE/fix"; mkdir -p "$OUT"
D=0.16                       # dissolve between chapters
mkdir -p "$RAW"
# Omni names its downloads unpredictably, so chapters are mapped by content
# (verified frame-by-frame), not by filename order.
if [ ! -f "$RAW/01.mp4" ]; then
  ROOT="$HERE/../.."; n=0
  for pat in "Woman_presenting_gold_explainer_" "Host_presenting_jewellery_catalo" \
             "Woman_presenting_custom_jewelry_" "Woman_presenting_jewellery_stock" \
             "Woman_presenting_bullion_investm" "Host_presenting_customer_pricing" \
             "Woman_presenting_gold_buyback_ex" "Woman_presenting_animated_explai" \
             "Animated_video_outro_with_logo"; do
    n=$((n+1)); src=$(ls "$ROOT/$pat"*.mp4 2>/dev/null | head -1)
    [ -n "$src" ] && cp "$src" "$RAW/$(printf %02d $n).mp4"
  done
fi
for i in 01 02 03 04 05 06 07 08 09; do [ -f "$RAW/$i.mp4" ] || { echo "MISSING $RAW/$i.mp4"; exit 1; }; done

echo "== 0/3 chapter 6 — replace the invented rupee figures =="
"$FF" -y -v error -i "$RAW/06.mp4" -i "$FIX/pricing-panel.png" \
  -filter_complex "[0:v][1:v]overlay=95:225:enable='gte(t,2.6)',format=yuv420p" \
  -c:v libx264 -preset slow -crf 17 -c:a copy "$FIX/06-fixed.mp4"

echo "== 1/3 join 9 chapters (pairwise, memory-safe) =="
TMP="$HERE/.tmp"; rm -rf "$TMP"; mkdir -p "$TMP"
cp "$RAW/01.mp4" "$TMP/cur.mp4"
for i in 02 03 04 05 06 07 08 09; do
  SRC="$RAW/$i.mp4"; [ "$i" = "06" ] && SRC="$FIX/06-fixed.mp4"
  INFO=$("$FF" -hide_banner -i "$TMP/cur.mp4" 2>&1 || true)
  DUR=$(printf '%s' "$INFO" | sed -n 's/.*Duration: \([0-9:.]*\),.*/\1/p' \
        | awk -F: '{printf "%.3f", $1*3600+$2*60+$3}')
  OFF=$(awk -v d="$DUR" -v x="$D" 'BEGIN{printf "%.3f", d-x}')
  echo "   + chapter $i  (cut at ${OFF}s)"
  "$FF" -y -v error -i "$TMP/cur.mp4" -i "$SRC" -filter_complex "\
[0:v]fps=24,settb=AVTB,setsar=1[a];[1:v]fps=24,settb=AVTB,setsar=1[b];\
[a][b]xfade=transition=fade:duration=$D:offset=$OFF,format=yuv420p[v];\
[0:a][1:a]acrossfade=d=$D[aud]" -map "[v]" -map "[aud]" \
    -c:v libx264 -preset veryfast -crf 16 -c:a aac -b:a 256k -ar 48000 "$TMP/next.mp4"
  mv "$TMP/next.mp4" "$TMP/cur.mp4"
done

echo "== 1b/3 1080p master, exactly 90.00s, -14 LUFS =="
"$FF" -y -v error -i "$TMP/cur.mp4" -filter_complex "\
[0:v]scale=1920:1080:flags=lanczos,unsharp=5:5:0.3:5:5:0.0,tpad=stop_mode=clone:stop_duration=2,format=yuv420p[vout];\
[0:a]apad=pad_dur=2,afade=t=out:st=89.0:d=1.0,loudnorm=I=-14:TP=-1.5:LRA=11[aout]" \
  -map "[vout]" -map "[aout]" -r 24 -t 90 \
  -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 48000 -movflags +faststart \
  "$OUT/Shivaa-Explainer-90s-Hindi.mp4"

echo "== 2/3 9:16 vertical (Reel / Shorts / Status) =="
python3 "$FIX/make_vertical_frame.py"
"$FF" -y -v error -i "$OUT/Shivaa-Explainer-90s-Hindi.mp4" -i "$FIX/vertical-frame.png" \
  -filter_complex "[0:v]split=2[bg][fg];\
[bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=45,eq=brightness=-0.62:saturation=0.45[b];\
[fg]scale=1080:-2[f];[b][f]overlay=(W-w)/2:656[o];[o][1:v]overlay=0:0,format=yuv420p,setsar=1" \
  -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -r 24 -c:a copy -movflags +faststart \
  "$OUT/Shivaa-Explainer-90s-Hindi-9x16.mp4"

echo "== 2b/3 posters =="
"$FF" -y -v error -ss 4 -i "$OUT/Shivaa-Explainer-90s-Hindi.mp4" -frames:v 1 -q:v 2 "$OUT/Shivaa-Explainer-90s-poster-16x9.jpg"
"$FF" -y -v error -ss 4 -i "$OUT/Shivaa-Explainer-90s-Hindi-9x16.mp4" -frames:v 1 -q:v 2 "$OUT/Shivaa-Explainer-90s-poster-9x16.jpg"

echo "== 3/3 report =="
for f in "$OUT"/Shivaa-Explainer-90s*.mp4; do
  echo "$(basename "$f")  $("$FF" -hide_banner -i "$f" 2>&1 | grep Duration | cut -d, -f1 | sed 's/.*: //')  $(du -h "$f" | cut -f1)"
done
