#!/usr/bin/env bash
# Reel / Shorts cut v2 for the 90s explainer.
# Dresses the finished 16:9 master in the brand frame and adds a caption that
# changes with every chapter (chapters are 9.85s apart after the dissolves).
set -euo pipefail

FF="${FF:-$(python3 -c 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())')}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="$HERE/../out"; FIX="$HERE/fix"
SRC="$OUT/Shivaa-Explainer-90s-Hindi.mp4"
[ -f "$SRC" ] || { echo "MISSING $SRC"; exit 1; }
python3 "$FIX/make_vertical_v2.py" >/dev/null

CH=9.85            # chapter pitch on the master
CY=1265            # caption strip y (just under the video window)

ins=""; fc=""
for i in 1 2 3 4 5 6 7 8 9; do ins="$ins -i $FIX/vcap-$i.png"; done

# 1080x1920 backdrop: blurred, darkened master + brand frame + video window
fc="[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=34,eq=brightness=-0.35:saturation=0.55[bg];\
[0:v]scale=1080:-2[vid];[bg][vid]overlay=0:590[b0];[b0][1:v]overlay=0:0[b1]"

prev="b1"
for i in 1 2 3 4 5 6 7 8 9; do
  start=$(python3 -c "print(round(($i-1)*$CH+0.8,2))")
  end=$(python3 -c "print(round($i*$CH-0.5,2))")
  idx=$((i + 1))
  out="c$i"
  fc="$fc;[$prev][$idx:v]overlay=0:$CY:enable='between(t,$start,$end)'[$out]"
  prev="$out"
done
fc="$fc;[$prev]format=yuv420p[v]"

echo "== rendering 9:16 v2 =="
"$FF" -y -v error -i "$SRC" -i "$FIX/vertical-frame-v2.png" $ins \
  -filter_complex "$fc" -map "[v]" -map 0:a \
  -c:v libx264 -preset medium -crf 21 -pix_fmt yuv420p -r 24 \
  -c:a copy -movflags +faststart \
  "$OUT/Shivaa-Explainer-90s-Hindi-9x16.mp4"

"$FF" -y -v error -ss 12 -i "$OUT/Shivaa-Explainer-90s-Hindi-9x16.mp4" -frames:v 1 -q:v 2 \
  "$OUT/Shivaa-Explainer-90s-poster-9x16.jpg"

echo "done: $("$FF" -hide_banner -i "$OUT/Shivaa-Explainer-90s-Hindi-9x16.mp4" 2>&1 | grep Duration | cut -d, -f1 | sed 's/.*: //')"
