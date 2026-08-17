// Source: secret/Asset Manager v14.dc.html L1990-2069 (modalAddGoal) — layout transcribed verbatim,
// then wired to GET/PUT /goals (previously uncontrolled/no-op — see git history). z-index 80,
// width 440px, maxHeight 86vh. closeGoalModal returns to `addGoalReturnTo` (whatever
// screen/modal opened it — Dashboard passes null, Settings' CustomModal passes 'custom'), same
// return-to pattern as closeAddAccount.
//
// Adapted vs. source: 목표 자산 / 월평균 수입은 이제 로컬 폼 상태(useState) + fmt/parseAmount로 제어되는
// 입력이다(원본의 defaultValue+onInput은 아무 값도 저장하지 않는 장식이었다). 월평균 수입의 초기
// 제안값은 API-SPEC §5.2 각주대로 서버가 주지 않아 GET /transactions/summaries/monthly의 최근 3개월
// incomeTotal 평균으로 프론트가 직접 계산한다 — 이미 저장된 목표가 있으면(isUnset === false) 저장된
// monthlyIncome이 우선한다.

import { useEffect, useState } from 'react'
import type { ChangeEvent, CSSProperties } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal } from '../../../components/primitives/Modal/Modal'
import { DatePicker } from '../../../components/primitives/DatePicker/DatePicker'
import { useAppState } from '../../../state/AppStateContext'
import { useDatePicker } from '../../../state/selectors/datePicker'
import { fmt, parseAmount } from '../../../utils/format'
import { isoDateToDisplay, isoDateToNav, pickedToISODate, toISODate } from '../../../utils/date'
import { monthlySpendable as calcMonthlySpendable } from '../../../data/dashboardView'
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

  const ddGoalDate = useDatePicker(
    'goal',
    goal?.targetDate ? isoDateToDisplay(goal.targetDate) : '목표 시점을 선택하세요',
    isoDateToNav(goal?.targetDate ?? null),
  )

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
    } else {
      setTargetAmount(goal.targetAmount)
      setMonthlyIncome(goal.monthlyIncome)
    }
    setFormInitialized(true)
  }, [isOpen, formInitialized, goalQuery.isSuccess, goal, isUnset, monthlySummaryQuery.isPending, suggestedMonthlyIncome])

  if (!isOpen) return null

  const closeGoalModal = () => {
    setState((st) => ({
      modalOpen: st.addGoalReturnTo,
      addGoalReturnTo: null,
      dpPicked: { ...st.dpPicked, goal: undefined },
      dpNav: { ...st.dpNav, goal: undefined },
      openDropdown: null,
    }))
    // 이 모달은 AppShell에 항상 마운트되어 있어 닫아도 언마운트되지 않는다.
    setFormInitialized(false)
    setFormError(null)
    putGoal.reset()
  }

  const handleSave = () => {
    const picked = state.dpPicked['goal'] as { y: number; m: number; d: number } | undefined
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
    if (targetDate < todayISO) {
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
  const monthlyNeeded = !isUnset && goal ? goal.monthly.targetAmount : null
  // 저장된 목표 기준 미리보기라 폼에서 수정 중인 targetAmount/monthlyIncome이 아니라 goal(서버값)로
  // 계산한다 — dashboardView.ts의 공용 계산식을 그대로 쓴다(값이 두 군데서 갈리지 않도록).
  const monthlySpendableAmt = !isUnset && goal ? calcMonthlySpendable(goal) : null

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
                value={targetAmount ? fmt(targetAmount) : ''}
                onChange={moneyInputChange(setTargetAmount)}
                style={{ border: 'none', outline: 'none', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', width: '100%', color: 'var(--text-strong)' }}
              />
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <div style={LABEL_STYLE}>목표 시점</div>
            <DatePicker dp={ddGoalDate} />
          </div>
          <div>
            <div style={LABEL_STYLE}>월평균 수입</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...FIELD_BORDER_STYLE }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-weak)' }}>₩</span>
              <input
                type="text" inputMode="numeric" placeholder="0"
                value={monthlyIncome ? fmt(monthlyIncome) : ''}
                onChange={moneyInputChange(setMonthlyIncome)}
                style={{ border: 'none', outline: 'none', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', width: '100%', color: 'var(--text-strong)' }}
              />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 6 }}>가계부 최근 3개월 평균이 자동 입력돼요 · 직접 수정할 수 있어요</div>
          </div>
          <div style={{ background: 'var(--fill-subtle)', borderRadius: 10, padding: '14px 16px' }}>
            {monthlyNeeded === null || monthlySpendableAmt === null ? (
              <div style={{ fontSize: 11.5, color: 'var(--text-weak)' }}>목표를 저장하면 월 필요 저축액과 지출 가능액을 계산해드려요</div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                  <span>월 필요 저축액</span>
                  <span>{fmt(monthlyNeeded)}원</span>
                </div>
                {monthlySpendableAmt >= 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
                    <span>월 지출 가능액</span>
                    <span>{fmt(monthlySpendableAmt)}원</span>
                  </div>
                ) : (
                  // 월평균 수입보다 월 필요 저축액이 커서 "지출 가능액"이 음수인 경우 — 음수 금액을
                  // 그대로 보여주면 성립하지 않는 말이 되므로(−2,300만원을 쓸 수 있다는 말은 없다)
                  // 부족액을 명시하는 안내 문장으로 대체한다.
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)' }}>
                    현재 수입으로는 이 목표를 달성하기 어려워요 · 월 {fmt(Math.abs(monthlySpendableAmt))}원 부족
                  </div>
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
