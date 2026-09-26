#!/usr/bin/env bash
# Shivaa Jewels — 56s ONE-TAKE trailer v2 assembly.
#
# Input : launch/omni-56s-v2/raw/01.mp4 .. 07.mp4 (each exactly 8.00s, 720p24)
# Output: launch/out/  master 1080p 16:9 + 9:16 + 1:1, total exactly 56.00s
#
# Why not a plain concat: the chapters are one continuous walk, so each join gets a
# 4-frame (0.16s) dissolve — enough to hide the frame mismatch, too short to read as a
# "transition". 6 joins eat 0.96s, so the end logo plate is held 0.96s longer to land
# back on exactly 56.00s.
set -euo pipefail

FF="${FF:-$(python3 -c 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())')}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RAW="$HERE/raw"; OUT="$HERE/../out"; mkdir -p "$OUT"
D=0.16                     # dissolve length
PAD=0.96                   # 6 * D, added back on the end plate

for i in 01 02 03 04 05 06 07; do [ -f "$RAW/$i.mp4" ] || { echo "MISSING $RAW/$i.mp4"; exit 1; }; done

echo "== 1/4 one-take join (4-frame dissolves) + 1080p upscale =="
"$FF" -y -v error \
  -i "$RAW/01.mp4" -i "$RAW/02.mp4" -i "$RAW/03.mp4" -i "$RAW/04.mp4" \
  -i "$RAW/05.mp4" -i "$RAW/06.mp4" -i "$RAW/07.mp4" \
  -filter_complex "\
[0:v]scale=1920:1080:flags=lanczos,setsar=1[v0];\
[1:v]scale=1920:1080:flags=lanczos,setsar=1[v1];\
[2:v]scale=1920:1080:flags=lanczos,setsar=1[v2];\
[3:v]scale=1920:1080:flags=lanczos,setsar=1[v3];\
[4:v]scale=1920:1080:flags=lanczos,setsar=1[v4];\
[5:v]scale=1920:1080:flags=lanczos,setsar=1[v5];\
[6:v]scale=1920:1080:flags=lanczos,setsar=1[v6];\
[v0][v1]xfade=transition=fade:duration=$D:offset=7.84[x1];\
[x1][v2]xfade=transition=fade:duration=$D:offset=15.68[x2];\
[x2][v3]xfade=transition=fade:duration=$D:offset=23.52[x3];\
[x3][v4]xfade=transition=fade:duration=$D:offset=31.36[x4];\
[x4][v5]xfade=transition=fade:duration=$D:offset=39.20[x5];\
[x5][v6]xfade=transition=fade:duration=$D:offset=47.04[x6];\
[x6]tpad=stop_mode=clone:stop_duration=$PAD,unsharp=5:5:0.35:5:5:0.0,format=yuv420p[vout];\
[0:a][1:a]acrossfade=d=$D[a1];[a1][2:a]acrossfade=d=$D[a2];[a2][3:a]acrossfade=d=$D[a3];\
[a3][4:a]acrossfade=d=$D[a4];[a4][5:a]acrossfade=d=$D[a5];[a5][6:a]acrossfade=d=$D[a6];\
[a6]apad=pad_dur=$PAD,afade=t=out:st=55.2:d=0.8,loudnorm=I=-14:TP=-1.5:LRA=11[aout]" \
  -map "[vout]" -map "[aout]" -r 24 -t 56 \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 48000 -movflags +faststart \
  "$OUT/Shivaa-Jewels-56s-ONETAKE-Hindi.mp4"

echo "== 2/4 9:16 (Reels / Shorts / Status) =="
"$FF" -y -v error -i "$OUT/Shivaa-Jewels-56s-ONETAKE-Hindi.mp4" \
  -filter_complex "[0:v]split=2[bg][fg];\
[bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=28,eq=brightness=-0.22:saturation=0.8[b];\
[fg]scale=1080:-2[f];[b][f]overlay=(W-w)/2:(H-h)/2,format=yuv420p,setsar=1" \
  -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -r 24 -c:a copy -movflags +faststart \
  "$OUT/Shivaa-Jewels-56s-ONETAKE-Hindi-9x16.mp4"

echo "== 3/4 1:1 (feed) =="
"$FF" -y -v error -i "$OUT/Shivaa-Jewels-56s-ONETAKE-Hindi.mp4" \
  -filter_complex "[0:v]split=2[bg][fg];\
[bg]scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080,gblur=sigma=26,eq=brightness=-0.22:saturation=0.8[b];\
[fg]scale=1080:-2[f];[b][f]overlay=(W-w)/2:(H-h)/2,format=yuv420p,setsar=1" \
  -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -r 24 -c:a copy -movflags +faststart \
  "$OUT/Shivaa-Jewels-56s-ONETAKE-Hindi-1x1.mp4"

echo "== 4/4 report =="
for f in "$OUT"/Shivaa-Jewels-56s-ONETAKE-Hindi*.mp4; do
  echo "$(basename "$f")  $("$FF" -hide_banner -i "$f" 2>&1 | grep Duration | cut -d, -f1 | sed 's/.*: //')  $(du -h "$f" | cut -f1)"
done
