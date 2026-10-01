#!/usr/bin/env bash
# SHIVAA — compress footage for GitHub upload (macOS / Linux)
# Put webcam.mp4 and screen.mp4 next to this script, then:  bash compress-for-upload.sh
set -e
cd "$(dirname "$0")"
command -v ffmpeg >/dev/null || { echo "installing ffmpeg..."; brew install ffmpeg 2>/dev/null || sudo apt-get install -y ffmpeg; }
mkdir -p upload
[ -f webcam.mp4 ] && { echo "[1/2] webcam..."; ffmpeg -y -i webcam.mp4 -vf "scale=-2:1080,fps=30" -c:v libx264 -crf 26 -preset veryfast -c:a aac -b:a 128k upload/webcam.mp4; } || echo "[1/2] webcam.mp4 missing - skipped"
[ -f screen.mp4 ] && { echo "[2/2] screen..."; ffmpeg -y -i screen.mp4 -vf "scale=-2:1080,fps=30" -c:v libx264 -crf 28 -preset veryfast -an upload/screen.mp4; } || echo "[2/2] screen.mp4 missing - skipped"
echo; ls -lh upload/*.mp4
echo; echo "Now upload these to GitHub -> media/ on branch arena/01a0d958-shivaa-ecom"
