// 자산 목표 추가·수정 모달. GET/PUT /goals에 연결돼 있다. z-index 80, 너비 440px, maxHeight 86vh.
// 닫으면 `addGoalReturnTo`로 돌아간다(이 모달을 연 화면/모달 — 대시보드는 null, 설정의 CustomModal은
// 'custom'을 넘긴다). closeAddAccount와 같은 return-to 패턴이다.
//
// 목표 자산 / 월평균 수입은 로컬 폼 상태(useState) + formatNumber/parseAmount로 제어되는 입력이다.
// 월평균 수입의 초기 제안값은 서버가 주지 않아 GET /transactions/summaries/monthly의 최근 3개월
// incomeTotal 평균으로 프론트가 계산한다 — 이미 저장된 목표가 있으면(isUnset === false) 저장된
// monthlyIncome이 우선한다.

import { useEffect, useState } from 'react'
import type { ChangeEvent, CSSProperties } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal } from '../../../components/primitives/Modal/Modal'
import { DatePicker } from '../../../components/primitives/DatePicker/DatePicker'
import { useAppState } from '../../../state/AppStateContext'
import { useDatePicker } from '../../../state/selectors/datePicker'
import { formatNumber, parseAmount } from '../../../utils/format'
import { isoDateToDisplay, isoDateToNav, pickedToISODate, toISODate, yearEndISODate } from '../../../utils/date'
import { useGetGoal, usePutGoal } from '@/services/goal'
import { useGetMonthlySummaries } from '@/services/transaction'
import type { UpsertGoalRequest } from '@/services/goal'

const LABEL_STYLE: CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }
const FIELD_BORDER_STYLE: CSSProperties = { border: '0.5px solid var(--border)', borderRadius: 10, padding: '13px 16px' }

function moneyInputChange(setter: (n: number) => void) {
  return (e: ChangeEvent<HTMLInputElement>) => setter(parseAmount(e.target.value))
}

export function AddGoalModal() {
  const { state, setState } = useAppState()
  const isOpen = state.modalOpen === 'addGoal'

  const goalQuery = useGetGoal({}, { enabled: isOpen })
  const { goal, isUnset } = goalQuery
  const putGoal = usePutGoal()

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  // 목표를 아직 등록하지 않았을 때만 필요한 제안값이라, 그 경우에만 불러온다.
  const monthlySummaryQuery = useGetMonthlySummaries(currentYear, { enabled: isOpen && isUnset })
  const recentIncomeMonths = [...monthlySummaryQuery.summaries]
    .sort((a, b) => a.month - b.month)
    .filter((s) => s.month <= currentMonth)
    .slice(-3)
  const suggestedMonthlyIncome = recentIncomeMonths.length
    ? Math.round(recentIncomeMonths.reduce((sum, s) => sum + s.incomeTotal, 0) / recentIncomeMonths.length)
    : 0

  const [targetAmount, setTargetAmount] = useState(0)
  const [monthlyIncome, setMonthlyIncome] = useState(0)
  const [formInitialized, setFormInitialized] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // 저장된 목표가 있으면 그 targetDate가 우선이고, 없을 때만 "입력일이 속한 해의 12월 31일"을
  // 기본값으로 채운다(연말·연초 상관없이 오늘 기준 연도). 매 렌더 재계산이라 날짜가 바뀌는
  // 자정 무렵에도 항상 오늘 기준 값을 쓴다 — 모달을 열어둔 채 자정을 넘기는 경우는 고려하지 않는다.
  const defaultGoalTargetDate = yearEndISODate()
  const goalTargetDateForDisplay = goal?.targetDate ?? defaultGoalTargetDate
  const ddGoalDate = useDatePicker('goal', isoDateToDisplay(goalTargetDateForDisplay), isoDateToNav(goalTargetDateForDisplay))

  // 폼 초기값 채우기(예외적으로 허용 — docs/state-management.md "서버 데이터를 AppState로 복사하지
  // 말 것. 단, 폼 초기값을 채우는 것은 예외"). 렌더 도중 setState를 부르면 안 되므로 커밋 이후
  // useEffect에서 한다(EditAccountModal과 동일한 이유).
  useEffect(() => {
    if (!isOpen) {
      setFormInitialized(false)
      return
    }
    if (formInitialized) return
    if (!goalQuery.isSuccess || !goal) return
    if (isUnset) {
      // 제안값 조회가 실패해도(가계부 조회 오류) 목표 등록 자체는 막지 않는다 — 실패 시 0으로 시작.
      if (monthlySummaryQuery.isPending) return
      setTargetAmount(0)
      setMonthlyIncome(suggestedMonthlyIncome)
      // 목표 시점도 표시 중인 기본값(올해 12/31)을 dpPicked에 실제로 채워 넣는다 — 위 ddGoalDate의
      // defaultDisplay는 화면 표시용일 뿐이라, 사용자가 달력을 건드리지 않고 그대로 저장을 누르면
      // handleSave가 읽는 datePickerPicked['goal']이 비어 "목표 시점을 선택해주세요" 오류로 이어진다.
      const [y, m, d] = defaultGoalTargetDate.split('-').map(Number)
      setState((prev) => ({ datePickerPicked: { ...prev.datePickerPicked, goal: { y, m, d } } }))
    } else {
      setTargetAmount(goal.targetAmount)
      setMonthlyIncome(goal.monthlyIncome)
    }
    setFormInitialized(true)
  }, [
    isOpen,
    formInitialized,
    goalQuery.isSuccess,
    goal,
    isUnset,
    monthlySummaryQuery.isPending,
    suggestedMonthlyIncome,
    defaultGoalTargetDate,
    setState,
  ])

  if (!isOpen) return null

  const closeGoalModal = () => {
    setState((prev) => ({
      modalOpen: prev.addGoalReturnTo,
      addGoalReturnTo: null,
      datePickerPicked: { ...prev.datePickerPicked, goal: undefined },
      datePickerNav: { ...prev.datePickerNav, goal: undefined },
      openDropdown: null,
    }))
    // 이 모달은 AppShell에 항상 마운트되어 있어 닫아도 언마운트되지 않는다.
    setFormInitialized(false)
    setFormError(null)
    putGoal.reset()
  }

  const handleSave = () => {
    const picked = state.datePickerPicked['goal'] as { y: number; m: number; d: number } | undefined
    const targetDate = picked ? pickedToISODate(picked) : (goal?.targetDate ?? null)
    const todayISO = toISODate(new Date())

    if (targetAmount <= 0) {
      setFormError('목표 자산을 입력해주세요')
      return
    }
    if (!targetDate) {
      setFormError('목표 시점을 선택해주세요')
      return
    }
    // 오늘도 막는다(`<` 아님) — 목표 시점이 오늘이면 남은 기간이 0개월이 되어 "월 필요 저축액"
    // 계산(targetAmount / 남은 개월 수)이 성립하지 않는다. 문구("오늘 이후로")와 로직이 어긋나 있던
    // 결함이라 사실에 맞게 로직 쪽을 고쳤다.
    if (targetDate <= todayISO) {
      setFormError('목표 시점은 오늘 이후로 선택해주세요')
      return
    }
    setFormError(null)

    const body: UpsertGoalRequest = { targetAmount, targetDate, monthlyIncome }
    putGoal.mutate(body, {
      onSuccess: closeGoalModal,
      onError: (err) => setFormError(err.message),
    })
  }

  const isBusy = putGoal.isPending
  // 저장된 목표 기준 미리보기라 폼에서 수정 중인 targetAmount/monthlyIncome이 아니라 goal(서버값)을
  // 그대로 쓴다 — 계산 자체가 서버 책임이라 프론트에서 다시 산출하지 않는다(A-9).
  const monthlyNeeded = !isUnset && goal ? goal.monthly.targetAmount : null
  const monthlySpendableAmt = !isUnset && goal ? goal.monthlySpendableAmount : null
  const monthlyShortfallAmt = !isUnset && goal ? goal.monthlyShortfallAmount : null
  const feasibility = !isUnset && goal ? goal.feasibility : null

  return (
    <Modal onClose={closeGoalModal} zIndex={80} width={440}>
      {!!state.openDropdown && (
        <div onClick={() => setState({ openDropdown: null })} style={{ position: 'absolute', inset: 0, zIndex: 94 }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <span style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="flag" size={20} />
          </span>
          <div style={{ fontSize: 16.5, fontWeight: 700 }}>자산 목표 설정</div>
        </div>
        <button
          onClick={closeGoalModal}
          style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--track)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <Icon name="close" size={19} color="var(--text-mid)" />
        </button>
      </div>

      {goalQuery.error ? (
        <div style={{ fontSize: 11.5, color: 'var(--down)' }}>{goalQuery.error.message}</div>
      ) : !formInitialized ? (
        <div aria-busy style={{ fontSize: 12.5, color: 'var(--text-weak)' }}>—</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <div style={LABEL_STYLE}>연간 목표 자산</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...FIELD_BORDER_STYLE }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-weak)' }}>₩</span>
              <input
                type="text" inputMode="numeric" placeholder="0"
                value={targetAmount ? formatNumber(targetAmount) : ''}
                onChange={moneyInputChange(setTargetAmount)}
                style={{ border: 'none', outline: 'none', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', width: '100%', color: 'var(--text-strong)' }}
              />
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <div style={LABEL_STYLE}>목표 시점</div>
            <DatePicker dp={ddGoalDate} />
            {/* 바로 아래 '월평균 수입'과 똑같이 시스템이 채운 값인데 안내가 없으면, 사용자가 직접 고른
                날짜로 착각한 채 저장한다. 목표 시점은 '월 필요 저축액' 계산에 그대로 들어가는 값이라
                근거까지 함께 알린다. 이미 저장된 목표를 여는 경우(!isUnset)는 서버 값이므로 숨긴다. */}
            {isUnset && (
              <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 6 }}>
                올해 말일로 기본 설정돼요 · 날짜를 바꾸면 월 필요 저축액도 다시 계산돼요
              </div>
            )}
          </div>
          <div>
            <div style={LABEL_STYLE}>월평균 수입</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...FIELD_BORDER_STYLE }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-weak)' }}>₩</span>
              <input
                type="text" inputMode="numeric" placeholder="0"
                value={monthlyIncome ? formatNumber(monthlyIncome) : ''}
                onChange={moneyInputChange(setMonthlyIncome)}
                style={{ border: 'none', outline: 'none', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', width: '100%', color: 'var(--text-strong)' }}
              />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 6 }}>가계부 최근 3개월 평균이 자동 입력돼요 · 직접 수정할 수 있어요</div>
          </div>
          <div style={{ background: 'var(--fill-subtle)', borderRadius: 10, padding: '14px 16px' }}>
            {monthlyNeeded === null ? (
              <div style={{ fontSize: 11.5, color: 'var(--text-weak)' }}>목표를 저장하면 월 필요 저축액과 지출 가능액을 계산해드려요</div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                  <span>월 필요 저축액</span>
                  <span>{formatNumber(monthlyNeeded)}원</span>
                </div>
                {feasibility === 'INFEASIBLE' ? (
                  // 서버가 지출 가능액에 하한 0을 적용해도 "쓸 수 있는 돈이 0원"이라는 말은
                  // 목표를 못 채운다는 사실을 가린다 — 부족액을 명시하는 안내 문장으로 대체한다.
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)' }}>
                    지금 수입으로는 이 목표를 맞추기 어려워요
                    {monthlyShortfallAmt !== null && monthlyShortfallAmt > 0
                      ? ` · 월 ${formatNumber(monthlyShortfallAmt)}원 부족`
                      : ''}
                  </div>
                ) : monthlySpendableAmt !== null ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
                      <span>월 지출 가능액</span>
                      <span>{formatNumber(monthlySpendableAmt)}원</span>
                    </div>
                    {feasibility === 'TIGHT' && (
                      <div style={{ fontSize: 11.5, color: 'var(--text-mid)', marginTop: 6 }}>
                        여유가 많지 않아요 · 지출을 아끼면 도달할 수 있어요
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ fontSize: 11.5, color: 'var(--text-weak)' }}>월 지출 가능액을 계산할 수 없어요</div>
                )}
                <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 8 }}>투자 수익은 반영하지 않은 계산이에요</div>
              </>
            )}
          </div>
          {formError && <div style={{ fontSize: 11.5, color: 'var(--down)' }}>{formError}</div>}
          <button
            onClick={handleSave}
            disabled={isBusy}
            aria-busy={isBusy}
            className="qbtn"
            style={{ padding: 14, borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: isBusy ? 'default' : 'pointer', opacity: isBusy ? 0.7 : 1, transition: 'transform .12s' }}
          >
            {isBusy ? '저장 중…' : '목표 저장'}
          </button>
        </div>
      )}
    </Modal>
  )
}
