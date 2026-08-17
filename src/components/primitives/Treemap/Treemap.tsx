// Source: secret/Asset Manager v14.dc.html L1079-1124 (자산 지도 treemap blocks) — transcribed verbatim.
// .tmap-block hover scale/brightness lives in base.css.
//
// 원본에 있던 hover 툴팁(mapTipHover, L4559)은 제거했다 — 블록에 이미 이름·비중·금액이 그대로 적혀
// 있어 툴팁이 같은 정보를 한 번 더 보여줄 뿐이었고, 좁은 블록에서는 블록 폭에 갇혀 글자가 한 자씩
// 세로로 접혀 읽을 수 없었다(실기 지적으로 삭제). 그래서 perf/perfAmt·subs도 화면에 쓰이지 않는다 —
// 타입에는 남겨두었지만 렌더에는 관여하지 않는다.
//
// 렌더 티어도 함께 단순해졌다: 예전의 icon 티어(<6%)는 아이콘 하나만 띄워 무슨 자산인지 알 수 없었으므로,
// 이제 모든 블록이 이름과 비중을 보여주고 금액만 넓은 블록(showHeader)에서 추가로 보여준다.

export interface TreemapBlock {
  id: string
  label: string
  icon: string
  amtFmt: string
  pct: number
  widthPct: number
  tint: string
  fg: string
  accent: string
  showHeader: boolean
  showIconOnly: boolean
  cursor: 'pointer' | 'default'
  isEtc?: boolean
  subs?: string[]
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
        // minWidth는 가장 좁은 블록에도 자산군 이름(4~5글자)이 가로로 들어가는 최소치다. 예전 값(56px)은
        // 이름이 들어갈 수 없어 아이콘만 띄웠는데, 그 아이콘만으로는 무슨 자산인지 알 수 없었다(실기 지적).
        position: 'relative', flexGrow: b.widthPct, flexBasis: 0, minWidth: 92, borderRadius: 10,
        background: b.tint, padding: '12px 10px', display: 'flex', flexDirection: 'column', overflow: 'hidden', cursor: b.cursor,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
        <div style={{ fontSize: b.showHeader ? 16 : 13, fontWeight: 700, color: b.fg, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
          {b.label}
        </div>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: b.fg, opacity: 0.6 }}>{b.pct}%</div>
      </div>
      {/* 금액은 폭과 무관하게 항상 보여주고, 좁으면 말줄임(87,60…)으로 잘린다 — 아예 감추는 것보다
          자릿수만이라도 보이는 편이 낫다는 판단(실기 요청). 예전에는 이 자리에 hover 툴팁으로 이름·비중·
          금액을 한 번 더 띄웠는데, 블록에 이미 같은 정보가 있어 중복인 데다 좁은 블록에서는 글자가 세로로
          접혀 오히려 방해였다. */}
      <div style={{ fontSize: b.showHeader ? 13.5 : 12.5, fontWeight: 700, color: b.fg, marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {b.amtFmt}원
      </div>
    </div>
  )
}

export function Treemap({ blocks }: { blocks: TreemapBlock[] }) {
  return (
    <div style={{ display: 'flex', gap: 8, flex: 1, minHeight: 236 }}>
      {blocks.map((b) => (
        <TreemapTile key={b.id} b={b} />
      ))}
    </div>
  )
}
