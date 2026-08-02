#!/bin/bash
INPUT=$(cat)
if [ "$(echo "$INPUT" | jq -r '.stop_hook_active')" = "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR" || exit 0
if [ -z "$(git status --porcelain)" ]; then
  exit 0
fi

BUILD_OUT=$(pnpm build 2>&1)
if [ $? -ne 0 ]; then
  echo "빌드 실패 — 아래 오류를 고친 뒤에 마무리하세요:
$BUILD_OUT" >&2
  exit 2
fi

LINT_OUT=$(pnpm lint 2>&1)
if [ $? -ne 0 ]; then
  echo "린트 실패 — 아래 오류를 고친 뒤에 마무리하세요:
$LINT_OUT" >&2
  exit 2
fi

exit 0
