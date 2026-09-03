#!/usr/bin/env bash
# iOS 홈 화면 앱 시작 화면(스플래시) PNG를 기종별로 뽑는다. 저장소 루트에서 `pnpm dev`를 띄운 채 실행:
#   bash scripts/splash/generate.sh
# 결과는 public/pwa/splash/ 에 쌓이고, 마지막에 index.html에 붙여 넣을 <link> 태그를 출력한다.
# 기종을 더하거나 빼면 아래 SIZES와 index.html의 태그를 같이 고칠 것.
#
# SIZES 한 줄 = "CSS너비 CSS높이 픽셀비율" (세로 방향만 — 이 앱은 모바일 가로 모드를 따로 다루지 않는다).
# iOS는 이 세 값이 정확히 일치하는 이미지만 쓴다. 값은 아이폰 8 ~ 17 시리즈 기준(2026-09).
set -euo pipefail

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
BASE="${SPLASH_BASE_URL:-http://localhost:5173}/scripts/splash/index.html"
OUT="public/pwa/splash"
mkdir -p "$OUT"

SIZES=(
  "440 956 3"   # 16 Pro Max / 17 Pro Max
  "402 874 3"   # 16 Pro / 17 / 17 Pro
  "430 932 3"   # 14 Pro Max / 15 Plus / 15 Pro Max / 16 Plus
  "393 852 3"   # 14 Pro / 15 / 15 Pro / 16
  "428 926 3"   # 12 Pro Max / 13 Pro Max / 14 Plus
  "390 844 3"   # 12 / 12 Pro / 13 / 13 Pro / 14 / 16e
  "375 812 3"   # X / XS / 11 Pro / 12 mini / 13 mini
  "414 896 3"   # XS Max / 11 Pro Max
  "414 896 2"   # XR / 11
  "375 667 2"   # 7 / 8 / SE 2·3
  "414 736 3"   # 7 Plus / 8 Plus
  "420 912 3"   # Air
)

LINKS=""
for entry in "${SIZES[@]}"; do
  read -r w h r <<<"$entry"
  pw=$((w * r)); ph=$((h * r))
  for mode in light dark; do
    dark=0; [ "$mode" = dark ] && dark=1
    file="$OUT/splash-${pw}x${ph}-${mode}.png"
    "$CHROME" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
      --window-size="${pw},${ph}" --virtual-time-budget=1000 \
      --screenshot="$file" "${BASE}?scale=${r}&dark=${dark}" 2>/dev/null
    echo "wrote $file"
    scheme=""; [ "$mode" = dark ] && scheme=" and (prefers-color-scheme: dark)"
    LINKS+="    <link rel=\"apple-touch-startup-image\" href=\"/pwa/splash/splash-${pw}x${ph}-${mode}.png\" media=\"screen and (device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)${scheme}\" />"$'\n'
  done
done

echo
echo "----- index.html <head>에 붙여 넣을 태그 -----"
printf '%s' "$LINKS"
