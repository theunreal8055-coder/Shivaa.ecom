#!/usr/bin/env bash
# Shivaa Inc. — MANGALSUTRA RANGE · 30s cinematic film assembler (Google Flow / Veo 3.1 renders)
#
#   put the downloaded Flow clips here:
#     launch/flow-30s/raw/shot1.mp4  shot2.mp4  shot3.mp4  outro.mp4
#
#   bash launch/flow-30s/assemble.sh                 -> 16:9 master (1920x1080)
#   ASPECT=9x16 bash launch/flow-30s/assemble.sh     -> vertical master (1080x1920)
#   SHOT=10 bash launch/flow-30s/assemble.sh         -> full 10s per shot (33s total)
#
# Does: trim -> 0.2s dissolves -> logo watermark bottom-right on EVERY frame
#       -> big logo + shivaa.in on the outro plate -> -14 LUFS -> poster frame.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DIR="$ROOT/launch/flow-30s"
RAW="$DIR/raw"
OUT="$ROOT/launch/out"
WORK="$DIR/work"
ASSETS="$ROOT/launch/omni-90s/assets"
mkdir -p "$WORK" "$OUT"

ASPECT="${ASPECT:-16x9}"
SHOT="${SHOT:-9.2}"        # seconds kept from each of the 3 shots (9.2*3 + 3 - 3 dissolves = exactly 30.00 s)
OUTRO="${OUTRO:-3}"        # seconds of logo plate
XF="${XF:-0.2}"            # dissolve length
FPS=24
TOTAL=$(python3 -c "print(round($SHOT*3+$OUTRO-$XF*3,3))")

if [ "$ASPECT" = "9x16" ]; then W=1080; H=1920; SUF="-9x16"; else W=1920; H=1080; SUF=""; fi
NAME="Shivaa-Mangalsutra-30s${SUF}"

FF="$(command -v ffmpeg || true)"
[ -z "$FF" ] && FF="$(python3 -c 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())' 2>/dev/null || true)"
[ -z "$FF" ] && { echo "ffmpeg not found -> pip install --break-system-packages imageio-ffmpeg pillow"; exit 1; }

for f in shot1 shot2 shot3 outro; do
  [ -f "$RAW/$f.mp4" ] || { echo "MISSING: $RAW/$f.mp4  (download it from Flow first)"; exit 1; }
done

# ── 1. normalise every clip: trim, fit the target frame, lock fps/sar/audio ──
norm () { # $1 in  $2 out  $3 seconds
  "$FF" -y -v error -i "$1" -t "$3" \
    -vf "scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=black,fps=${FPS},settb=AVTB,setsar=1,format=yuv420p" \
    -c:v libx264 -preset medium -crf 18 -c:a aac -b:a 192k -ar 48000 -ac 2 "$2"
}
echo "• trimming shots to ${SHOT}s (outro ${OUTRO}s) — target ${TOTAL}s"
norm "$RAW/shot1.mp4" "$WORK/s1.mp4" "$SHOT"
norm "$RAW/shot2.mp4" "$WORK/s2.mp4" "$SHOT"
norm "$RAW/shot3.mp4" "$WORK/s3.mp4" "$SHOT"
norm "$RAW/outro.mp4" "$WORK/s4.mp4" "$OUTRO"

# ── 2. outro plate: big centred logo + shivaa.in, fading in ──
python3 "$DIR/make_outro_overlay.py" "$W" "$H" "$WORK/outro-overlay.png"
"$FF" -y -v error -i "$WORK/s4.mp4" -loop 1 -framerate "$FPS" -i "$WORK/outro-overlay.png" \
  -filter_complex "[1:v]format=rgba,fade=t=in:st=0.15:d=0.7:alpha=1[lg];[0:v][lg]overlay=0:0:format=auto:shortest=1,fps=${FPS},settb=AVTB,setsar=1,format=yuv420p[v]" \
  -map "[v]" -map 0:a? -shortest -c:v libx264 -preset medium -crf 18 -c:a aac -b:a 192k -ar 48000 -ac 2 "$WORK/s4b.mp4"
mv "$WORK/s4b.mp4" "$WORK/s4.mp4"

# ── 3. join with dissolves (pairwise = memory safe on a small box) ──
join () { # $1 a  $2 b  $3 out  $4 offset
  "$FF" -y -v error -i "$1" -i "$2" -filter_complex \
    "[0:v][1:v]xfade=transition=fade:duration=${XF}:offset=$4[v];[0:a][1:a]acrossfade=d=${XF}[a]" \
    -map "[v]" -map "[a]" -c:v libx264 -preset medium -crf 18 -c:a aac -b:a 192k -ar 48000 -ac 2 "$3"
}
echo "• joining with ${XF}s dissolves"
join "$WORK/s1.mp4" "$WORK/s2.mp4" "$WORK/j1.mp4" "$(python3 -c "print(round($SHOT-$XF,3))")"
L2=$(python3 -c "print(round($SHOT*2-$XF,3))")
join "$WORK/j1.mp4" "$WORK/s3.mp4" "$WORK/j2.mp4" "$(python3 -c "print(round($L2-$XF,3))")"
L3=$(python3 -c "print(round($SHOT*3-$XF*2,3))")
join "$WORK/j2.mp4" "$WORK/s4.mp4" "$WORK/j3.mp4" "$(python3 -c "print(round($L3-$XF,3))")"

# ── 4. corner watermark on every frame + loudness ──
LOGO="$ASSETS/logo-shivaa-white.png"
[ -f "$LOGO" ] || LOGO="$ASSETS/logo-shivaa-gold.png"
LW=$(python3 -c "print(int($W*0.14))")
MX=$(python3 -c "print(int($W*0.035))")
MY=$(python3 -c "print(int($H*0.035))")
FADE=$(python3 -c "print(round($TOTAL-0.8,3))")
echo "• watermark + loudnorm"
"$FF" -y -v error -i "$WORK/j3.mp4" -i "$LOGO" -filter_complex \
  "[1:v]scale=${LW}:-1,format=rgba,colorchannelmixer=aa=0.72[wm];\
   [0:v][wm]overlay=W-w-${MX}:H-h-${MY}:format=auto[v];\
   [0:a]loudnorm=I=-14:TP=-1.5:LRA=11,afade=t=out:st=${FADE}:d=0.8[a]" \
  -map "[v]" -map "[a]" -movflags +faststart -t "$TOTAL" \
  -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 -ac 2 "$OUT/$NAME.mp4"

"$FF" -y -v error -ss 2.0 -i "$OUT/$NAME.mp4" -frames:v 1 -q:v 2 "$OUT/$NAME-poster.jpg"

echo
echo "✓ $OUT/$NAME.mp4"
"$FF" -hide_banner -i "$OUT/$NAME.mp4" 2>&1 | grep -E "Duration|Stream #0" || true
