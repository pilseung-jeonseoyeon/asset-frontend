// 계좌 추가 모달(AddAccountModal)의 "보유 종목/코인" 반복 입력 블록. 주식·가상자산 두 유형에서만 쓴다.
//
// **한 계좌에 국내·해외 종목을 섞어 담는다**(2026-08-27, 서버가 DOMESTIC_STOCK/FOREIGN_STOCK을
// STOCK 하나로 합친 데 맞춤): 시장은 계좌가 아니라 **고른 종목**이 정하므로, prop은 Market 하나가
// 아니라 "이 계좌가 담을 수 있는 시장 목록"(markets)이고 담긴 줄마다 자기 market을 들고 있다.
// 그래서 수량 단위(주/개)와 평단가 통화(₩/$)도 블록 전체가 아니라 줄 단위로 갈린다 — 삼성전자 줄은
// ₩, 애플 줄은 $로 같은 리스트 안에 나란히 있을 수 있다.
//
// 여기 담은 값은 부모(AddAccountModal)가 CreateAccountRequest.holdings로 계좌와 **한 요청에** 실어
// 보낸다(2026-08-20 백엔드 계약 추가). 서버가 각 줄을 등록일 체결 BUY 매매로 기록하므로 등록 직후
// 주식 화면에 그대로 나타난다. 최대 100건(OpenAPI maxItems).
//
// 평균단가의 단위는 **원화가 아니라 종목 표시 통화**다 — US는 달러, KR과 CRYPTO는 원화. 서버가
// 그대로 평단가로 받으므로 여기서 환율을 곱하면 안 된다(CreateAccountHoldingReq.price 설명).
// 시장이 섞이면서 이 규칙이 줄마다 달라졌으니, market을 블록 어딘가에 한 번 계산해두고 재사용하는
// 식으로 되돌리지 말 것 — 그 순간 애플 평단가가 원화로 저장된다.
//
// 검색 자체는 QuickStockModal.tsx L332-380의 흐름을 그대로 따른다(GET /stocks?keyword= → 결과를
// market으로 거름). 다만 **결과 목록은 인라인 블록이 아니라 팝오버로 띄운다**(2026-08-20, 사용자 지적
// — "select box는 한 5개로 하고, 모달이 늘어나는 게 아니라 저게 스크롤되게, 레이어 밖으로"): 인라인으로
// 펼치면 검색 결과 수만큼 모달 자체가 길어져 모달에 스크롤이 걸리고, 결과를 보려면 모달을 스크롤해야
// 한다. Dropdown/DatePicker가 이미 쓰는 usePopoverAnchor로 트리거의 화면 좌표에 position:fixed로
// 앵커링하면 조상의 overflow 클리핑(모달 패널의 overflow:auto)을 벗어나 모달 밖으로 떠 있을 수 있다
// — Dropdown.tsx 헤더 주석이 같은 지적으로 데스크톱까지 fixed로 바꾼 것과 같은 이유·같은 해법이다.
// 목록 높이는 5행으로 묶고 그 안에서만 스크롤한다.
//
// QuickStockModal에 있는 "새 종목으로 등록"(POST /stocks) 진입점은 아직 여기 두지 않는다 — 마스터에
// 없는 종목은 먼저 등록해야 stockId를 얻을 수 있으므로(없는 id면 404 STOCK_NOT_FOUND) 언젠가는
// 필요하지만, 계좌 등록 폼 한가운데서 종목 마스터를 만드는 흐름은 별도 확인 후에 붙인다.
//
// CRYPTO 평단가를 달러로 받으면 안 된다 — 서버 시세 수집이 업비트 원화 마켓에 고정돼 있어 환율이
// 이중으로 곱해진다(src/data/stocksView.ts marketToCurrency 주석, 2026-08-15 백엔드 확정).

import { useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { POPOVER_VIEWPORT_MARGIN, usePopoverAnchor } from '../../../components/primitives/usePopoverAnchor'
import { stopPropagation } from '../../../state/selectors/modal'
import { useIsMobile } from '../../../utils/useMediaQuery'
import { formatNumber, parseAmount, sanitizeDecimalInput } from '../../../utils/format'
import { useGetStocks } from '@/services/stock'
import type { Market } from '@/services/common.type'

/** 저장 버튼을 누를 때 CreateAccountRequest.holdings로 변환되는 입력값 — 파일 상단 주석 참고. */
export interface DraftHolding {
  /**
   * 이 줄만의 로컬 식별자. **stockId로 줄을 구분하면 안 된다** — 같은 종목을 평단가를 나눠 두 줄로
   * 담는 것을 일부러 허용하기 때문에(아래 검색 결과의 '담음' 배지 주석 참고) stockId는 줄마다
   * 유일하지 않다. 예전에 리스트 key와 삭제 필터가 stockId 기준이라, 한 줄을 지우면 같은 종목의
   * 다른 줄까지 함께 사라졌다(2026-08-20 수정). 서버로는 나가지 않는 화면 전용 값이다.
   */
  uid: string
  stockId: number
  stockName: string
  ticker: string
  /** 원시 입력 문자열. 코인은 소수 수량이 흔해 소수점 8자리까지 받는다. */
  quantityStr: string
  /** 원시 입력 문자열. 단위는 시장에서 파생된다(US만 달러). */
  avgPriceStr: string
  /**
   * 고른 종목의 시장. 서버로는 나가지 않지만(매매·보유 등록은 stockId로 시장을 알아낸다) 이 줄의
   * 수량 단위와 평단가 통화를 결정하므로 줄에 붙여둔다 — 계좌 유형에서 다시 유추할 수 없다.
   */
  market: Market
}

const LABEL_STYLE: CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }
const FIELD_BORDER_STYLE: CSSProperties = { border: '0.5px solid var(--border)', borderRadius: 10, padding: '13px 16px' }
const BARE_INPUT_STYLE: CSSProperties = {
  border: 'none', outline: 'none', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit',
  width: '100%', color: 'var(--text-strong)',
}
const HINT_STYLE: CSSProperties = { fontSize: 11.5, color: 'var(--text-weak)', marginTop: 8, lineHeight: 1.6 }
const ERROR_STYLE: CSSProperties = { fontSize: 11.5, color: 'var(--down)', marginTop: 6 }
// 담긴 종목이 이 개수를 넘으면 리스트 자체에 세로 스크롤을 준다(모달 전체가 아니라 리스트만) —
// Dropdown의 maxHeight와 같은 관례. 그 아래에서는 스크롤을 켜지 않는다: 모달 스크롤과 리스트 스크롤이
// 중첩되면 모바일에서 어느 쪽이 움직이는지 헷갈린다.
const LIST_SCROLL_AFTER = 5
const LIST_ROW_HEIGHT = 48
// 검색 결과 팝오버는 5행까지만 보여주고 그 안에서 스크롤한다. 행 높이는 모바일에서 터치 최소치(44px)로
// 커지므로 함께 갈라준다(docs/mobile.md §5). +12는 패널 자체의 위아래 padding 6px씩.
/** 서버가 한 요청에 받는 보유 종목 상한(OpenAPI CreateAccountReq.holdings maxItems). */
const MAX_HOLDINGS = 100
const RESULT_ROWS = 5
function resultsMaxHeight(isMobile: boolean): number {
  return RESULT_ROWS * (isMobile ? 44 : 38) + 12
}

// 담은 줄의 로컬 식별자. 모듈 전역 카운터라 모달을 닫았다 열어도 값이 겹치지 않는다(리스트 key로만
// 쓰이므로 새로고침 뒤 1부터 다시 시작해도 무방하다). Math.random/crypto를 쓰지 않는 이유는 같은
// 입력에 대해 결과가 항상 같아야 나중에 회귀 테스트를 붙이기 쉽기 때문이다.
let holdingUidSeq = 0
function nextHoldingUid(): string {
  holdingUidSeq += 1
  return `h${holdingUidSeq}`
}

function unitLabel(market: Market): string {
  return market === 'CRYPTO' ? '개' : '주'
}

function priceLabel(market: Market, raw: string): string {
  const n = Number(raw) || 0
  return market === 'US' ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${formatNumber(n)}원`
}

/** 검색 결과에서 국내/해외를 구분해주는 짧은 배지 문구. 시장이 하나뿐인 계좌에서는 쓰지 않는다. */
function marketBadge(market: Market): string {
  return market === 'US' ? '해외' : market === 'KR' ? '국내' : '코인'
}

interface Props {
  /**
   * 이 계좌가 담을 수 있는 시장 목록(주식 계좌는 ['KR','US'], 가상자산 계좌는 ['CRYPTO']).
   * 검색 결과의 범위만 정하고, 개별 줄의 통화·단위는 그 줄의 종목이 정한다.
   */
  markets: Market[]
  /** 모달이 열려 있고 이 유형일 때만 검색 요청을 보낸다. */
  enabled: boolean
  items: DraftHolding[]
  onChange: (items: DraftHolding[]) => void
  /** 리스트 아래 안내 문구. 생략하면 계좌 등록 기준 문구("오늘 산 것으로 기록돼요")를 쓴다 —
   *  체결일을 직접 고르는 호출부(AddHoldingsModal)는 그 문구가 사실과 달라 직접 넘긴다. */
  hint?: ReactNode
}

export function AccountHoldingsField({ markets, enabled, items, onChange, hint }: Props) {
  // 코인 계좌는 시장이 CRYPTO 하나뿐이다 — 주식 계좌(KR·US)와 섞이는 경우가 없어 블록 단위 문구
  // (제목·플레이스홀더)는 이 판정 하나로 충분하다. 금액 단위는 여기서 정하지 않는다(줄 단위).
  const isCrypto = markets.length > 0 && markets.every((m) => m === 'CRYPTO')
  const showMarketBadge = markets.length > 1
  const heading = isCrypto ? '보유 코인' : '보유 종목'
  const isMobile = useIsMobile()

  // 검색어를 지운 채로도 목록을 부르지 않도록 keyword가 비면 요청 자체를 끈다. 종목을 고르는 중
  // (pending)에는 결과 목록을 감추므로 요청도 함께 멈춘다.
  const [keyword, setKeyword] = useState('')
  // 팝오버를 배경 클릭으로 닫은 뒤에도 검색어는 남는다 — 그래서 "검색어가 있다"와 "목록이 열려 있다"를
  // 따로 들고, 입력칸을 다시 누르면 열린다.
  const [resultsOpen, setResultsOpen] = useState(false)
  const [pending, setPending] = useState<{ stockId: number; stockName: string; ticker: string; market: Market } | null>(null)
  const [quantityStr, setQuantityStr] = useState('')
  const [avgPriceStr, setAvgPriceStr] = useState('')
  // 확정("추가") 버튼을 눌렀을 때만 계산한다 — 입력 도중 빨간 문구가 앞서 뜨지 않게 하는 이 저장소의
  // 검증 관례(AddAccountModal의 nameInvalid와 같은 톤).
  const [rowError, setRowError] = useState<string | null>(null)

  const showResults = resultsOpen && !pending && !!keyword.trim()
  const searchQuery = useGetStocks(keyword, { enabled: enabled && showResults })
  const results = searchQuery.stocks.filter((s) => markets.includes(s.market))
  const addedIds = new Set(items.map((h) => h.stockId))

  // 팝오버가 위로 열릴지 아래로 열릴지는 패널의 실측 높이로 정한다(Dropdown.tsx와 같은 이유 — 훅의
  // 기본 상수 160px는 5행 목록의 실제 높이보다 작아서, 아래로 열어도 된다고 판단해놓고 마지막 행이
  // 잘리는 경우가 생긴다). scrollHeight는 overflow로 잘려 있어도 잘리기 전 전체 높이를 돌려준다.
  const panelRef = useRef<HTMLDivElement>(null)
  const [naturalHeight, setNaturalHeight] = useState<number | undefined>(undefined)
  const cap = resultsMaxHeight(isMobile)
  useLayoutEffect(() => {
    if (!showResults) {
      setNaturalHeight(undefined)
      return
    }
    const el = panelRef.current
    if (el) setNaturalHeight(Math.min(el.scrollHeight, cap))
  }, [showResults, results.length, isMobile, cap])

  const anchor = usePopoverAnchor(showResults, naturalHeight)
  const panelMaxHeight = anchor.maxHeight !== undefined ? Math.min(cap, anchor.maxHeight) : cap
  // 데스크톱은 트리거(검색 입력칸)와 같은 폭으로, 모바일은 anchor.style의 풀블리드로 띄운다 —
  // Dropdown.tsx의 desktopFixedStyle과 같은 계산이다.
  const triggerWidth = anchor.rect ? anchor.rect.right - anchor.rect.left : 0
  const desktopFixedStyle: CSSProperties | undefined = !isMobile && anchor.rect && anchor.style
    ? {
        position: 'fixed',
        left: Math.max(POPOVER_VIEWPORT_MARGIN, Math.min(anchor.rect.left, window.innerWidth - triggerWidth - POPOVER_VIEWPORT_MARGIN)),
        right: 'auto',
        width: triggerWidth,
        top: anchor.style.top,
        bottom: anchor.style.bottom,
      }
    : undefined

  const resetRow = () => {
    setPending(null)
    setQuantityStr('')
    setAvgPriceStr('')
    setRowError(null)
  }

  const commitRow = () => {
    if (!pending) return
    const quantity = Number(quantityStr) || 0
    // 서버 규칙: 수량은 0 초과(0이면 400), 평단가는 0 이상이라 0도 허용된다. 그래서 "0을 적었다"와
    // "비워뒀다"를 구분해, 비워둔 경우만 막는다.
    if (quantity <= 0) {
      setRowError('수량을 입력해주세요')
      return
    }
    if (avgPriceStr === '') {
      setRowError('평균단가를 입력해주세요')
      return
    }
    if (items.length >= MAX_HOLDINGS) {
      setRowError(`한 번에 ${MAX_HOLDINGS}개까지 담을 수 있어요`)
      return
    }
    onChange([...items, { uid: nextHoldingUid(), ...pending, quantityStr, avgPriceStr }])
    resetRow()
    setKeyword('')
    setResultsOpen(false)
  }

  return (
    <div>
      <div style={{ ...LABEL_STYLE, display: 'flex', alignItems: 'center', gap: 6 }}>
        {heading}
        {items.length > 0 && <span style={{ color: 'var(--text-weak)', fontWeight: 700 }}>{items.length}</span>}
      </div>

      {items.length > 0 && (
        <div
          style={{
            border: '0.5px solid var(--border)', borderRadius: 10, marginBottom: 10,
            // 5줄까지는 그대로 늘어나고, 그 뒤부터만 리스트 안에서 스크롤한다.
            ...(items.length > LIST_SCROLL_AFTER
              ? { maxHeight: LIST_SCROLL_AFTER * LIST_ROW_HEIGHT, overflowY: 'auto' as const }
              : {}),
          }}
        >
          {items.map((h, i) => (
            <div
              key={h.uid}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '0 6px 0 14px', minHeight: LIST_ROW_HEIGHT,
                borderTop: i === 0 ? 'none' : '0.5px solid var(--border)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {h.stockName} <span style={{ color: 'var(--text-weak)', fontWeight: 600 }}>{h.ticker}</span>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 2 }}>
                  {/* 단위·통화는 블록이 아니라 이 줄의 종목이 정한다 — 한 리스트에 ₩ 줄과 $ 줄이 섞인다. */}
                  {h.quantityStr}{unitLabel(h.market)} · {priceLabel(h.market, h.avgPriceStr)}
                  {showMarketBadge && ` · ${marketBadge(h.market)}`}
                </div>
              </div>
              {/* 삭제는 확인 없이 즉시 — 아직 서버에 아무것도 없는 로컬 입력이라 다시 검색해 넣으면 그만이다.
                  터치 영역은 44px을 확보한다(docs/mobile.md §5). */}
              <button
                type="button"
                onClick={() => onChange(items.filter((x) => x.uid !== h.uid))}
                aria-label={`${h.stockName} 삭제`}
                style={{ width: 44, height: 44, flexShrink: 0, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <Icon name="close" size={16} color="var(--text-weak)" />
              </button>
            </div>
          ))}
        </div>
      )}

      {pending ? (
        // 고른 종목의 수량/단가를 그 자리에서 인라인으로 받는다 — 필드가 둘뿐이라 별도 시트를 띄울
        // 무게가 아니다.
        <div style={{ border: '0.5px solid var(--border)', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {pending.stockName} <span style={{ color: 'var(--text-weak)', fontWeight: 600 }}>{pending.ticker}</span>
            </div>
            <button
              type="button"
              onClick={resetRow}
              style={{ border: 'none', background: 'transparent', color: 'var(--accent)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
            >
              변경
            </button>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={LABEL_STYLE}>수량</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...FIELD_BORDER_STYLE }}>
                <input
                  type="text" inputMode="decimal" placeholder="0"
                  value={quantityStr}
                  onChange={(e) => {
                    setQuantityStr(sanitizeDecimalInput(e.target.value, 8))
                    setRowError(null)
                  }}
                  style={BARE_INPUT_STYLE}
                />
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-weak)', flexShrink: 0 }}>{unitLabel(pending.market)}</span>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={LABEL_STYLE}>평균단가</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...FIELD_BORDER_STYLE }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-weak)' }}>{pending.market === 'US' ? '$' : '₩'}</span>
                {pending.market === 'US' ? (
                  <input
                    type="text" inputMode="decimal" placeholder="0.00"
                    value={avgPriceStr}
                    onChange={(e) => {
                      setAvgPriceStr(sanitizeDecimalInput(e.target.value, 2))
                      setRowError(null)
                    }}
                    style={BARE_INPUT_STYLE}
                  />
                ) : (
                  <input
                    type="text" inputMode="numeric" placeholder="0"
                    value={avgPriceStr ? formatNumber(Number(avgPriceStr)) : ''}
                    onChange={(e) => {
                      const n = parseAmount(e.target.value)
                      setAvgPriceStr(n ? String(n) : '')
                      setRowError(null)
                    }}
                    style={BARE_INPUT_STYLE}
                  />
                )}
              </div>
            </div>
          </div>
          {rowError && <div style={{ ...ERROR_STYLE, marginTop: 0 }}>{rowError}</div>}
          <button
            type="button"
            className="qbtn"
            onClick={commitRow}
            style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 5, padding: '10px 14px', borderRadius: 8, border: 'none', background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <Icon name="add" size={15} />
            추가
          </button>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <div
            ref={anchor.anchorRef}
            style={{ display: 'flex', alignItems: 'center', gap: 8, ...FIELD_BORDER_STYLE }}
          >
            <Icon name="search" size={18} color="var(--text-weak)" />
            <input
              type="text"
              placeholder={isCrypto ? '코인명 또는 티커 검색' : '종목명 또는 티커 검색'}
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value)
                setResultsOpen(true)
              }}
              onFocus={() => setResultsOpen(true)}
              style={BARE_INPUT_STYLE}
            />
          </div>
          {showResults && (
            <>
              {/* 배경 클릭으로 목록만 닫는다 — 모달이 openDropdown에 쓰는 것과 같은 관례의 투명 오버레이.
                  팝오버(95)보다 한 단계 아래에 깔아 목록 클릭은 그대로 통과시킨다. */}
              <div
                onClick={() => setResultsOpen(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 94 }}
              />
              <div
                ref={panelRef}
                onClick={stopPropagation}
                style={{
                  // position:absolute 폴백은 앵커 측정 전(anchor.rect === undefined) 첫 렌더에만 쓰인다.
                  position: 'absolute', left: 0, right: 0, background: 'var(--surface)',
                  border: '0.5px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-pop)', padding: 6,
                  zIndex: 95, maxHeight: panelMaxHeight, overflowY: 'auto',
                  ...(anchor.openAbove ? { bottom: 'calc(100% + 6px)', top: 'auto' } : { top: 'calc(100% + 6px)', bottom: 'auto' }),
                  ...(isMobile ? { ...anchor.style, maxHeight: panelMaxHeight } : desktopFixedStyle),
                }}
              >
                {searchQuery.isPending ? (
                  <div style={{ padding: '9px 10px', fontSize: 12.5, color: 'var(--text-weak)' }} aria-busy>찾는 중…</div>
                ) : results.length > 0 ? (
                  results.map((s) => {
                    const already = addedIds.has(s.id)
                    return (
                      <button
                        key={s.id}
                        type="button"
                        className="mini-hov"
                        onClick={() => {
                          setPending({ stockId: s.id, stockName: s.name, ticker: s.ticker, market: s.market })
                          setResultsOpen(false)
                          setRowError(null)
                        }}
                        // 이미 담은 종목도 다시 고를 수는 있게 두되(수량을 나눠 적고 싶을 수 있다) 배지로
                        // 알려준다 — 리스트를 눈으로 다시 훑지 않아도 되게.
                        style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left', padding: '9px 10px', minHeight: isMobile ? 44 : 38, borderRadius: 8, border: 'none', background: 'transparent', fontSize: 12.5, fontWeight: 700, color: 'var(--text-strong)', cursor: 'pointer', fontFamily: 'inherit', opacity: already ? 0.55 : 1 }}
                      >
                        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.name} <span style={{ color: 'var(--text-weak)', fontWeight: 600 }}>{s.ticker}</span>
                        </span>
                        {/* 국내·해외가 한 목록에 섞이면 이름만으로는 구분이 안 된다(같은 이름의 국내·해외
                            종목이 실제로 있다) — 시장이 둘 이상일 때만 배지를 붙인다. */}
                        {showMarketBadge && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-weak)', flexShrink: 0 }}>{marketBadge(s.market)}</span>
                        )}
                        {already && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-weak)', flexShrink: 0 }}>담음</span>}
                      </button>
                    )
                  })
                ) : (
                  <div style={{ padding: '9px 10px', fontSize: 12, color: 'var(--text-weak)' }}>
                    '{keyword}'와 일치하는 {isCrypto ? '코인' : '종목'}이 없어요
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* 담은 종목이 그냥 목록이 아니라 "오늘 산 것으로 기록된다"는 걸 미리 알린다 — 서버가 등록일
          체결 BUY 매매로 남기므로 매매 내역에도 나타난다(파일 상단 주석 참고). */}
      <div style={HINT_STYLE}>
        {hint ?? `여기 담은 ${isCrypto ? '코인' : '종목'}은 오늘 산 것으로 기록돼요. 실제 매수일이 다르면 계좌를 만든 뒤 주식 화면에서 고쳐주세요`}
      </div>
      {/* 스크린리더에도 담긴 개수 변화를 알린다 — 종목을 담으면 방금 누른 '추가' 버튼이 사라져
          포커스가 body로 튀기 때문에, 최소한 상태 변화는 들려야 한다. */}
      <div aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>
        {items.length > 0 ? `${heading} ${items.length}개 추가됨` : ''}
      </div>
    </div>
  )
}
