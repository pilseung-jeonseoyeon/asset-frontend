#!/bin/bash
cd "$CLAUDE_PROJECT_DIR" || exit 0

if [ -n "$(git status --porcelain)" ]; then
  echo "참고: 로컬에 아직 커밋되지 않은 변경 사항이 있어서 git pull을 건너뛰었습니다. 작업을 시작하기 전에 사용자에게 이 사실을 쉬운 말로 알려주세요."
else
  if ! git pull --ff-only 2>&1; then
    echo "참고: git pull이 실패했습니다 (원격과 히스토리가 갈라졌을 수 있음). 사용자에게 쉬운 말로 상황을 알리고, 직접 git 명령을 실행하기보다 먼저 원인을 설명하세요."
  fi
fi

if [ ! -d node_modules ] || [ package.json -nt node_modules ] || [ pnpm-lock.yaml -nt node_modules ]; then
  INSTALL_OUT=$(pnpm install 2>&1)
  if [ $? -ne 0 ]; then
    echo "참고: 의존성 설치(pnpm install)에 실패했습니다. 사용자에게 알리고 원인을 함께 확인하세요:
$INSTALL_OUT"
  else
    echo "참고: 새로 추가되거나 바뀐 패키지를 자동으로 설치했습니다 (pnpm install)."
  fi
fi

exit 0
