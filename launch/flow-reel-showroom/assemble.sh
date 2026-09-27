#!/usr/bin/env bash
# Shivaa Inc. — MANGALSUTRA RANGE · 30s cinematic film assembler (Google Flow / Veo 3.1 renders)
#
#   clips go here:  launch/flow-reel-showroom/raw/shot1.mp4 shot2.mp4 shot3.mp4 outro.mp4
#
#   bash launch/flow-reel-showroom/assemble.sh                 -> vertical master (Reel/Shorts/Status)
#   ASPECT=16x9 bash launch/flow-reel-showroom/assemble.sh     -> wide master (YouTube/site/showroom)
#   SHOT=10 …                                        -> 10 s per shot (33 s total)
#   CAPTIONS=0 / PATCH3=0                            -> skip the burned-label repairs
#
# Pipeline: trim -> repair Veo's burned-in prompt labels -> fit to frame
#           -> 0.2 s dissolves -> corner logo watermark on every frame
#           -> logo + shivaa.in on the outro plate -> -14 LUFS -> poster.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DIR="$ROOT/launch/flow-reel-showroom"
RAW="$DIR/raw"; OUT="$ROOT/launch/out"; WORK="$DIR/work"
ASSETS="$ROOT/launch/omni-90s/assets"
mkdir -p "$WORK" "$OUT"

ASPECT="${ASPECT:-9x16}"
SHOT="${SHOT:-9.2}"        # default per-shot length
SHOTS_N=7
SLEN="${SLEN:-7.0}"   # seconds kept from each of the 7 shots

OUTRO="${OUTRO:-3}"
XF="${XF:-0.2}"
FPS=24
TOTAL=$(python3 -c "print(round($SLEN*$SHOTS_N+$OUTRO-$XF*$SHOTS_N,3))")

if [ "$ASPECT" = "16x9" ]; then W=1920; H=1080; SUF="-16x9"; else W=1080; H=1920; SUF=""; fi
CW=1080; CH=1920            # canonical (portrait) space where the repairs are done
NAME="Shivaa-Showroom-Reel${SUF}"

FF="$(command -v ffmpeg || true)"
[ -z "$FF" ] && FF="$(python3 -c 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())' 2>/dev/null || true)"
[ -z "$FF" ] && { echo "ffmpeg not found -> pip install --break-system-packages imageio-ffmpeg pillow"; exit 1; }

for f in shot1 shot2 shot3 shot4 shot5 shot6 shot7 outro; do
  [ -f "$RAW/$f.mp4" ] || { echo "MISSING: $RAW/$f.mp4  (download it from Flow first)"; exit 1; }
done

# ── 1. trim + bring every clip into the canonical 1080x1920 space ──
canon () { # in out seconds [seek]
  "$FF" -y -v error ${4:+-ss $4} -i "$1" -t "$3" \
    -vf "scale=${CW}:${CH}:force_original_aspect_ratio=decrease,pad=${CW}:${CH}:(ow-iw)/2:(oh-ih)/2:color=black,fps=${FPS},settb=AVTB,setsar=1,format=yuv420p" \
    -c:v libx264 -preset ${PRE:-medium} -crf 18 -c:a aac -b:a 192k -ar 48000 -ac 2 "$2"
}
echo "• trimming ${SHOTS_N} shots to ${SLEN}s each (outro ${OUTRO}s) — target ${TOTAL}s"
for i in $(seq 1 $SHOTS_N); do canon "$RAW/shot$i.mp4" "$WORK/c$i.mp4" "$SLEN"; done
canon "$RAW/outro.mp4" "$WORK/c$((SHOTS_N+1)).mp4" "$OUTRO"

# ── 3. fit the canonical frame into the delivery frame (blurred backdrop, nothing cropped) ──
fit () { # in out
  if [ "$CW" = "$W" ] && [ "$CH" = "$H" ]; then cp "$1" "$2"; return; fi
  "$FF" -y -v error -i "$1" -filter_complex \
    "[0:v]split=2[bg][fg];\
     [bg]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},gblur=sigma=42,eq=brightness=-0.16:saturation=0.85[bgb];\
     [fg]scale=${W}:${H}:force_original_aspect_ratio=decrease[fgs];\
     [bgb][fgs]overlay=(W-w)/2:(H-h)/2,fps=${FPS},settb=AVTB,setsar=1,format=yuv420p[v]" \
    -map "[v]" -map 0:a? -c:v libx264 -preset ${PRE:-medium} -crf 18 -c:a aac -b:a 192k -ar 48000 -ac 2 "$2"
}
echo "• fitting to ${W}x${H}"
for i in $(seq 1 $((SHOTS_N+1))); do fit "$WORK/c$i.mp4" "$WORK/s$i.mp4"; done

# ── 4. outro plate: dark scrim + big gold logo + shivaa.in ──
echo "• outro logo"
python3 "$DIR/make_outro_overlay.py" "$W" "$H" "$WORK/outro-overlay.png" >/dev/null
"$FF" -y -v error -i "$WORK/s$((SHOTS_N+1)).mp4" -loop 1 -framerate "$FPS" -i "$WORK/outro-overlay.png" \
  -filter_complex "[1:v]format=rgba,fade=t=in:st=0.15:d=0.7:alpha=1[lg];[0:v][lg]overlay=0:0:format=auto:shortest=1,fps=${FPS},settb=AVTB,setsar=1,format=yuv420p[v]" \
  -map "[v]" -map 0:a? -shortest -c:v libx264 -preset ${PRE:-medium} -crf 18 -c:a aac -b:a 192k -ar 48000 -ac 2 "$WORK/s$((SHOTS_N+1))b.mp4"
mv "$WORK/s$((SHOTS_N+1))b.mp4" "$WORK/s$((SHOTS_N+1)).mp4"

# ── 5. join with dissolves (pairwise = memory safe) ──
join () { "$FF" -y -v error -i "$1" -i "$2" -filter_complex \
    "[0:v][1:v]xfade=transition=fade:duration=${XF}:offset=$4[v];[0:a][1:a]acrossfade=d=${XF}[a]" \
    -map "[v]" -map "[a]" -c:v libx264 -preset ${PRE:-medium} -crf 18 -c:a aac -b:a 192k -ar 48000 -ac 2 "$3"; }
echo "• joining with ${XF}s dissolves"
cp "$WORK/s1.mp4" "$WORK/j.mp4"
ACC=$SLEN
for i in $(seq 2 $((SHOTS_N+1))); do
  OFF=$(python3 -c "print(round($ACC-$XF,3))")
  join "$WORK/j.mp4" "$WORK/s$i.mp4" "$WORK/jn.mp4" "$OFF"
  mv "$WORK/jn.mp4" "$WORK/j.mp4"
  if [ "$i" -le "$SHOTS_N" ]; then ACC=$(python3 -c "print(round($ACC+$SLEN-$XF,3))"); fi
done
mv "$WORK/j.mp4" "$WORK/j3.mp4"

# ── 6. corner watermark on every frame + loudness ──
LOGO="$ASSETS/logo-shivaa-white.png"; [ -f "$LOGO" ] || LOGO="$ASSETS/logo-shivaa-gold.png"
LW=$(python3 -c "print(int($W*0.14))")
MX=$(python3 -c "print(int($W*0.035))"); MY=$(python3 -c "print(int($H*0.035))")
FADE=$(python3 -c "print(round($TOTAL-0.8,3))")
VOD="$DIR/vo"
if [ "${VO:-1}" = "1" ] && [ -f "$VOD/vo1.mp3" ] && [ -f "$VOD/vo2.mp3" ] && [ -f "$VOD/vo3.mp3" ] && [ -f "$VOD/vo4.mp3" ]; then
  echo "• watermark + Hindi voice-over (bed ducked) + loudnorm"
  V1="${V1:-1000}"; V2="${V2:-20000}"; V3="${V3:-38000}"; V4="${V4:-46500}"
  "$FF" -y -v error -i "$WORK/j3.mp4" -i "$LOGO" \
    -i "$VOD/vo1.mp3" -i "$VOD/vo2.mp3" -i "$VOD/vo3.mp3" -i "$VOD/vo4.mp3" -filter_complex \
    "[1:v]scale=${LW}:-1,format=rgba,colorchannelmixer=aa=0.72[wm];\
     [0:v][wm]overlay=W-w-${MX}:H-h-${MY}:format=auto[v];\
     [2:a]aresample=48000,adelay=${V1}|${V1}[x1];\
     [3:a]aresample=48000,adelay=${V2}|${V2}[x2];\
     [4:a]aresample=48000,adelay=${V3}|${V3}[x3];\
     [5:a]aresample=48000,adelay=${V4}|${V4}[x4];\
     [x1][x2][x3][x4]amix=inputs=4:normalize=0,volume=1.6,asplit=2[vo1][vo2];\
     [0:a]volume=0.55[bed];\
     [bed][vo1]sidechaincompress=threshold=0.02:ratio=9:attack=12:release=420[duck];\
     [duck][vo2]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,afade=t=out:st=${FADE}:d=0.8[a]" \
    -map "[v]" -map "[a]" -movflags +faststart -t "$TOTAL" \
    -c:v libx264 -preset ${PREF:-slow} -crf 19 -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 -ac 2 "$OUT/$NAME.mp4"
else
  echo "• watermark + loudnorm (no voice-over)"
  "$FF" -y -v error -i "$WORK/j3.mp4" -i "$LOGO" -filter_complex \
    "[1:v]scale=${LW}:-1,format=rgba,colorchannelmixer=aa=0.72[wm];\
     [0:v][wm]overlay=W-w-${MX}:H-h-${MY}:format=auto[v];\
     [0:a]loudnorm=I=-14:TP=-1.5:LRA=11,afade=t=out:st=${FADE}:d=0.8[a]" \
    -map "[v]" -map "[a]" -movflags +faststart -t "$TOTAL" \
    -c:v libx264 -preset ${PREF:-slow} -crf 19 -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 -ac 2 "$OUT/$NAME.mp4"
fi

"$FF" -y -v error -ss 4.6 -i "$OUT/$NAME.mp4" -frames:v 1 -q:v 2 "$OUT/$NAME-poster.jpg"

echo
echo "✓ $OUT/$NAME.mp4"
"$FF" -hide_banner -i "$OUT/$NAME.mp4" 2>&1 | grep -E "Duration|Stream #0" || true
