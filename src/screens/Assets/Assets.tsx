// Source: secret/Asset Manager v14.dc.html L1040-1169 (isAsset block) — transcribed verbatim.
// Note: assetTab (개요/계좌/목표 sub-tabs) and mapSort (자산 지도 정렬) are computed in the source script
// but never referenced by any markup in this block (confirmed dead code via grep) — this screen is a
// single flat view, not tabbed, and the treemap always sorts by nature. Not invented simplifications.

import { Icon } from '../../components/primitives/Icon/Icon'
import { Card } from '../../components/primitives/Card/Card'
import { Treemap } from '../../components/primitives/Treemap/Treemap'
import { useAppState } from '../../state/AppStateContext'
import { assetCats, getMapBlocks, liquidAmtFmt, liquidPct, lockedAmtFmt, lockedPct } from '../../data/mockAssets'

export function Assets() {
  const { setState } = useAppState()
  const mapBlocks = getMapBlocks((id) => setState({ assetCat: id }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 자산 구성 (메인 카드) */}
      <Card style={{ padding: 26 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
          <div style={{ fontSize: 16, fontWeight: 700, whiteSpace: 'nowrap' }}>자산 구성</div>
          <button
            className="qbtn"
            onClick={() => setState({ quickAddOpen: false, modalOpen: 'addAccount' })}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 14px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'transform .12s' }}
          >
            <Icon name="add" size={16} />
            계좌 추가
          </button>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-mid)', marginBottom: 18 }}>카테고리 블록을 클릭하면 소속 계좌 목록을 확인하고 수정할 수 있어요</div>
        <div className="rgrid-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {assetCats.map((ac) => (
            <button
              key={ac.id}
              className="dkblk-hov"
              onClick={() => setState({ assetCat: ac.id })}
              style={{ textAlign: 'left', cursor: 'pointer', background: 'var(--fill-subtle)', border: '0.5px solid var(--border)', borderRadius: 10, padding: 18, fontFamily: 'inherit', color: 'var(--text-strong)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--surface)', color: ac.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                  <Icon name={ac.icon} size={17} />
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-mid)' }}>{ac.name}</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-.02em' }}>
                {ac.totalFmt}
                <span style={{ fontSize: 12, color: 'var(--text-mid)', fontWeight: 600 }}>원</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-mid)', marginTop: 3 }}>계좌 {ac.count}개</div>
            </button>
          ))}
        </div>
      </Card>

      {/* 자산 분포 + 유동성 뷰 (2단) */}
      <div className="asset-2col" style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 20, alignItems: 'stretch' }}>
        <Card style={{ padding: 26 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
            <div style={{ fontSize: 16, fontWeight: 700, whiteSpace: 'nowrap' }}>자산 분포</div>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-mid)', marginBottom: 18 }}>블록 크기는 금액 비중에 비례합니다 · 5% 미만 항목은 '기타'로 묶여요</div>
          <Treemap blocks={mapBlocks} />
        </Card>

        <Card style={{ padding: 26 }}>
          <div style={{ fontSize: 16, fontWeight: 700, whiteSpace: 'nowrap' }}>유동성 뷰</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-mid)', marginTop: 4 }}>즉시 현금화 가능한 자산과 만기·락업으로 묶여있는 자산의 비중이에요</div>
          <div style={{ display: 'flex', height: 16, borderRadius: 8, overflow: 'hidden', background: 'var(--track)', marginTop: 18 }}>
            <div style={{ width: `${liquidPct}%`, background: 'var(--accent)' }} />
            <div style={{ width: `${lockedPct}%`, background: 'var(--ramp-4)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 18, flex: 1, justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--fill-subtle)', borderRadius: 10, padding: '14px 16px' }}>
              <span style={{ width: 9, height: 9, borderRadius: 4, background: 'var(--accent)', flex: 'none' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>즉시 현금화 가능</div>
                <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 2 }}>파킹통장 등</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{liquidPct}%</div>
                <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 2 }}>{liquidAmtFmt}원</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--fill-subtle)', borderRadius: 10, padding: '14px 16px' }}>
              <span style={{ width: 9, height: 9, borderRadius: 4, background: 'var(--ramp-4)', flex: 'none' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>묶여있음</div>
                <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 2 }}>적금·락업 등</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{lockedPct}%</div>
                <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 2 }}>{lockedAmtFmt}원</div>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '0.5px solid var(--track)', fontSize: 12.5, color: 'var(--text-mid)', display: 'flex', alignItems: 'flex-start', gap: 8, lineHeight: 1.5 }}>
            <Icon name="check_circle" size={17} color="var(--accent)" style={{ flex: 'none' }} />
            <span>
              즉시 현금화 가능 자산은 월 지출 기준 약 47개월치예요 · 카카오뱅크 적금 만기까지 <b>D−167</b>
            </span>
          </div>
        </Card>
      </div>
    </div>
  )
}
