// 월간 리포트 오버레이(z-index 90). 대시보드의 리포트 배너가 연다.
// 원본 시안(dc.html)의 9:16 스토리 카드 5장 형식이며(ds_rules §11), 숫자는 GET /dashboard/reports를
// reportView.ts가 바꾼 뷰모델에서 온다 — 문서형 한 장으로 바꿨다가 2026-09-06 사용자 요청("기존 html
// 느낌으로")으로 스토리 형식으로 되돌렸다.
//
// 장 구성: ① 총자산 변화 → ② 하이라이트·자산 → ③ 하이라이트·소비 → ④ 전월·전년 비교 → ⑤ 요약 카드
// (핵심 3지표 + 브랜드 마크 + 이미지로 저장·공유하기). 서버가 '유형 라벨'을 주지 않으므로 ⑤의 제목은
// 라벨 대신 실제 숫자로 만든 문장이다(buildSummarySentence).
//
// 이미지 저장·공유는 지금 보이는 장을 1080×1920 PNG로 굽는다(src/utils/reportExport.ts). 달 이동·
// 저장·공유 버튼은 data-report-export-exclude로 이미지에서 뺀다.
//
// 앱의 다른 모달과 마찬가지로 배경을 눌러도 닫히고 X 버튼도 있다(입력 폼이 없는 읽기 전용 오버레이라
// 잃을 것이 없다). 키보드 ←/→로 장을 넘기고 Esc로 닫는다(원본 시안과 같음). 모바일에서는 카드 위를
// 좌우로 쓸어 넘길 수 있다.
// 여기 쓰인 그림자 `0 60px 100px -40px rgba(0,0,0,.6)`는 ds_rules §6-2가 이 자리에만 허용한 예외다.
//
// 달 이동: state.reportPeriod가 null이면 '현재 정산월'이고 서버가 어느 달인지 정한다(monthStartDay
// 경계를 프론트가 계산하지 않는다). 첫 장의 제목 양옆 화살표로 이전 달로 가고, 다시 앞으로 와서 현재
// 달에 닿으면 null로 되돌린다 — 미래 달로는 못 간다.
//
// 금액 숨김(state.amountsHidden, 기본 ON — ds_rules §11-3)이면 절대 금액 대신 비율만 보여준다.
// 비율이 없는 값(모수 0 → 서버가 null)은 숨김 여부와 무관하게 '—'로 둔다.

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactNode, TouchEvent as ReactTouchEvent } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { Skeleton } from '../../../components/primitives/Skeleton/Skeleton'
import { buildMonthlyReport, buildSummarySentence } from '../../../data/reportView'
import type { ChangeDirection, MonthlyReportView } from '../../../data/reportView'
import { useAppState } from '../../../state/AppStateContext'
import { shiftYearMonth } from '../../../utils/date'
import { triggerBrowserDownload } from '../../../utils/download'
import { REPORT_EXPORT_EXCLUDE_ATTR, renderReportSlidePng, reportImageFilename, shareReportImage } from '../../../utils/reportExport'
import { useIsMobile } from '../../../utils/useMediaQuery'
import type { YearMonth } from '@/services/common.type'
import { useGetMonthlyReport } from '@/services/dashboard'

const SLIDE_COUNT = 5
const LAST_SLIDE = SLIDE_COUNT - 1
const SWIPE_THRESHOLD_PX = 40

const EYEBROW_STYLE: CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--accent)', letterSpacing: '.02em' }
const HEADLINE_STYLE: CSSProperties = { fontSize: 23, fontWeight: 700, lineHeight: 1.45, marginTop: 18 }
const LABEL_STYLE: CSSProperties = { fontSize: 13, color: 'var(--text-mid)', fontWeight: 700 }
const BIG_STYLE: CSSProperties = { fontSize: 38, fontWeight: 700, marginTop: 8, letterSpacing: '-.02em', lineHeight: 1.15 }
const SUB_STYLE: CSSProperties = { fontSize: 13, color: 'var(--text-mid)', fontWeight: 500, marginTop: 6 }
const DIVIDER_SUB_STYLE: CSSProperties = { ...SUB_STYLE, marginTop: 16, paddingTop: 16, borderTop: '0.5px solid var(--border)' }
const EXCLUDE = { [REPORT_EXPORT_EXCLUDE_ATTR]: '' }

function directionColor(direction: ChangeDirection): string {
  if (direction === 'up') return 'var(--up)'
  if (direction === 'down') return 'var(--down)'
  return 'var(--text-strong)'
}

function sameMonth(a: YearMonth, b: YearMonth): boolean {
  return a.year === b.year && a.month === b.month
}

/** 큰 숫자 한 줄: 금액(+원) 또는 숨김이면 비율. 비율도 없으면 '—'. */
function BigValue({ amountText, percentText, direction, hidden }: { amountText: string; percentText: string | null; direction: ChangeDirection; hidden: boolean }) {
  const color = directionColor(direction)
  if (hidden) return <div style={{ ...BIG_STYLE, color }}>{percentText ?? '—'}</div>
  return (
    <div style={{ ...BIG_STYLE, color }}>
      {amountText}
      <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-mid)', marginLeft: 2 }}>원</span>
    </div>
  )
}

function Percent({ text, direction }: { text: string | null; direction: ChangeDirection }) {
  if (text === null) return <b style={{ color: 'var(--text-weak)', fontWeight: 700 }}>—</b>
  return <b style={{ color: directionColor(direction), fontWeight: 700 }}>{text}</b>
}

function MonitMark() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {/* 확정 심볼 — secret/monit-symbol-spec.md §3-1(라이트). 20px에서도 같은 코드를 쓴다(규격 §4).
          이 오버레이는 문서에 한 번만 열리므로 id는 고정값으로 충분하다. */}
      <svg width="20" height="20" viewBox="0 0 100 100" aria-hidden>
        <defs>
          <linearGradient id="monit-ov-report" gradientUnits="userSpaceOnUse" x1="38.48" y1="62.89" x2="47.46" y2="53.91">
            <stop offset="0" stopColor="#6761CD" stopOpacity="0" />
            <stop offset="1" stopColor="#6761CD" stopOpacity=".76" />
          </linearGradient>
          <clipPath id="monit-clip-report">
            <rect width="100" height="100" rx="24.26" ry="24.26" />
          </clipPath>
        </defs>
        <rect width="100" height="100" rx="24.26" ry="24.26" fill="#2A2E5C" />
        <path d="M47.75 44.92 L47.75 91.8 L0.88 91.8 Z" fill="url(#monit-ov-report)" clipPath="url(#monit-clip-report)" />
        <circle cx="78.22" cy="27.15" r="5.57" fill="#6979F8" />
        <g fill="none" stroke="#FFFFFF" strokeWidth="14.16" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18.95 67.38 L40.62 45.61" />
          <path d="M48.63 67.38 L71.48 45.61 L73.54 67.38" />
        </g>
      </svg>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-weak)', letterSpacing: '-.01em' }}>Monit</span>
    </div>
  )
}

// ---------- 장 5개 ----------

interface SlideProps { view: MonthlyReportView; hidden: boolean }

function SlideTotal({ view, hidden, periodNav }: SlideProps & { periodNav: ReactNode }) {
  const t = view.totalChange
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={EYEBROW_STYLE}>{view.periodLabel} 리포트</div>
        {periodNav}
      </div>
      <div style={HEADLINE_STYLE}>
        {view.period.month}월, 당신의 자산은
        <br />
        이렇게 움직였어요
      </div>
      <div style={{ marginTop: 'auto' }}>
        <div style={LABEL_STYLE}>총 자산 변화</div>
        <BigValue amountText={t.amountText} percentText={t.percentText} direction={t.direction} hidden={hidden} />
        {!hidden && (
          <div style={SUB_STYLE}>
            전월 대비 <Percent text={t.percentText} direction={t.direction} />
          </div>
        )}
        {t.percentText === null && (
          <div style={{ ...SUB_STYLE, color: 'var(--text-weak)', fontSize: 12 }}>전월 말 자산이 0원이라 증감률은 계산하지 않았어요</div>
        )}
      </div>
    </>
  )
}

function SlideAssets({ view, hidden }: SlideProps) {
  const top = view.topAssetClass
  return (
    <>
      <div style={EYEBROW_STYLE}>하이라이트 · 자산</div>
      {/* 비교할 자산이 없으면 제목이 답을 약속해놓고 본문에서 뒤집는 꼴이 된다 — 제목부터 없다고 말한다. */}
      <div style={HEADLINE_STYLE}>
        {top ? (
          <>
            이번 달 가장 크게
            <br />
            {top.direction === 'down' ? '버틴 자산은' : '늘어난 자산은'}
          </>
        ) : (
          <>
            아직 비교할
            <br />
            자산이 없어요
          </>
        )}
      </div>
      {top && (
        <div style={{ marginTop: 24, width: 72, height: 72, borderRadius: 20, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={top.icon} size={36} ariaHidden />
        </div>
      )}
      <div style={{ marginTop: 'auto' }}>
        {top ? (
          <>
            <div style={LABEL_STYLE}>{top.name}</div>
            <BigValue amountText={top.amountText} percentText={top.percentText} direction={top.direction} hidden={hidden} />
            {!hidden && (
              <div style={SUB_STYLE}>
                정산월 시작 대비 <Percent text={top.percentText} direction={top.direction} />
              </div>
            )}
          </>
        ) : (
          <>
            <div style={LABEL_STYLE}>비교할 자산이 아직 없어요</div>
            <div style={SUB_STYLE}>계좌를 등록한 다음 달부터 보여드려요</div>
          </>
        )}
        {view.topAccount && (
          <div style={DIVIDER_SUB_STYLE}>
            가장 많이 오른 계좌 <b style={{ color: 'var(--text-strong)' }}>{view.topAccount.name}</b>
            {!hidden && (
              <>
                {' · '}
                <b style={{ color: directionColor(view.topAccount.direction) }}>{view.topAccount.amountText}원</b>
              </>
            )}
          </div>
        )}
      </div>
    </>
  )
}

function SlideSpending({ view, hidden }: SlideProps) {
  const top = view.topExpense
  return (
    <>
      <div style={EYEBROW_STYLE}>하이라이트 · 소비</div>
      <div style={HEADLINE_STYLE}>
        {top ? (
          <>
            가장 많이 지출한
            <br />
            카테고리는
          </>
        ) : (
          <>
            이번 달은 지출
            <br />
            기록이 없어요
          </>
        )}
      </div>
      {view.expenseTop3.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
          {view.expenseTop3.map((row, i) => (
            <div key={`${row.name}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 64, flex: 'none', fontSize: 11.5, color: 'var(--text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</span>
              <div style={{ flex: 1, height: 8, background: 'var(--track)', borderRadius: 4 }}>
                <div style={{ width: `${row.barPercent}%`, height: '100%', background: row.rampColor, borderRadius: 4 }} />
              </div>
              <span style={{ width: 44, flex: 'none', textAlign: 'right', fontSize: 11, color: 'var(--text-weak)' }}>{row.sharePercentText ?? ''}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: 'auto' }}>
        {top ? (
          <>
            <div style={LABEL_STYLE}>{top.name}</div>
            {hidden ? (
              <div style={BIG_STYLE}>{top.sharePercentText === null ? '—' : `지출의 ${top.sharePercentText}`}</div>
            ) : (
              <div style={BIG_STYLE}>
                {top.amountText}
                <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-mid)', marginLeft: 2 }}>원</span>
              </div>
            )}
          </>
        ) : (
          <>
            <div style={LABEL_STYLE}>지출 기록이 없어요</div>
            <div style={SUB_STYLE}>가계부에 지출을 적으면 여기서 정리해 드려요</div>
          </>
        )}
        <div style={DIVIDER_SUB_STYLE}>
          이번 달 저축률{' '}
          <b style={{ color: view.savingsRateText === null ? 'var(--text-weak)' : 'var(--sav-text)', fontWeight: 700 }}>{view.savingsRateText ?? '—'}</b>
          {view.savingsRateAvg6mText !== null && <> · 최근 6개월 평균 {view.savingsRateAvg6mText}</>}
        </div>
      </div>
    </>
  )
}

function SlideCompare({ view }: SlideProps) {
  const t = view.totalChange
  // 두 증감률의 크기를 같은 자로 잰 막대 — 절대 금액이 없어도 성립하는 비교라 금액 숨김과 무관하다.
  const rows = [
    { label: '전월 대비', text: t.percentText, direction: t.direction, value: t.percentText === null ? null : Math.abs(parseFloat(t.percentText.replace(/[^\d.]/g, '')) || 0) },
    { label: '전년 같은 달 대비', text: view.yoyPercentText, direction: view.yoyDirection, value: view.yoyPercentText === null ? null : Math.abs(parseFloat(view.yoyPercentText.replace(/[^\d.]/g, '')) || 0) },
  ]
  const maxValue = Math.max(...rows.map((r) => r.value ?? 0), 1)
  return (
    <>
      <div style={EYEBROW_STYLE}>비교</div>
      <div style={HEADLINE_STYLE}>
        전월 · 전년 대비
        <br />
        이렇게 달라졌어요
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 24 }}>
        {rows.map((row) => (
          <div key={row.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <span style={{ fontSize: 11.5, color: 'var(--text-mid)' }}>{row.label}</span>
              <Percent text={row.text} direction={row.direction} />
            </div>
            <div style={{ height: 8, background: 'var(--track)', borderRadius: 4 }}>
              <div style={{ width: `${row.value === null ? 0 : Math.max(2, Math.round((row.value / maxValue) * 100))}%`, height: '100%', borderRadius: 4, background: row.direction === 'down' ? 'var(--down)' : row.direction === 'flat' ? 'var(--text-weak)' : 'var(--accent)' }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 'auto' }}>
        <div style={LABEL_STYLE}>전월 대비 총자산</div>
        <div style={{ ...BIG_STYLE, color: t.percentText === null ? 'var(--text-weak)' : directionColor(t.direction) }}>{t.percentText ?? '—'}</div>
        <div style={DIVIDER_SUB_STYLE}>
          전년 동월 대비 <Percent text={view.yoyPercentText} direction={view.yoyDirection} />
          {(t.percentText === null || view.yoyPercentText === null) && (
            <div style={{ fontSize: 12, color: 'var(--text-weak)', marginTop: 6 }}>비교할 시점의 자산이 0원이면 증감률은 계산하지 않아요</div>
          )}
        </div>
      </div>
    </>
  )
}

function SlideSummary({ view, hidden, actions }: SlideProps & { actions: ReactNode }) {
  const t = view.totalChange
  return (
    <>
      <div style={EYEBROW_STYLE}>{view.periodLabel}의 당신</div>
      <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.35, marginTop: 18, letterSpacing: '-.02em' }}>{buildSummarySentence(view, hidden)}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 24 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-weak)' }}>저축률</div>
          <div style={{ fontSize: 17, fontWeight: 700, marginTop: 4, color: view.savingsRateText === null ? 'var(--text-weak)' : 'var(--text-strong)' }}>{view.savingsRateText ?? '—'}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-weak)' }}>자산 증감률</div>
          <div style={{ fontSize: 17, fontWeight: 700, marginTop: 4, color: t.percentText === null ? 'var(--text-weak)' : directionColor(t.direction) }}>{t.percentText ?? '—'}</div>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--text-weak)' }}>최대 지출</div>
          <div style={{ fontSize: 17, fontWeight: 700, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: view.topExpense ? 'var(--text-strong)' : 'var(--text-weak)' }}>{view.topExpense?.name ?? '—'}</div>
        </div>
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ marginBottom: 6 }}><MonitMark /></div>
        {actions}
      </div>
    </>
  )
}

function SlideSkeleton() {
  return (
    <div aria-hidden style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Skeleton width={120} height={13} />
      <Skeleton width={220} height={22} style={{ marginTop: 20 }} />
      <Skeleton width={160} height={22} style={{ marginTop: 8 }} />
      <div style={{ marginTop: 'auto' }}>
        <Skeleton width={90} height={13} />
        <Skeleton width={240} height={38} style={{ marginTop: 10 }} />
        <Skeleton width={140} height={13} style={{ marginTop: 10 }} />
      </div>
    </div>
  )
}

// ---------- 오버레이 ----------

export function ReportOverlay() {
  const { state, setState } = useAppState()
  const isMobile = useIsMobile()
  const open = state.reportOpen
  const period = state.reportPeriod
  const reportSlide = state.reportSlide
  const amountsHidden = state.amountsHidden

  // '현재 정산월' 조회는 열려 있는 동안 항상 살려 둔다 — 이전 달을 보다가 앞으로 돌아올 때 "현재 달에
  // 닿았는지"를 이 응답의 reportYear/reportMonth로 판정한다(둘이 같은 달이면 React Query가 같은 키로
  // 합쳐 요청은 한 번이다).
  const currentQuery = useGetMonthlyReport(undefined, { enabled: open })
  const periodQuery = useGetMonthlyReport(period ?? undefined, { enabled: open && period !== null })
  const query = period === null ? currentQuery : periodQuery

  const scrimPressedRef = useRef(false)
  const slideRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const touchStartXRef = useRef<number | null>(null)
  const [exporting, setExporting] = useState<'save' | 'share' | null>(null)
  const [exportNotice, setExportNotice] = useState<string | null>(null)

  // 장을 옮기면 저장·공유 안내 문구는 지운다 — 다른 장을 보고 돌아왔을 때 "방금 또 저장됐나?"로 읽힌다.
  const setSlide = (i: number) => {
    setExportNotice(null)
    setState({ reportSlide: Math.max(0, Math.min(LAST_SLIDE, i)) })
  }
  const prevSlide = () => {
    setExportNotice(null)
    setState((prev) => ({ reportSlide: Math.max(prev.reportSlide - 1, 0) }))
  }
  const nextSlide = () => {
    setExportNotice(null)
    setState((prev) => ({ reportSlide: Math.min(prev.reportSlide + 1, LAST_SLIDE) }))
  }

  // 키보드: Esc 닫기, ←/→ 장 넘기기(원본 시안 dc.html과 같음). 공용 Modal을 쓰지 않으므로 직접 붙인다.
  // 모달은 라우트와 무관하게 항상 마운트라 계좌 상세(z90) 같은 다른 모달이 리포트 위에 겹칠 수 있다 —
  // 그때 Esc 한 번에 둘 다 닫히거나 가려진 리포트의 장이 몰래 넘어가지 않도록, 다른 모달이 열려
  // 있으면 무시한다. 최신 값은 ref로 읽어 리스너를 매 렌더 다시 붙이지 않는다.
  const otherModalOpenRef = useRef(false)
  otherModalOpenRef.current = state.openModal !== null || state.accountDetailId !== null || state.assetClassDetail !== null
  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.isComposing || otherModalOpenRef.current) return
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      if (e.key === 'Escape') {
        setExportNotice(null)
        setState({ reportOpen: false, reportPeriod: null, reportSlide: 0 })
      } else if (e.key === 'ArrowLeft') {
        setExportNotice(null)
        setState((prev) => ({ reportSlide: Math.max(prev.reportSlide - 1, 0) }))
      } else if (e.key === 'ArrowRight') {
        setExportNotice(null)
        setState((prev) => ({ reportSlide: Math.min(prev.reportSlide + 1, LAST_SLIDE) }))
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, setState])

  // 열릴 때 포커스를 오버레이 안(닫기 버튼)으로 옮긴다 — 그래야 Tab이 배경 화면을 훑지 않고, 스크린리더도
  // 다이얼로그가 열렸다는 것을 읽는다. 포커스 트랩까지 만들지는 않았다(읽기 전용 화면이고 요소가 적다).
  useEffect(() => {
    if (!open) return
    closeButtonRef.current?.focus()
  }, [open])

  // 훅은 조건부 return보다 위에 있어야 한다(react-hooks/rules-of-hooks).
  if (!open) return null

  const current: YearMonth | null = currentQuery.data
    ? { year: currentQuery.data.reportYear, month: currentQuery.data.reportMonth }
    : null
  const displayed: YearMonth | null = period ?? current
  const view = query.data ? buildMonthlyReport(query.data) : null
  // 화면을 에러로 바꾸는 기준은 지금 보는 달의 조회(query)뿐이다. 지난 달을 보는 동안 배경의 '현재
  // 정산월' 조회가 실패하면 current가 null로 남아 다음 달 화살표가 막히는데, 그렇다고 정상 로드된 지난 달
  // 리포트를 에러 화면으로 덮으면 안 된다 — 첫 장의 달 이동 칸에 작게 알리고 거기서 다시 시도한다.
  const error = query.error
  const currentMonthError = period !== null ? currentQuery.error : null
  const retry = () => {
    if (query.error) void query.refetch()
    if (currentQuery.error) void currentQuery.refetch()
  }

  const closeReport = () => {
    setExportNotice(null)
    setState({ reportOpen: false, reportPeriod: null, reportSlide: 0 })
  }
  const toggleAmountsHidden = () => setState((prev) => ({ amountsHidden: !prev.amountsHidden }))
  const goPrevMonth = () => {
    if (!displayed) return
    setState({ reportPeriod: shiftYearMonth(displayed, -1), reportSlide: 0 })
  }
  const goNextMonth = () => {
    if (!period || !current) return
    const next = shiftYearMonth(period, 1)
    setState({ reportPeriod: sameMonth(next, current) ? null : next, reportSlide: 0 })
  }
  const canPrevMonth = displayed !== null
  const canNextMonth = period !== null && current !== null

  const runExport = async (kind: 'save' | 'share') => {
    const node = slideRef.current
    if (!node || !view || exporting) return
    setExporting(kind)
    setExportNotice(null)
    try {
      const blob = await renderReportSlidePng(node)
      const filename = reportImageFilename(view.period.year, view.period.month)
      if (kind === 'save') {
        triggerBrowserDownload({ blob, filename })
        setExportNotice('이미지로 저장했어요')
      } else {
        const outcome = await shareReportImage(blob, filename, `Monit ${view.periodLabel} 리포트`)
        if (outcome === 'downloaded') setExportNotice('이 기기에서는 공유 창을 열 수 없어 이미지로 저장했어요')
      }
    } catch (e) {
      setExportNotice(e instanceof Error ? e.message : '이미지를 만들지 못했어요')
    } finally {
      setExporting(null)
    }
  }

  // 누른 지점이 스크림 자신일 때만 닫는다 — 이유는 Modal.tsx의 handleScrimPointerDown 주석 참고.
  const handleScrimPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    scrimPressedRef.current = e.target === e.currentTarget
  }
  const handleScrimClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!scrimPressedRef.current) return
    scrimPressedRef.current = false
    if (e.target !== e.currentTarget) return
    closeReport()
  }
  const handleTouchStart = (e: ReactTouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null
  }
  const handleTouchEnd = (e: ReactTouchEvent<HTMLDivElement>) => {
    const startX = touchStartXRef.current
    touchStartXRef.current = null
    if (startX === null) return
    const dx = (e.changedTouches[0]?.clientX ?? startX) - startX
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return
    if (dx < 0) nextSlide()
    else prevSlide()
  }

  // 이 오버레이는 공용 Modal을 쓰지 않아 모바일 대응을 직접 한다. 좁은 화면에서는 바깥 여백을 줄여
  // 카드에 더 넓은 폭을 준다(§2 본문 패딩 16px과 맞춤). 아이콘 버튼은 터치 영역만 44px로 키우고
  // 시각적 아이콘/배경 크기는 그대로 둔다.
  const overlayPadding = isMobile ? 16 : 32
  const topIconButtonSize = isMobile ? 44 : 40
  const navButtonSize = isMobile ? 44 : 36
  const topIconOffset = isMobile ? 'calc(26px + env(safe-area-inset-top))' : 26
  const topButtonStyle: CSSProperties = {
    position: 'absolute', top: topIconOffset, width: topIconButtonSize, height: topIconButtonSize, borderRadius: 8, border: 'none',
    background: 'var(--deep-chip)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  }
  const navButtonStyle: CSSProperties = {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)', width: navButtonSize, height: navButtonSize, borderRadius: 999,
    border: '0.5px solid var(--border)', background: 'var(--surface)', boxShadow: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  }
  // 달 이동 화살표도 다른 아이콘 버튼과 같은 터치 기준을 따른다 — 시각적으로는 작은 화살표지만
  // 히트 영역은 모바일 44px(docs/mobile.md). 제목 줄 높이가 늘어나지 않도록 음수 마진으로 상쇄한다.
  const monthNavHit = isMobile ? 44 : 28
  const monthNavStyle = (enabled: boolean): CSSProperties => ({
    width: monthNavHit, height: monthNavHit, margin: isMobile ? '-12px 0' : 0, borderRadius: 8, border: 'none', background: 'transparent',
    padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: enabled ? 'pointer' : 'default', opacity: enabled ? 1 : 0.3, color: 'var(--text-weak)',
  })
  const actionButtonBase: CSSProperties = { padding: 15, borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }

  const periodNav = (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: isMobile ? 4 : 2, marginLeft: 2 }} {...EXCLUDE}>
      <button type="button" onClick={goPrevMonth} disabled={!canPrevMonth} aria-label="이전 달 리포트" style={monthNavStyle(canPrevMonth)}>
        <Icon name="chevron_left" size={18} ariaHidden />
      </button>
      <button type="button" onClick={goNextMonth} disabled={!canNextMonth} aria-label="다음 달 리포트" style={monthNavStyle(canNextMonth)}>
        <Icon name="chevron_right" size={18} ariaHidden />
      </button>
      {currentMonthError && (
        <button type="button" onClick={retry} style={{ border: 'none', background: 'transparent', padding: '4px 6px', fontSize: 11.5, fontWeight: 700, color: 'var(--down)', cursor: 'pointer', fontFamily: 'inherit' }}>
          이번 달 확인 실패 · 다시 시도
        </button>
      )}
    </span>
  )
  const actions = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} {...EXCLUDE}>
      <button type="button" className="qbtn" onClick={() => void runExport('save')} disabled={exporting !== null} style={{ ...actionButtonBase, border: 'none', background: 'var(--accent)', color: '#fff', opacity: exporting && exporting !== 'save' ? 0.6 : 1 }}>
        {exporting === 'save' ? '저장 중…' : '이미지로 저장'}
      </button>
      <button type="button" className="qbtn" onClick={() => void runExport('share')} disabled={exporting !== null} style={{ ...actionButtonBase, border: '0.5px solid var(--border)', background: 'transparent', color: 'var(--text-strong)', opacity: exporting && exporting !== 'share' ? 0.6 : 1 }}>
        {exporting === 'share' ? '준비 중…' : '공유하기'}
      </button>
      {exportNotice && <div style={{ fontSize: 12, color: 'var(--text-weak)', textAlign: 'center' }} role="status">{exportNotice}</div>}
      {/* 데스크톱에는 화살표 버튼이 카드 밖으로 나가 있어 조작법을 놓치기 쉽다 — 한 줄로 알린다. */}
      {!isMobile && !exportNotice && (
        <div style={{ fontSize: 11.5, color: 'var(--text-weak)', textAlign: 'center' }}>← → 로 넘기고 Esc로 닫아요</div>
      )}
    </div>
  )

  const slideStyle: CSSProperties = {
    position: 'absolute', inset: 0, background: 'var(--surface)', padding: '44px 34px',
    display: 'flex', flexDirection: 'column', color: 'var(--text-strong)',
  }

  return (
    <div
      onPointerDown={handleScrimPointerDown}
      onClick={handleScrimClick}
      role="dialog"
      aria-modal
      aria-label={`${displayed ? `${displayed.year}년 ${displayed.month}월` : '이번 달'} 리포트`}
      style={{
        position: 'fixed', inset: 0, background: 'var(--overlay-scrim)', zIndex: 90,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: overlayPadding,
      }}
    >
      <button ref={closeButtonRef} type="button" onClick={closeReport} aria-label="닫기" style={{ ...topButtonStyle, right: 28 }}>
        <Icon name="close" size={20} color="#fff" ariaHidden />
      </button>
      <button
        type="button"
        onClick={toggleAmountsHidden}
        aria-pressed={amountsHidden}
        title={amountsHidden ? '금액 보기' : '금액 숨기기'}
        aria-label={amountsHidden ? '금액 보기' : '금액 숨기기'}
        style={{ ...topButtonStyle, right: 28 + topIconButtonSize + 10 }}
      >
        <Icon name={amountsHidden ? 'visibility_off' : 'visibility'} size={20} color="#fff" ariaHidden />
      </button>

      {/* 카드는 항상 9:16 — 폭만 정하고 높이는 비율로 따라온다(이미지 저장 규격 1080×1920과 같은 비율). */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        aria-busy={query.isPending}
        style={{
          width: 'min(396px, 100%, calc(82vh * 9 / 16))', aspectRatio: '9 / 16', borderRadius: 10,
          overflow: 'hidden', position: 'relative', boxShadow: '0 60px 100px -40px rgba(0,0,0,.6)', background: 'var(--surface)',
        }}
      >
        <div style={{ position: 'absolute', top: 12, left: 12, right: 12, display: 'flex', gap: 4, zIndex: 5 }} {...EXCLUDE}>
          {Array.from({ length: SLIDE_COUNT }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSlide(i)}
              aria-label={`${i + 1}번째 장으로 이동`}
              aria-current={i === reportSlide}
              style={{ flex: 1, cursor: 'pointer', padding: isMobile ? '10px 0' : '4px 0', border: 'none', background: 'transparent' }}
            >
              <span style={{ display: 'block', height: 3, borderRadius: 999, background: i <= reportSlide ? 'var(--accent)' : 'var(--border)' }} />
            </button>
          ))}
        </div>

        <div ref={slideRef} data-report-slide style={slideStyle}>
          {query.isPending ? (
            <SlideSkeleton />
          ) : error ? (
            <>
              <div style={EYEBROW_STYLE}>{displayed ? `${displayed.year}년 ${displayed.month}월 리포트` : '월간 리포트'}</div>
              <div style={HEADLINE_STYLE}>리포트를 불러오지 못했어요</div>
              <div style={{ ...SUB_STYLE, color: 'var(--down)', marginTop: 12 }}>{error.message}</div>
              <div style={{ marginTop: 'auto' }} {...EXCLUDE}>
                <button type="button" className="qbtn" onClick={retry} style={{ ...actionButtonBase, width: '100%', border: 'none', background: 'var(--accent)', color: '#fff' }}>다시 시도</button>
              </div>
            </>
          ) : view ? (
            <>
              {reportSlide === 0 && <SlideTotal view={view} hidden={amountsHidden} periodNav={periodNav} />}
              {reportSlide === 1 && <SlideAssets view={view} hidden={amountsHidden} />}
              {reportSlide === 2 && <SlideSpending view={view} hidden={amountsHidden} />}
              {reportSlide === 3 && <SlideCompare view={view} hidden={amountsHidden} />}
              {reportSlide === 4 && <SlideSummary view={view} hidden={amountsHidden} actions={actions} />}
            </>
          ) : null}
        </div>

        {reportSlide > 0 && (
          <button type="button" onClick={prevSlide} aria-label="이전 장" style={{ ...navButtonStyle, left: 10 }} {...EXCLUDE}>
            <Icon name="chevron_left" size={20} color="var(--text-mid)" ariaHidden />
          </button>
        )}
        {reportSlide < LAST_SLIDE && (
          <button type="button" onClick={nextSlide} aria-label="다음 장" style={{ ...navButtonStyle, right: 10 }} {...EXCLUDE}>
            <Icon name="chevron_right" size={20} color="var(--text-mid)" ariaHidden />
          </button>
        )}
      </div>
    </div>
  )
}
