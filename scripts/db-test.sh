#!/bin/sh
# 로컬 Supabase 스택에서 마이그레이션을 처음부터 다시 올리고 pgTAP 테스트를 돌린다.
# 운영 DB 에는 아무 영향이 없다 (supabase db push 를 쓰지 않는다).
#
#   scripts/db-test.sh            전체: db reset → 테스트 픽스처 로드 → supabase/tests/*.sql
#   scripts/db-test.sh --no-reset 리셋 없이 마이그레이션 재적용(멱등) + 픽스처 + 테스트
#   scripts/db-test.sh --no-reset supabase/tests/03_accounts_assets_test.sql   한 파일만
set -eu
cd "$(dirname "$0")/.."

PSQL="docker exec -i supabase_db_asset-front psql -U postgres -d postgres -X -q -v ON_ERROR_STOP=1"

if [ "${1:-}" = "--no-reset" ]; then
  shift
  # 000009 부터는 000003·000007 의 함수를 덮어쓰므로 그 뒤에 함께 다시 올린다(000008 은 확장을 지우고 다시 만들어 제외)
  for f in supabase/migrations/2026102[34]*.sql supabase/migrations/2026103000000[9]_*.sql supabase/migrations/2026103000001[0-9]_*.sql; do
    echo "re-apply $f"
    $PSQL < "$f"
  done
else
  supabase db reset
fi

echo "load supabase/fixtures/test_fixture.sql"
$PSQL < supabase/fixtures/test_fixture.sql

supabase test db --local "${@:-supabase/tests}"
