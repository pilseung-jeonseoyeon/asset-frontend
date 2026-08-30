// Source: secret/Asset Manager v14.dc.html L2145-2305 (월간 리포트 카드, reportOpen) — transcribed
// verbatim. z-index 90. 원본(L2147-2148)에는 스크림 클릭 닫기가 없었지만, 2026-08-29 사용자 요청으로
// 앱의 모든 모달과 같이 배경을 누르면 닫히게 했다(입력 폼이 없는 읽기 전용 오버레이라 잃을 것도 없다).
// X 버튼도 그대로 남아 있다. ds_rules_v2_5.md §6-2 documents the
// one shadow exception used here: `0 60px 100px -40px rgba(0,0,0,.6)`, allowed only in this context.

import { useRef } from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { useAppState } from '../../../state/AppStateContext'
import { useIsMobile } from '../../../utils/useMediaQuery'

export function ReportOverlay() {
  const { state, setState } = useAppState()
  const isMobile = useIsMobile()
  // 훅은 조건부 return보다 위에 있어야 한다(react-hooks/rules-of-hooks).
  const scrimPressedRef = useRef(false)

  if (!state.reportOpen) return null

  const reportSlide = state.reportSlide
  const amountsHidden = state.amountsHidden
  const isFirstReportSlide = reportSlide === 0
  const isLastReportSlide = reportSlide === 4
  const closeReport = () => setState({ reportOpen: false })
  const toggleAmountsHidden = () => setState((prev) => ({ amountsHidden: !prev.amountsHidden }))
  const prevReportSlide = () => setState((prev) => ({ reportSlide: Math.max(prev.reportSlide - 1, 0) }))
  const nextReportSlide = () => setState((prev) => ({ reportSlide: Math.min(prev.reportSlide + 1, 4) }))

  const slideBaseStyle = {
    position: 'absolute' as const, inset: 0, background: 'var(--surface)', padding: '44px 34px',
    display: 'flex', flexDirection: 'column' as const, color: 'var(--text-strong)',
  }

  // 이 오버레이는 공용 Modal을 쓰지 않아 모바일 대응을 직접 한다. 좁은 화면에서는 바깥 여백을 줄여
  // 카드에 더 넓은 폭을 준다(§2 본문 패딩 16px과 맞춤). 아이콘 버튼은 터치 영역만 44px로 키우고
  // 시각적 아이콘/배경 크기는 그대로 둔다.
  const overlayPadding = isMobile ? 16 : 32
  const topIconBtnSize = isMobile ? 44 : 40
  const navBtnSize = isMobile ? 44 : 36
  const topIconOffset = isMobile ? 'calc(26px + env(safe-area-inset-top))' : 26

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

  return (
    <div
      onPointerDown={handleScrimPointerDown}
      onClick={handleScrimClick}
      style={{
        position: 'fixed', inset: 0, background: 'var(--overlay-scrim)', zIndex: 90,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: overlayPadding,
      }}
    >
      <button
        onClick={closeReport}
        style={{ position: 'absolute', top: topIconOffset, right: 28, width: topIconBtnSize, height: topIconBtnSize, borderRadius: 8, border: 'none', background: 'var(--deep-chip)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
      >
        <Icon name="close" size={20} color="#fff" />
      </button>
      <button
        onClick={toggleAmountsHidden}
        title={amountsHidden ? '금액 보기' : '금액 숨기기'}
        style={{ position: 'absolute', top: topIconOffset, right: 28 + topIconBtnSize + 10, width: topIconBtnSize, height: topIconBtnSize, borderRadius: 8, border: 'none', background: 'var(--deep-chip)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
      >
        <Icon name={amountsHidden ? 'visibility_off' : 'visibility'} size={20} color="#fff" />
      </button>

      <div
        style={{
          width: 396, maxWidth: '100%', height: 704, maxHeight: '82vh', aspectRatio: '9/16', borderRadius: 10,
          overflow: 'hidden', position: 'relative', boxShadow: '0 60px 100px -40px rgba(0,0,0,.6)',
        }}
      >
        <div style={{ position: 'absolute', top: 12, left: 12, right: 12, display: 'flex', gap: 4, zIndex: 5 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              onClick={() => setState({ reportSlide: i })}
              style={{ flex: 1, cursor: 'pointer', padding: isMobile ? '10px 0' : 0 }}
            >
              <span
                style={{ display: 'block', height: 3, borderRadius: 999, background: i <= reportSlide ? 'var(--accent)' : 'var(--border)' }}
              />
            </div>
          ))}
        </div>

        {reportSlide === 0 && (
          <div style={slideBaseStyle}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', letterSpacing: '.02em' }}>2026년 6월 리포트</div>
            <div style={{ fontSize: 23, fontWeight: 700, lineHeight: 1.45, marginTop: 18 }}>
              6월, 당신의 자산은
              <br />
              이렇게 움직였어요
            </div>
            <div style={{ marginTop: 'auto' }}>
              <div style={{ fontSize: 13, color: 'var(--text-mid)', fontWeight: 700 }}>총 자산 변화</div>
              {amountsHidden ? (
                <div style={{ fontSize: 38, fontWeight: 700, marginTop: 8, letterSpacing: '-.02em', color: 'var(--up)' }}>+2.3%</div>
              ) : (
                <>
                  <div style={{ fontSize: 38, fontWeight: 700, marginTop: 8, letterSpacing: '-.02em' }}>
                    +28,400,000
                    <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-mid)' }}>원</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-mid)', fontWeight: 500, marginTop: 6 }}>
                    전월 대비 <b style={{ color: 'var(--up)', fontWeight: 700 }}>+2.3%</b>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {reportSlide === 1 && (
          <div style={slideBaseStyle}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', letterSpacing: '.02em' }}>하이라이트 · 자산</div>
            <div style={{ fontSize: 23, fontWeight: 700, lineHeight: 1.4, marginTop: 18 }}>
              이번 달 가장 크게
              <br />
              늘어난 자산은
            </div>
            <svg viewBox="0 0 320 80" style={{ width: '100%', height: 80, marginTop: 20 }} preserveAspectRatio="none">
              <path d="M0 62 L53 55 L107 46 L160 35 L213 22 L267 12 L320 4" fill="none" style={{ stroke: 'var(--accent)' }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="320" cy="4" r="4" style={{ fill: 'var(--accent)', stroke: 'var(--surface)' }} strokeWidth="2" />
            </svg>
            <div style={{ marginTop: 'auto' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-mid)' }}>해외주식</div>
              {amountsHidden ? (
                <>
                  <div style={{ fontSize: 38, fontWeight: 700, marginTop: 8, letterSpacing: '-.02em', color: 'var(--up)' }}>+11.4%</div>
                  <div style={{ fontSize: 13, color: 'var(--text-mid)', fontWeight: 500, marginTop: 8 }}>전월 대비 · NVIDIA 강세 영향</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 38, fontWeight: 700, marginTop: 8, letterSpacing: '-.02em' }}>
                    +23,650,000
                    <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-mid)' }}>원</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-mid)', fontWeight: 500, marginTop: 8 }}>
                    전월 대비 <b style={{ color: 'var(--up)', fontWeight: 700 }}>+11.4%</b> · NVIDIA 강세 영향
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {reportSlide === 2 && (
          <div style={slideBaseStyle}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', letterSpacing: '.02em' }}>하이라이트 · 소비</div>
            <div style={{ fontSize: 23, fontWeight: 700, lineHeight: 1.4, marginTop: 18 }}>
              가장 많이 지출한
              <br />
              카테고리는
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
              {[
                { label: '주거', pct: 100, color: 'var(--ramp-1)' },
                { label: '식비', pct: 60, color: 'var(--ramp-2)' },
                { label: '여가', pct: 46, color: 'var(--ramp-3)' },
              ].map((row) => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 64, flex: 'none', fontSize: 11.5, color: 'var(--text-mid)' }}>{row.label}</span>
                  <div style={{ flex: 1, height: 8, background: 'var(--track)', borderRadius: 4 }}>
                    <div style={{ width: `${row.pct}%`, height: '100%', background: row.color, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 'auto' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-mid)' }}>주거</div>
              {amountsHidden ? (
                <div style={{ fontSize: 38, fontWeight: 700, marginTop: 8, letterSpacing: '-.02em' }}>지출의 27.6%</div>
              ) : (
                <div style={{ fontSize: 38, fontWeight: 700, marginTop: 8, letterSpacing: '-.02em' }}>
                  1,340,000
                  <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-mid)' }}>원</span>
                </div>
              )}
              <div style={{ fontSize: 13, color: 'var(--text-mid)', fontWeight: 500, marginTop: 16, paddingTop: 16, borderTop: '0.5px solid var(--border)' }}>
                이번 달 저축률 <b style={{ color: 'var(--sav-text)', fontWeight: 700 }}>40%</b> · 최근 6개월 평균 36%
              </div>
            </div>
          </div>
        )}

        {reportSlide === 3 && (
          <div style={slideBaseStyle}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', letterSpacing: '.02em' }}>비교</div>
            <div style={{ fontSize: 23, fontWeight: 700, lineHeight: 1.4, marginTop: 18 }}>
              전월 · 전년 대비
              <br />
              이렇게 달라졌어요
            </div>
            <svg viewBox="0 0 320 60" style={{ width: '100%', height: 60, marginTop: 20 }} preserveAspectRatio="none">
              <line x1="0" y1="45" x2="320" y2="12" style={{ stroke: 'var(--accent)' }} strokeWidth="2" strokeLinecap="round" />
              <circle cx="0" cy="45" r="4" style={{ fill: 'var(--text-weak)' }} />
              <circle cx="320" cy="12" r="4" style={{ fill: 'var(--accent)' }} />
              <text x="0" y="38" style={{ fontSize: 11, fill: 'var(--text-weak)' }}>전년 6월</text>
              <text x="248" y="6" style={{ fontSize: 11, fill: 'var(--accent)', fontWeight: 700 }}>이번 6월</text>
            </svg>
            <div style={{ marginTop: 'auto' }}>
              <div style={{ fontSize: 13, color: 'var(--text-mid)', fontWeight: 700 }}>전월 대비 총자산</div>
              <div style={{ fontSize: 38, fontWeight: 700, marginTop: 8, letterSpacing: '-.02em' }}>+2.3%</div>
              <div style={{ fontSize: 13, color: 'var(--text-mid)', fontWeight: 500, marginTop: 16, paddingTop: 16, borderTop: '0.5px solid var(--border)' }}>
                전년 동월 대비 <b style={{ color: 'var(--up)', fontWeight: 700 }}>+18.6%</b>
              </div>
            </div>
          </div>
        )}

        {reportSlide === 4 && (
          <div style={slideBaseStyle}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', letterSpacing: '.02em' }}>2026년 6월의 당신</div>
            <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.3, marginTop: 18, letterSpacing: '-.02em' }}>착실한 복리형</div>
            <div style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 10, lineHeight: 1.5 }}>수입의 40%를 저축했고, 자산은 2.3% 늘었어요</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 24 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-weak)' }}>저축률</div>
                <div style={{ fontSize: 17, fontWeight: 700, marginTop: 4 }}>40%</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-weak)' }}>자산 증감률</div>
                <div style={{ fontSize: 17, fontWeight: 700, marginTop: 4, color: 'var(--up)' }}>+2.3%</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-weak)' }}>최대 지출</div>
                <div style={{ fontSize: 17, fontWeight: 700, marginTop: 4 }}>주거</div>
              </div>
            </div>
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                {/* 확정 심볼 — secret/monit-symbol-spec.md §3-1(라이트). 20px에서도 같은 코드를 쓴다(규격 §4).
                    이 오버레이는 문서에 한 번만 열리므로 id는 고정값으로 충분하다. */}
                <svg width="20" height="20" viewBox="0 0 100 100">
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
              <button className="qbtn" style={{ padding: 15, borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                이미지로 저장
              </button>
              <button className="qbtn" style={{ padding: 15, borderRadius: 10, border: '0.5px solid var(--border)', background: 'transparent', color: 'var(--text-strong)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                공유하기
              </button>
            </div>
          </div>
        )}

        {!isFirstReportSlide && (
          <button
            onClick={prevReportSlide}
            style={{ position: 'absolute', top: '50%', left: 10, transform: 'translateY(-50%)', width: navBtnSize, height: navBtnSize, borderRadius: 999, border: '0.5px solid var(--border)', background: 'var(--surface)', boxShadow: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <Icon name="chevron_left" size={20} color="var(--text-mid)" />
          </button>
        )}
        {!isLastReportSlide && (
          <button
            onClick={nextReportSlide}
            style={{ position: 'absolute', top: '50%', right: 10, transform: 'translateY(-50%)', width: navBtnSize, height: navBtnSize, borderRadius: 999, border: '0.5px solid var(--border)', background: 'var(--surface)', boxShadow: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <Icon name="chevron_right" size={20} color="var(--text-mid)" />
          </button>
        )}
      </div>
    </div>
  )
}
