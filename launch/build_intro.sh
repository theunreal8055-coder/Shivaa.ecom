#!/usr/bin/env bash
# Shivaa Jewels — 60s Hindi cinematic launch intro
set -euo pipefail
FF="${FF:-/tmp/ff}"
ROOT="/home/user/Shivaa.ecom"
OUT="$ROOT/launch"
PL="$OUT/plates"
mkdir -p "$PL" "$OUT/out"

# Story order: fire → paper → pieces → wearing → unboxing → blessing → hers
CLIPS=(
  "$ROOT/Molten_gold_pouring_into_mould_20260916183122.mp4"
  "$ROOT/Sketch_transforms_into_gold_bangle_20260916183612.mp4"
  "$ROOT/Gold_jewelry_on_marble_slab_20260916183701.mp4"
  "$ROOT/Woman_adjusting_gold_wrist_bangles_20260916183808.mp4"
  "$ROOT/Bride_unboxing_Shivaa_Jewels_box_20260916185939.mp4"
  "$ROOT/Mother_puts_ring_on_bride_20260916190048.mp4"
  "$ROOT/Woman_wearing_Shivaa_Jewels_jewelry_20260916190228.mp4"
)

echo "== plates =="
i=0
for src in "${CLIPS[@]}"; do
  dest="$PL/p$(printf '%02d' $i).mp4"
  echo "  plate $i  $(basename "$src")"
  "$FF" -y -hide_banner -loglevel error -ss 0.35 -t 7.50 -i "$src" \
    -filter_complex "[0:v]split=2[bg][fg];\
[bg]scale=480:270:flags=fast_bilinear,gblur=sigma=14,scale=1920:1080:flags=bilinear,eq=brightness=-0.20:saturation=0.88:gamma=0.96[b];\
[fg]scale=-2:1080[f];\
[b][f]overlay=(W-w)/2:0,format=yuv420p,fade=t=in:st=0:d=0.35,setsar=1" \
    -an -r 24 -c:v libx264 -preset veryfast -crf 18 -pix_fmt yuv420p "$dest"
  i=$((i+1))
done

echo "== xfade films =="
# 7 × 7.50s, xfade 0.70s → total = 52.50 - 4.20 = 48.30s
"$FF" -y -hide_banner -loglevel error \
  -i "$PL/p00.mp4" -i "$PL/p01.mp4" -i "$PL/p02.mp4" -i "$PL/p03.mp4" \
  -i "$PL/p04.mp4" -i "$PL/p05.mp4" -i "$PL/p06.mp4" \
  -filter_complex "\
[0][1]xfade=transition=fade:duration=0.70:offset=6.80[v1];\
[v1][2]xfade=transition=fade:duration=0.70:offset=13.60[v2];\
[v2][3]xfade=transition=fade:duration=0.70:offset=20.40[v3];\
[v3][4]xfade=transition=fade:duration=0.70:offset=27.20[v4];\
[v4][5]xfade=transition=fade:duration=0.70:offset=34.00[v5];\
[v5][6]xfade=transition=fade:duration=0.70:offset=40.80,format=yuv420p[vout]" \
  -map "[vout]" -an -r 24 -c:v libx264 -preset veryfast -crf 18 "$PL/films.mp4"

echo "== title cards as video =="
# scale cards to 1920x1080, hold with gentle fade
"$FF" -y -hide_banner -loglevel error -loop 1 -t 4.2 -i "$OUT/cards/02-for-whom.png" \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x0a0608,format=yuv420p,fade=t=in:st=0:d=0.6,fade=t=out:st=3.5:d=0.7,setsar=1" \
  -r 24 -c:v libx264 -preset veryfast -crf 18 -pix_fmt yuv420p "$PL/card-whom.mp4"

"$FF" -y -hide_banner -loglevel error -loop 1 -t 8.0 -i "$OUT/cards/03-endcard.png" \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x0a0608,format=yuv420p,fade=t=in:st=0:d=0.7,fade=t=out:st=7.1:d=0.9,setsar=1" \
  -r 24 -c:v libx264 -preset veryfast -crf 18 -pix_fmt yuv420p "$PL/card-end.mp4"

echo "== concat films + cards =="
"$FF" -y -hide_banner -loglevel error \
  -i "$PL/films.mp4" -i "$PL/card-whom.mp4" -i "$PL/card-end.mp4" \
  -filter_complex "[0][1]xfade=transition=fade:duration=0.80:offset=47.50[v1];\
[v1][2]xfade=transition=fade:duration=0.80:offset=50.90,format=yuv420p[vout]" \
  -map "[vout]" -an -r 24 -c:v libx264 -preset veryfast -crf 18 "$PL/picture.mp4"

echo "== wordmark overlay on open =="
"$FF" -y -hide_banner -loglevel error -i "$PL/picture.mp4" -i "$OUT/cards/01-wordmark.png" \
  -filter_complex "\
[1]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black@0,format=rgba,\
fade=t=in:st=0.40:d=0.70:alpha=1,fade=t=out:st=3.10:d=0.90:alpha=1[wm];\
[0][wm]overlay=0:0:format=auto,format=yuv420p[vout]" \
  -map "[vout]" -an -r 24 -c:v libx264 -preset veryfast -crf 18 "$PL/picture-wm.mp4"

echo "== voice bed (Hindi, Rajasthan — no Jaipur) =="
# VO1 @ 2.0s, VO2 @ 12.2s, VO3 @ 24.0s, VO4 @ 38.2s
"$FF" -y -hide_banner -loglevel error \
  -i "$OUT/vo/01-opening.mp3" \
  -i "$OUT/vo/02-craft.mp3" \
  -i "$OUT/vo/03-people.mp3" \
  -i "$OUT/vo/04-close.mp3" \
  -f lavfi -t 60.5 -i anullsrc=r=48000:cl=stereo \
  -filter_complex "\
[0:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,adelay=2000|2000,volume=1.05[a1];\
[1:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,adelay=12200|12200,volume=1.05[a2];\
[2:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,adelay=24000|24000,volume=1.05[a3];\
[3:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,adelay=38200|38200,volume=1.05[a4];\
[4:a]anull[bed];\
[bed][a1][a2][a3][a4]amix=inputs=5:dropout_transition=0:normalize=0,alimiter=limit=0.95,atrim=0:60.5,aformat=sample_fmts=fltp[aout]" \
  -map "[aout]" -c:a aac -b:a 192k "$PL/vo-bed.m4a"

echo "== mux 60s intro =="
"$FF" -y -hide_banner -loglevel warning \
  -i "$PL/picture-wm.mp4" -i "$PL/vo-bed.m4a" \
  -filter_complex "[0:v]trim=0:60.0,setpts=PTS-STARTPTS,format=yuv420p[v];\
[1:a]atrim=0:60.0,asetpts=PTS-STARTPTS[a]" \
  -map "[v]" -map "[a]" \
  -c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 48000 -ac 2 \
  -movflags +faststart -r 24 \
  "$OUT/out/Shivaa-Jewels-Launch-Intro-Hindi-60s.mp4"

echo "== probe =="
/tmp/ff -hide_banner -i "$OUT/out/Shivaa-Jewels-Launch-Intro-Hindi-60s.mp4" 2>&1 | tail -20
ls -lh "$OUT/out/Shivaa-Jewels-Launch-Intro-Hindi-60s.mp4"
echo DONE
