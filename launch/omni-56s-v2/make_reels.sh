#!/usr/bin/env bash
# Shivaa Jewels — Reels from the 56s one-take master.
#
# Out (launch/out/):
#   Shivaa-Reel-56s.mp4         full film, 1080x1920 FULL-BLEED (no blur bars) + clean captions
#   Shivaa-Reel-32s-B2B.mp4     vyapari cut  (designs → wastage/karigar → dead stock → delivery)
#   Shivaa-Reel-32s-RETAIL.mp4  grahak cut   (live rate → hallmark/bill → savings/buyback → delivery)
#
# Chapter starts on the master (xfade shifts each join by 0.16s):
#   ch1 0.00 · ch2 7.84 · ch3 15.68 · ch4 23.52 · ch5 31.36 · ch6 39.20 · ch7 47.04 … 56.00
#
# Captions are pre-rendered PNG strips (this ffmpeg build has no drawtext):
#   python3 launch/omni-56s-v2/make_caption_pngs.py
set -euo pipefail

FF="${FF:-$(python3 -c 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())')}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="$HERE/../out"; CAP="$HERE/captions"
SRC="$OUT/Shivaa-Jewels-56s-ONETAKE-Hindi.mp4"
[ -f "$SRC" ] || { echo "MISSING $SRC"; exit 1; }
[ -f "$CAP/c1.png" ] || python3 "$HERE/make_caption_pngs.py"

Y=1150        # caption baseline (above the Instagram UI strip)
YU=1080       # shivaa.in line, under the end-plate logo

echo "== 1/3 full 56s vertical reel =="
"$FF" -y -v error -i "$SRC" \
  -i "$CAP/c1.png" -i "$CAP/c2.png" -i "$CAP/c3.png" -i "$CAP/c4.png" \
  -i "$CAP/c5.png" -i "$CAP/c6.png" -i "$CAP/c7.png" -i "$CAP/url.png" \
  -filter_complex "\
[0:v]crop=608:1080:'if(between(t,23.52,31.36),950,656)':0,scale=1080:1920:flags=lanczos,setsar=1[base];\
[base][1:v]overlay=0:$Y:enable='between(t,0.9,7.2)'[b1];\
[b1][2:v]overlay=0:$Y:enable='between(t,8.7,15.1)'[b2];\
[b2][3:v]overlay=0:$Y:enable='between(t,16.5,22.9)'[b3];\
[b3][4:v]overlay=0:$Y:enable='between(t,24.4,30.8)'[b4];\
[b4][5:v]overlay=0:$Y:enable='between(t,32.2,38.6)'[b5];\
[b5][6:v]overlay=0:$Y:enable='between(t,40.1,46.4)'[b6];\
[b6][7:v]overlay=0:$Y:enable='between(t,47.9,52.2)'[b7];\
[b7][8:v]overlay=0:$YU:enable='between(t,53.4,56)',format=yuv420p[v]" \
  -map "[v]" -map 0:a -r 24 \
  -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 48000 -movflags +faststart \
  "$OUT/Shivaa-Reel-56s.mp4"

cut2() { # out, A_start, A_end, B_start, B_end  (one 0.2s dissolve at the join)
  local out="$1" as="$2" ae="$3" bs="$4" be="$5"
  local off; off=$(python3 -c "print(round($ae-$as-0.2,2))")
  "$FF" -y -v error -i "$OUT/Shivaa-Reel-56s.mp4" \
    -filter_complex "\
[0:v]trim=$as:$ae,setpts=PTS-STARTPTS,fps=24,settb=AVTB,setsar=1,format=yuv420p[va];\
[0:a]atrim=$as:$ae,asetpts=PTS-STARTPTS[aa];\
[0:v]trim=$bs:$be,setpts=PTS-STARTPTS,fps=24,settb=AVTB,setsar=1,format=yuv420p[vb];\
[0:a]atrim=$bs:$be,asetpts=PTS-STARTPTS[ab];\
[va][vb]xfade=transition=fade:duration=0.2:offset=$off[v];\
[aa][ab]acrossfade=d=0.2,loudnorm=I=-14:TP=-1.5:LRA=11[a]" \
    -map "[v]" -map "[a]" -r 24 \
    -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p \
    -c:a aac -b:a 192k -ar 48000 -movflags +faststart "$out"
}

echo "== 2/3 B2B cut (chapters 2-3-4 + 7) =="
cut2 "$OUT/Shivaa-Reel-32s-B2B.mp4" 7.84 31.36 47.04 56

echo "== 3/3 RETAIL cut (chapter 1 + 5-6-7) =="
cut2 "$OUT/Shivaa-Reel-32s-RETAIL.mp4" 0 7.84 31.36 56

echo "== done =="
for f in "$OUT"/Shivaa-Reel-*.mp4; do
  echo "$(basename "$f")  $("$FF" -hide_banner -i "$f" 2>&1 | grep Duration | cut -d, -f1 | sed 's/.*: //')  $(du -h "$f" | cut -f1)"
done
