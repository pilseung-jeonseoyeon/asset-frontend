// Source: secret/Asset Manager v14.dc.html L952-966 (Dashboard 자산 구성 비율 donut) — transcribed
// verbatim (size 126px, viewBox 0 0 42 42, r=15.915, stroke-width 7). ds_rules_v2_5.md §3-4 caps donuts
// at exactly 2 locations app-wide (Dashboard asset composition, Stocks sector composition) — do not add
// a 3rd usage of this component anywhere else in the app.
// stroke-dasharray/-dashoffset are derived mechanically from each segment's percentage (this is how the
// single confirmed instance already encodes rank 1-6: 23/22/19/18/11/7 → dasharray "{pct} {100-pct}",
// cumulative negative dashoffset) — not an invented visual behavior, just parametrizing the one instance.

interface DonutSegment {
  pct: number
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
        cumulative += seg.pct
        return (
          <circle
            key={i}
            cx="21"
            cy="21"
            r="15.915"
            fill="none"
            style={{ stroke: seg.color }}
            strokeWidth="7"
            strokeDasharray={`${seg.pct} ${100 - seg.pct}`}
            strokeDashoffset={offset}
            transform="rotate(-90 21 21)"
          />
        )
      })}
    </svg>
  )
}
