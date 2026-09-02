// 도넛 차트(126px, viewBox 0 0 42 42, r=15.915, stroke-width 7).
// ds_rules_v2_5.md §3-4가 앱 전체에서 도넛을 정확히 두 곳으로 제한한다(대시보드 자산 구성 비율,
// 주식 섹터 구성) — 세 번째 사용처를 만들지 말 것.
// stroke-dasharray/-dashoffset은 조각별 비중에서 기계적으로 계산한다
// (dasharray는 '{비중} {100-비중}', dashoffset은 앞 조각들의 누적값을 음수로).

interface DonutSegment {
  percent: number
  color: string // e.g. 'var(--ramp-1)'
}

interface DonutChartProps {
  segments: DonutSegment[]
  size?: number
}

export function DonutChart({ segments, size = 126 }: DonutChartProps) {
  let cumulative = 0
  return (
    <svg width={size} height={size} viewBox="0 0 42 42" style={{ flex: 'none' }}>
      <circle cx="21" cy="21" r="15.915" fill="none" style={{ stroke: 'var(--track)' }} strokeWidth="7" />
      {segments.map((seg, i) => {
        const offset = -cumulative
        cumulative += seg.percent
        return (
          <circle
            key={i}
            cx="21"
            cy="21"
            r="15.915"
            fill="none"
            style={{ stroke: seg.color }}
            strokeWidth="7"
            strokeDasharray={`${seg.percent} ${100 - seg.percent}`}
            strokeDashoffset={offset}
            transform="rotate(-90 21 21)"
          />
        )
      })}
    </svg>
  )
}
