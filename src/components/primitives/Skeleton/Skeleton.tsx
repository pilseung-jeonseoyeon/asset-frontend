// 로딩 자리표시(스켈레톤) 막대. ds_rules_v2_5.md에는 로딩 표현 규정이 없어(확인함) 기존 토큰만으로
// 만든다 — 색은 var(--border) ↔ var(--track) 사이를 오가는 그라디언트 한 겹이라 라이트/다크 모두
// 카드 배경(var(--fill-subtle)/var(--surface)) 위에서 읽힌다. 애니메이션 정의와 접근성 예외
// (prefers-reduced-motion)는 src/styles/base.css의 `.skeleton` 규칙에 있다.
//
// 이 컴포넌트는 "값이 들어올 자리의 모양"만 그린다 — 실제 콘텐츠와 같은 높이·폭을 넘겨야 데이터가
// 도착했을 때 레이아웃이 튀지 않는다(그게 스켈레톤을 쓰는 이유다). 스크린리더에는 의미 없는 장식이라
// aria-hidden으로 감추고, "로딩 중"이라는 사실은 바깥 컨테이너의 aria-busy가 알린다.

import type { CSSProperties } from 'react'

interface SkeletonProps {
  /** 숫자면 px, 문자열이면 그대로(기본 '100%'). */
  width?: number | string
  height?: number
  /** 모서리 반경. 텍스트 자리표시는 기본값(6)이 자연스럽고, 아이콘 타일 자리는 8~10을 넘긴다. */
  radius?: number
  style?: CSSProperties
}

export function Skeleton({ width = '100%', height = 12, radius = 6, style }: SkeletonProps) {
  return (
    <span
      className="skeleton"
      aria-hidden
      style={{ display: 'block', width, height, borderRadius: radius, flex: 'none', ...style }}
    />
  )
}
