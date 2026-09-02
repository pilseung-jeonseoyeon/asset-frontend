// 자산 지도(트리맵) 블록. hover scale/brightness는 .tmap-block(src/styles/base.css).
//
// hover 툴팁은 없다 — 블록에 이름·비중·금액이 이미 적혀 있어 같은 정보를 한 번 더 보여줄 뿐이었고,
// 좁은 블록에서는 글자가 한 자씩 세로로 접혀 읽을 수 없었다. 그래서 perf/perfAmt·subLabels도 화면에
// 쓰이지 않는다 — 타입에는 남아 있지만 렌더에는 관여하지 않는다.
//
// 모든 블록이 이름과 비중을 보여주고, 금액은 넓은 블록(showHeader)에서만 덧붙인다.

import { useIsMobile } from '../../../utils/useMediaQuery'

export interface TreemapBlock {
  id: string
  label: string
  icon: string
  amountText: string
  percent: number
  widthPercent: number
  tint: string
  fg: string
  accent: string
  showHeader: boolean
  showIconOnly: boolean
  cursor: 'pointer' | 'default'
  isEtc?: boolean
  subLabels?: string[]
  perf?: string
  perfAmt?: string
  open?: () => void
}

function TreemapTile({ b }: { b: TreemapBlock }) {
  return (
    <div
      className="tmap-block"
      onClick={b.open}
      style={{
        // minWidth는 가장 좁은 블록에도 자산군 이름(4~5글자)이 가로로 들어가는 최소치다. 이보다 좁으면
        // 이름이 들어가지 못해 아이콘만 남는데, 아이콘만으로는 무슨 자산인지 알 수 없다.
        position: 'relative', flexGrow: b.widthPercent, flexBasis: 0, minWidth: 92, borderRadius: 10,
        background: b.tint, padding: '12px 10px', display: 'flex', flexDirection: 'column', overflow: 'hidden', cursor: b.cursor,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
        <div style={{ fontSize: b.showHeader ? 16 : 13, fontWeight: 700, color: b.fg, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
          {b.label}
        </div>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: b.fg, opacity: 0.6 }}>{b.percent}%</div>
      </div>
      {/* 금액은 폭과 무관하게 항상 보여주고, 좁으면 말줄임(87,60…)으로 잘린다 — 아예 감추는 것보다
          자릿수만이라도 보이는 편이 낫다는 판단(실기 요청). 예전에는 이 자리에 hover 툴팁으로 이름·비중·
          금액을 한 번 더 띄웠는데, 블록에 이미 같은 정보가 있어 중복인 데다 좁은 블록에서는 글자가 세로로
          접혀 오히려 방해였다. */}
      <div style={{ fontSize: b.showHeader ? 13.5 : 12.5, fontWeight: 700, color: b.fg, marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {b.amountText}원
      </div>
    </div>
  )
}

/** 데스크톱 블록 높이. */
const TREEMAP_MIN_HEIGHT = 236
/**
 * 모바일 블록 높이(사용자 요청). 이 트리맵은 **가로 폭만 비중에 비례**하고 높이는 모든
 * 블록이 똑같으므로, 높이를 줄여도 잃는 정보가 없다 — 좁은 화면에서 236px는 세로 공간만 크게
 * 잡아먹었다. 값은 블록 안 내용(이름 17 + 비중 14 + 간격 1 + 금액 17 + 위 여백 6 + 상하 padding 24
 * ≈ 79px)이 눌리지 않는 선에서 잡았다.
 */
const TREEMAP_MIN_HEIGHT_MOBILE = 140

export function Treemap({ blocks }: { blocks: TreemapBlock[] }) {
  const isMobile = useIsMobile()

  return (
    <div style={{ display: 'flex', gap: 8, flex: 1, minHeight: isMobile ? TREEMAP_MIN_HEIGHT_MOBILE : TREEMAP_MIN_HEIGHT }}>
      {blocks.map((b) => (
        <TreemapTile key={b.id} b={b} />
      ))}
    </div>
  )
}
