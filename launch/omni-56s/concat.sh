#!/usr/bin/env bash
# Shivaa Jewels — join the 7 Omni Flash clips into the 56s trailer.
#
# Put the downloaded Omni renders here as raw/01.mp4 ... raw/07.mp4, then:
#   bash launch/omni-56s/concat.sh
# Output: launch/out/Shivaa-Jewels-56s-FEATURES-Hindi.mp4
#
# Hard cuts only — the film is designed as one continuous take across the
# clips, so do NOT add crossfades (they would soften the last-frame chain).
set -euo pipefail

FF="${FF:-ffmpeg}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RAW="$HERE/raw"
OUT="$HERE/../out"
mkdir -p "$OUT"

LIST="$HERE/.concat.txt"
: > "$LIST"

for i in 01 02 03 04 05 06 07; do
  f="$RAW/$i.mp4"
  [ -f "$f" ] || { echo "MISSING: $f — render clip $i in Omni first."; exit 1; }
  d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f" | cut -d. -f1)
  echo "clip $i  ${d}s"
  [ "$d" -eq 8 ] || echo "  !! clip $i is not 8s — re-render, do not speed-warp."
  echo "file '$f'" >> "$LIST"
done

"$FF" -y -hide_banner -loglevel error -f concat -safe 0 -i "$LIST" \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -r 24 \
  -c:a aac -b:a 192k -ar 48000 \
  "$OUT/Shivaa-Jewels-56s-FEATURES-Hindi.mp4"

rm -f "$LIST"
echo "== done =="
ffprobe -v error -show_entries format=duration -of csv=p=0 \
  "$OUT/Shivaa-Jewels-56s-FEATURES-Hindi.mp4"
echo "$OUT/Shivaa-Jewels-56s-FEATURES-Hindi.mp4"
