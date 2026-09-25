#!/usr/bin/env bash
# Shivaa Jewels — 56s feature trailer assembly.
# Input : launch/omni-56s/raw/01.mp4 .. 07.mp4  (each exactly 8.00s)
# Output: launch/out/  master 16:9 + 9:16 Reels + 1:1 square
set -euo pipefail

FF="${FF:-$(python3 -c 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())')}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RAW="$HERE/raw"
OUT="$HERE/../out"
mkdir -p "$OUT"

LIST="$HERE/.concat.txt"; : > "$LIST"
for i in 01 02 03 04 05 06 07; do
  f="$RAW/$i.mp4"; [ -f "$f" ] || { echo "MISSING $f"; exit 1; }
  echo "file '$f'" >> "$LIST"
done

echo "== 1/4 concat (hard cuts, no re-encode) =="
"$FF" -y -v error -f concat -safe 0 -i "$LIST" -c copy "$OUT/_master_raw.mp4"

echo "== 2/4 master 16:9 + loudness normalise =="
"$FF" -y -v error -i "$OUT/_master_raw.mp4" \
  -c:v copy -af "loudnorm=I=-14:TP=-1.5:LRA=11" -c:a aac -b:a 192k -ar 48000 \
  "$OUT/Shivaa-Jewels-56s-FEATURES-Hindi.mp4"

echo "== 3/4 9:16 vertical (Reels / Shorts / Status) =="
"$FF" -y -v error -i "$OUT/Shivaa-Jewels-56s-FEATURES-Hindi.mp4" \
  -filter_complex "[0:v]split=2[bg][fg];\
[bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=28,eq=brightness=-0.22:saturation=0.8[b];\
[fg]scale=1080:-2[f];[b][f]overlay=(W-w)/2:(H-h)/2,format=yuv420p,setsar=1" \
  -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -r 24 -c:a copy \
  "$OUT/Shivaa-Jewels-56s-FEATURES-Hindi-9x16.mp4"

echo "== 4/4 1:1 square (feed) =="
"$FF" -y -v error -i "$OUT/Shivaa-Jewels-56s-FEATURES-Hindi.mp4" \
  -filter_complex "[0:v]split=2[bg][fg];\
[bg]scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080,gblur=sigma=26,eq=brightness=-0.22:saturation=0.8[b];\
[fg]scale=1080:-2[f];[b][f]overlay=(W-w)/2:(H-h)/2,format=yuv420p,setsar=1" \
  -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -r 24 -c:a copy \
  "$OUT/Shivaa-Jewels-56s-FEATURES-Hindi-1x1.mp4"

rm -f "$LIST" "$OUT/_master_raw.mp4"
echo "== done =="
for f in "$OUT"/Shivaa-Jewels-56s-FEATURES-Hindi*.mp4; do
  d=$("$FF" -v error -i "$f" -f null - 2>&1 >/dev/null || true)
  echo "$(basename "$f")  $("$FF" -hide_banner -i "$f" 2>&1 | grep Duration | cut -d, -f1 | sed 's/.*Duration: //')  $(du -h "$f" | cut -f1)"
done
