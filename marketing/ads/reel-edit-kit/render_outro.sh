#!/usr/bin/env bash
# Shivaa Jewels — 10s cinematic outro (handoff §10)
#   ./render_outro.sh [EXTERIOR_PHOTO] [OUT.mp4] [VO_AUDIO]
# 0-2s exterior · 2-4s push-in + gold sweep · 4-6s logo card · 6-8s three checks · 8-10s CTA
set -euo pipefail
KIT="$(cd "$(dirname "$0")/.." && pwd)"
EXTERIOR="${1:-$KIT/outro/placeholder-exterior.png}"
OUT="${2:-$KIT/outro/shivaa-jewels-outro-10s.mp4}"
VO="${3:-}"
[ -f "$EXTERIOR" ] || { echo "exterior not found: $EXTERIOR"; exit 1; }
FF="$(command -v ffmpeg || /home/user/vid/bin/python -c 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())' 2>/dev/null || python3 -c 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())')"
S="${SEG:-2.32}"; X=0.4   # segment length / crossfade -> total = 5*S - 4*X = 10.0s default (SEG=3.4 etc. for full-VO cut)
O1=$(awk -v s=$S -v x=$X 'BEGIN{print s-x}'); O2=$(awk -v s=$S -v x=$X 'BEGIN{print 2*(s-x)}')
O3=$(awk -v s=$S -v x=$X 'BEGIN{print 3*(s-x)}'); O4=$(awk -v s=$S -v x=$X 'BEGIN{print 4*(s-x)}')
T=$(awk -v s=$S -v x=$X 'BEGIN{print 5*s-4*x}')   # exact total duration
"$FF" -hide_banner -loglevel warning -y \
  -loop 1 -t $S -i "$EXTERIOR" \
  -loop 1 -t $S -i "$EXTERIOR" \
  -loop 1 -t $S -i "$KIT/outro/sweep.png" \
  -loop 1 -t $S -i "$KIT/outro/logo-card.png" \
  -loop 1 -t $S -i "$KIT/outro/checks-card.png" \
  -loop 1 -t $S -i "$KIT/outro/cta-card.png" \
  ${VO:+-i "$VO"} \
  -filter_complex "\
[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=saturation=1.06:brightness=0.015,fps=30,format=yuv420p[s1];\
[1:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(1+0.08*in/72,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=30[push];\
[2:v]format=rgba,fade=t=in:st=0.3:d=0.5:alpha=1,fade=t=out:st=1.5:d=0.6:alpha=1[sw];\
[push][sw]overlay=x='-700+t*1500':y=-240:enable='between(t,0.3,2.1)',fps=30,format=yuv420p[s2];\
[3:v]scale=1080:1920,fps=30,format=yuv420p[s3];\
[4:v]scale=1080:1920,fps=30,format=yuv420p[s4];\
[5:v]scale=1080:1920,fps=30,format=yuv420p[s5];\
[s1][s2]xfade=transition=fade:duration=$X:offset=$O1[x1];\
[x1][s3]xfade=transition=fade:duration=$X:offset=$O2[x2];\
[x2][s4]xfade=transition=fade:duration=$X:offset=$O3[x3];\
[x3][s5]xfade=transition=fade:duration=$X:offset=$O4[vout]" \
  -map "[vout]" ${VO:+-map 6:a -af apad -c:a aac -b:a 192k} \
  -t $T \
  -c:v libx264 -profile:v high -crf 18 -preset slow -pix_fmt yuv420p -r 30 \
  -movflags +faststart "$OUT"
echo "[done] $OUT"
