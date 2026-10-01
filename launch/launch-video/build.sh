#!/usr/bin/env bash
# SHIVAA launch video — screen recording + webcam + motion graphics  (16:9, 1080p)
#
#   media/webcam.mp4  = the master timeline (your voice runs the whole film)
#   media/screen.mp4  = the product demo, shown in the middle section
#
# Structure:  webcam full-screen intro  →  screen demo with webcam bubble + supers
#             →  webcam full-screen CTA  →  3 s brand end card
#
# usage:  bash launch/launch-video/build.sh
# env:    INTRO=8  OUTRO=8  MAXLEN=90  SCREEN_START=0  SPEED=1.0
#         MUSIC=path.mp3  MUSVOL=0.10  END=3  BUBBLE=0.30  PRE=medium
#         S1=2 S2=14 S3=26 S4=38   (super cue times, seconds into the demo section)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DIR="$ROOT/launch/launch-video"
MEDIA="${MEDIA:-$ROOT/media}"
WORK="$DIR/work"; OUTD="$ROOT/launch/out"
mkdir -p "$WORK" "$OUTD"
FF="$(python3 -c 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())')"
FP="${FF%ffmpeg*}ffprobe"; [ -x "$FP" ] || FP=""

CAM="${CAM:-$MEDIA/webcam.mp4}"
SCR="${SCR:-$MEDIA/screen.mp4}"
for f in "$CAM" "$SCR"; do
  [ -f "$f" ] || { echo "missing: $f"; echo "upload webcam.mp4 and screen.mp4 into $MEDIA/"; exit 1; }
done

W=1920; H=1080; FPS=30
INTRO="${INTRO:-8}"; OUTRO="${OUTRO:-8}"; MAXLEN="${MAXLEN:-90}"
SCREEN_START="${SCREEN_START:-0}"; END="${END:-3}"; BUB_F="${BUBBLE:-0.30}"
PRE="${PRE:-medium}"; CRF="${CRF:-18}"
S1="${S1:-2}"; S2="${S2:-14}"; S3="${S3:-26}"; S4="${S4:-38}"
SUPLEN="${SUPLEN:-5}"

dur () { { "$FF" -hide_banner -i "$1" 2>&1 || true; } | grep -o 'Duration: [0-9:.]*' | head -1 \
         | cut -d' ' -f2 | awk -F: '{printf "%.2f", $1*3600+$2*60+$3}'; }
CAMD=$(dur "$CAM"); SCRD=$(dur "$SCR")
T=$(python3 -c "print(min($CAMD, $MAXLEN))")
MID=$(python3 -c "print(round(max(4, $T - $INTRO - $OUTRO), 2))")
SCR_AVAIL=$(python3 -c "print(round($SCRD - $SCREEN_START, 2))")
SPEED=$(python3 -c "print(round(max(1.0, $SCR_AVAIL/$MID), 4) if $SCR_AVAIL > $MID else 1.0)")
OUTRO_START=$(python3 -c "print(round($T - $OUTRO, 2))")

echo "• webcam ${CAMD}s · screen ${SCRD}s"
echo "• timeline: intro 0-${INTRO}s · demo ${INTRO}-${OUTRO_START}s (${MID}s, screen sped x${SPEED}) · cta ${OUTRO_START}-${T}s · endcard ${END}s"

BUB=$(python3 -c "print(int($H*$BUB_F//2*2))")
python3 "$DIR/make_gfx.py" "$W" "$H" "$WORK/gfx" >/dev/null
read -r BS BR BP < "$WORK/gfx/bubble.txt"
MX=$(python3 -c "print(int($W - $BR - $W*0.035))")
MY=$(python3 -c "print(int($H - $BR - $H*0.06))")
BX=$(python3 -c "print(int($MX + $BP))")
BY=$(python3 -c "print(int($MY + $BP))")

fitv="scale=$W:$H:force_original_aspect_ratio=increase,crop=$W:$H,fps=$FPS,setsar=1,settb=AVTB"

# ── 1. intro: webcam full screen + title lower-third + watermark ─────────────
echo "• 1/5 intro"
"$FF" -y -v error -ss 0 -t "$INTRO" -i "$CAM" \
  -loop 1 -framerate "$FPS" -t "$INTRO" -i "$WORK/gfx/title.png" -i "$WORK/gfx/watermark.png" \
  -filter_complex "\
   [0:v]$fitv,eq=contrast=1.04:saturation=1.05[base];\
   [1:v]format=rgba,fade=t=in:st=0.6:d=0.6:alpha=1,fade=t=out:st=$(python3 -c "print(round($INTRO-1.0,2))"):d=0.6:alpha=1[ttl];\
   [base][ttl]overlay=0:0:format=auto[t1];\
   [2:v]format=rgba[wm];[t1][wm]overlay=W-w-40:40:format=auto,format=yuv420p[v]" \
  -map "[v]" -an -c:v libx264 -preset "$PRE" -crf "$CRF" -r "$FPS" "$WORK/seg1.mp4"

# ── 2. demo: screen recording + webcam bubble + supers ───────────────────────
echo "• 2/5 demo section"
"$FF" -y -v error \
  -ss "$SCREEN_START" -i "$SCR" \
  -ss "$INTRO" -t "$MID" -i "$CAM" \
  -i "$WORK/gfx/bubble_mask.png" -i "$WORK/gfx/bubble_ring.png" -i "$WORK/gfx/watermark.png" \
  -loop 1 -framerate "$FPS" -t "$MID" -i "$WORK/gfx/super1.png" \
  -loop 1 -framerate "$FPS" -t "$MID" -i "$WORK/gfx/super2.png" \
  -loop 1 -framerate "$FPS" -t "$MID" -i "$WORK/gfx/super3.png" \
  -loop 1 -framerate "$FPS" -t "$MID" -i "$WORK/gfx/super4.png" \
  -filter_complex "\
   [0:v]setpts=PTS/$SPEED,trim=duration=$MID,setpts=PTS-STARTPTS,\
        scale=$W:$H:force_original_aspect_ratio=decrease,pad=$W:$H:(ow-iw)/2:(oh-ih)/2:color=0x0E0C0A,\
        fps=$FPS,setsar=1,settb=AVTB,eq=contrast=1.03:saturation=1.03[scr];\
   [1:v]scale=$BS:$BS:force_original_aspect_ratio=increase,crop=$BS:$BS,fps=$FPS,setsar=1,format=rgba[camsq];\
   [2:v]format=gray,scale=$BS:$BS[msk];\
   [camsq][msk]alphamerge[cam];\
   [scr][cam]overlay=$BX:$BY:format=auto[d1];\
   [3:v]format=rgba[ring];[d1][ring]overlay=$MX:$MY:format=auto[d2];\
   [4:v]format=rgba[wm];[d2][wm]overlay=W-w-40:40:format=auto[d3];\
   [5:v]format=rgba,fade=t=in:st=$S1:d=0.45:alpha=1[s1];[6:v]format=rgba,fade=t=in:st=$S2:d=0.45:alpha=1[s2];[7:v]format=rgba,fade=t=in:st=$S3:d=0.45:alpha=1[s3];[8:v]format=rgba,fade=t=in:st=$S4:d=0.45:alpha=1[s4];\
   [d3][s1]overlay=0:0:format=auto:enable=between(t\,$S1\,$(python3 -c "print(round($S1+$SUPLEN,2))"))[d4];\
   [d4][s2]overlay=0:0:format=auto:enable=between(t\,$S2\,$(python3 -c "print(round($S2+$SUPLEN,2))"))[d5];\
   [d5][s3]overlay=0:0:format=auto:enable=between(t\,$S3\,$(python3 -c "print(round($S3+$SUPLEN,2))"))[d6];\
   [d6][s4]overlay=0:0:format=auto:enable=between(t\,$S4\,$(python3 -c "print(round($S4+$SUPLEN,2))")),format=yuv420p[v]" \
  -map "[v]" -an -t "$MID" -c:v libx264 -preset "$PRE" -crf "$CRF" -r "$FPS" "$WORK/seg2.mp4"

# ── 3. cta: webcam full screen + closing super ───────────────────────────────
echo "• 3/5 cta"
"$FF" -y -v error -ss "$OUTRO_START" -t "$OUTRO" -i "$CAM" \
  -loop 1 -framerate "$FPS" -t "$OUTRO" -i "$WORK/gfx/super4.png" -i "$WORK/gfx/watermark.png" \
  -filter_complex "\
   [0:v]$fitv,eq=contrast=1.04:saturation=1.05[base];\
   [1:v]format=rgba,fade=t=in:st=0.4:d=0.5:alpha=1[s];\
   [base][s]overlay=0:0:format=auto[c1];\
   [2:v]format=rgba[wm];[c1][wm]overlay=W-w-40:40:format=auto,format=yuv420p[v]" \
  -map "[v]" -an -c:v libx264 -preset "$PRE" -crf "$CRF" -r "$FPS" "$WORK/seg3.mp4"

# ── 4. end card ──────────────────────────────────────────────────────────────
echo "• 4/5 end card"
"$FF" -y -v error -loop 1 -framerate "$FPS" -t "$END" -i "$WORK/gfx/endcard.png" \
  -filter_complex "[0:v]scale=$W:$H,zoompan=z='min(zoom+0.0005,1.04)':d=1:s=${W}x${H}:fps=$FPS,\
   fade=t=in:st=0:d=0.5,fade=t=out:st=$(python3 -c "print(round($END-0.6,2))"):d=0.6,setsar=1,format=yuv420p[v]" \
  -map "[v]" -an -c:v libx264 -preset "$PRE" -crf "$CRF" -r "$FPS" "$WORK/seg4.mp4"

# ── 5. audio: your webcam voice (cleaned) + optional music bed ───────────────
echo "• 5/5 audio + mux"
AF="highpass=f=85,afftdn=nf=-24,acompressor=threshold=-18dB:ratio=3:attack=12:release=180,\
loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000"
TOTAL=$(python3 -c "print(round($T + $END, 2))")
if [ -n "${MUSIC:-}" ] && [ -f "${MUSIC:-}" ]; then
  "$FF" -y -v error -t "$T" -i "$CAM" -stream_loop -1 -t "$TOTAL" -i "$MUSIC" -filter_complex "\
    [0:a]$AF,apad=whole_dur=$TOTAL[vo];\
    [1:a]volume=${MUSVOL:-0.10},afade=t=out:st=$(python3 -c "print(round($TOTAL-2.0,2))"):d=2[mus];\
    [mus][vo]sidechaincompress=threshold=0.03:ratio=8:attack=5:release=320[duck];\
    [vo][duck]amix=inputs=2:normalize=0,atrim=0:$TOTAL,\
    afade=t=out:st=$(python3 -c "print(round($TOTAL-1.2,2))"):d=1.2,\
    aformat=sample_rates=48000:channel_layouts=stereo[a]" \
    -map "[a]" -c:a aac -b:a 192k "$WORK/audio.m4a"
else
  "$FF" -y -v error -t "$T" -i "$CAM" -filter_complex \
    "[0:a]$AF,apad=whole_dur=$TOTAL,atrim=0:$TOTAL,afade=t=out:st=$(python3 -c "print(round($TOTAL-1.2,2))"):d=1.2,\
     aformat=sample_rates=48000:channel_layouts=stereo[a]" \
    -map "[a]" -c:a aac -b:a 192k "$WORK/audio.m4a"
fi

printf "file '%s'\n" "$WORK/seg1.mp4" "$WORK/seg2.mp4" "$WORK/seg3.mp4" "$WORK/seg4.mp4" > "$WORK/list.txt"
"$FF" -y -v error -f concat -safe 0 -i "$WORK/list.txt" -i "$WORK/audio.m4a" \
  -map 0:v -map 1:a -c:v copy -c:a copy -movflags +faststart "$OUTD/Shivaa-Launch-Video.mp4"

# vertical 9:16 cutdown (optional, VERT=1)
if [ "${VERT:-0}" = "1" ]; then
  echo "• bonus: 9:16 version"
  "$FF" -y -v error -i "$OUTD/Shivaa-Launch-Video.mp4" -filter_complex \
    "[0:v]split=2[bg][fg];[bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=40,eq=brightness=-0.08[b];\
     [fg]scale=1080:-2[f];[b][f]overlay=(W-w)/2:(H-h)/2,setsar=1,format=yuv420p[v]" \
    -map "[v]" -map 0:a -c:v libx264 -preset "$PRE" -crf "$CRF" -c:a copy -movflags +faststart \
    "$OUTD/Shivaa-Launch-Video-9x16.mp4"
fi

echo "✓ $OUTD/Shivaa-Launch-Video.mp4  ($(dur "$OUTD/Shivaa-Launch-Video.mp4")s)"
