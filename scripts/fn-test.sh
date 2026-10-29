#!/bin/sh
# Edge Function(Deno) 단위 테스트. 이 맥에 Deno 를 설치하지 않고 도커 이미지로 돌린다.
#   scripts/fn-test.sh                      supabase/functions 전체
#   scripts/fn-test.sh _shared/guard_test.ts 한 파일만
# npm/jsr 의존성은 도커 볼륨(monit-deno-cache)에 캐시된다.
set -eu
cd "$(dirname "$0")/../supabase/functions"
docker run --rm -t \
  -v "$PWD:/work" -w /work \
  -v monit-deno-cache:/deno-dir -e DENO_DIR=/deno-dir \
  denoland/deno:2.1.4 \
  test --allow-env --allow-net --allow-read "${@:-.}"
