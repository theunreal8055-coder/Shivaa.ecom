#!/usr/bin/env bash
# Rebuild the v183 responsive hero/carousel assets from the unchanged source JPGs.
# Requires ImageMagick with WebP support (`convert -list format | grep WEBP`).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BANNERS="$ROOT/cms/images/banners"

make_desktop_webp() {
  local base="$1"
  convert "$BANNERS/$base.jpg" -strip -quality 84 -define webp:method=6 "$BANNERS/$base.webp"
}

make_mobile() {
  local base="$1" crop="$2"
  # crop is source-pixel geometry: WIDTHxHEIGHT+X+Y, art-directed per image.
  convert "$BANNERS/$base.jpg" -crop "$crop" +repage -resize '640x800!' -strip -quality 86 -interlace Plane "$BANNERS/$base-mobile.jpg"
  convert "$BANNERS/$base.jpg" -crop "$crop" +repage -resize '640x800!' -strip -quality 84 -define webp:method=6 "$BANNERS/$base-mobile.webp"
}

# Desktop WebP companions; original JPEGs remain the no-WebP fallback.
for base in hero-main poster-heritage poster-bridal poster-everyday wedding; do
  make_desktop_webp "$base"
done

# Mobile crops keep the jewellery focal point in frame rather than shrinking
# the wide desktop composition. Gold Biscuit campaign art is deliberately not included.
make_mobile hero-main         '538x672+720+0'
make_mobile poster-heritage   '538x672+840+0'
make_mobile poster-bridal    '614x768+670+0'
make_mobile poster-everyday  '614x768+630+0'
make_mobile wedding          '614x768+620+0'

printf 'Generated v183 banner assets:\n'
for f in "$BANNERS"/hero-main.webp "$BANNERS"/hero-main-mobile.{jpg,webp} \
         "$BANNERS"/poster-heritage.webp "$BANNERS"/poster-heritage-mobile.{jpg,webp} \
         "$BANNERS"/poster-bridal.webp "$BANNERS"/poster-bridal-mobile.{jpg,webp} \
         "$BANNERS"/poster-everyday.webp "$BANNERS"/poster-everyday-mobile.{jpg,webp} \
         "$BANNERS"/wedding.webp "$BANNERS"/wedding-mobile.{jpg,webp}; do
  identify -format '%f %wx%h %b\n' "$f"
done
