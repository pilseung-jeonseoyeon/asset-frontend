// C안 "다가오는 고정 지출" 카드 — GET /subscriptions(FIXED, SUBSCRIPTION) 두 목록을 합쳐 다음
// 결제일 가까운 순 4개. buildSubscriptionRows(ledgerView.ts)를 재사용해 Ledger.tsx와 같은 표기를 쓴다.

import { useNavigate } from 'react-router-dom'
import { Card } from '../../../components/primitives/Card/Card'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { useAppState } from '../../../state/AppStateContext'
import { daysInMonth } from '../../../utils/date'
import { buildSubscriptionRows, type SubscriptionRow } from '../../../data/ledgerView'
import { CARD_LINK_STYLE, CARD_TITLE_STYLE, DASHED_CTA_STYLE, EMPTY_TEXT_STYLE, ERROR_TEXT_STYLE } from './cardStyles'
import { useGetAccounts } from '@/services/account'
import { useGetSubscriptions } from '@/services/subscription'

const SHOWN_COUNT = 4

interface UpcomingRow extends SubscriptionRow {
  /** 다음 결제가 이번 달인지 다음 달인지 반영한 "N월 N일 결제 예정" 문구. */
  upcomingDateLabel: string
  distanceDays: number
}

/**
 * 결제일(paymentDay)만으로는 "몇 월"인지 알 수 없다 — 오늘이 그 날짜를 이미 지났으면 다음 결제는
 * 다음 달이다. 결제일이 그 달에 없는 날짜(2월의 30·31일, 30일까지인 달의 31일)면 그 달의 마지막
 * 날로 당긴다 — "2월 31일"처럼 존재하지 않는 날짜를 화면에 쓰지 않기 위해서다(서버가 실제로 며칠에
 * 청구하는지는 계약에 없으므로 표기용 근사값이다). 거리(distanceDays)는 실제 달력 일수로 센다.
 */
function withUpcomingDate(rows: SubscriptionRow[], today: Date): UpcomingRow[] {
  const todayDay = today.getDate()
  const thisYear = today.getFullYear()
  const thisMonth = today.getMonth() + 1
  const nextYear = thisMonth === 12 ? thisYear + 1 : thisYear
  const nextMonth = thisMonth === 12 ? 1 : thisMonth + 1
  const thisMonthDay = (paymentDay: number) => Math.min(paymentDay, daysInMonth(thisYear, thisMonth))
  return rows.map((row) => {
    const dayThisMonth = thisMonthDay(row.paymentDay)
    const isThisMonth = dayThisMonth >= todayDay
    const month = isThisMonth ? thisMonth : nextMonth
    const day = isThisMonth ? dayThisMonth : Math.min(row.paymentDay, daysInMonth(nextYear, nextMonth))
    const distanceDays = isThisMonth
      ? dayThisMonth - todayDay
      : daysInMonth(thisYear, thisMonth) - todayDay + day
    return {
      ...row,
      upcomingDateLabel: `${month}월 ${day}일 결제 예정`,
      distanceDays,
    }
  })
}

function sortByUpcomingPaymentDay(rows: UpcomingRow[]): UpcomingRow[] {
  return [...rows].sort((a, b) => a.distanceDays - b.distanceDays)
}

export function UpcomingSubscriptionsCard() {
  const { setState } = useAppState()
  const navigate = useNavigate()
  const fixedQuery = useGetSubscriptions('FIXED')
  const subscriptionQuery = useGetSubscriptions('SUBSCRIPTION')
  const accountsQuery = useGetAccounts()

  const isPending = fixedQuery.isPending || subscriptionQuery.isPending || accountsQuery.isPending
  const error = fixedQuery.error ?? subscriptionQuery.error ?? accountsQuery.error

  const accounts = accountsQuery.data ?? []
  const allActive = [...fixedQuery.activeSubscriptions, ...subscriptionQuery.activeSubscriptions]
  const rows = buildSubscriptionRows(allActive, accounts)
  const upcoming = sortByUpcomingPaymentDay(withUpcomingDate(rows, new Date())).slice(0, SHOWN_COUNT)

  const openAddFixedExpense = () =>
    setState({
      openModal: 'fixedExpense',
      recurringType: 'fixed',
      editingRecurringId: null,
      recurringName: '',
      recurringAmount: 0,
      recurringSubcategoryId: null,
      recurringAccountId: null,
      recurringPaymentDay: '25일',
      openDropdown: null,
    })

  return (
    <Card style={{ padding: 24 }} aria-busy={isPending}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={CARD_TITLE_STYLE}>다가오는 고정 지출</div>
        {/* 같은 C안의 지출 TOP 5 카드와 같은 링크 규격 — 결제 항목을 고치려면 가계부로 가야 한다. */}
        <button type="button" onClick={() => navigate('/ledger')} style={CARD_LINK_STYLE}>
          가계부에서 보기 ›
        </button>
      </div>
      {isPending ? (
        <div aria-busy style={EMPTY_TEXT_STYLE}>—</div>
      ) : error ? (
        <div style={ERROR_TEXT_STYLE}>{error.message}</div>
      ) : upcoming.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={EMPTY_TEXT_STYLE}>고정 지출을 등록하면 다음 결제일을 알려드려요</div>
          <button onClick={openAddFixedExpense} className="qbtn" style={DASHED_CTA_STYLE}>
            <Icon name="add" size={16} />
            고정 지출 추가
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {upcoming.map((row, i) => (
            <div
              key={row.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '11px 0',
                borderBottom: i === upcoming.length - 1 ? 'none' : '0.5px solid var(--track)',
              }}
            >
              <span style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--fill-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                <Icon name={row.icon} size={18} color="var(--text-mid)" />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 2 }}>{row.upcomingDateLabel}</div>
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--exp-text)', flex: 'none' }}>
                −{row.amountText}
                <span style={{ fontSize: 11, color: 'var(--text-weak)', fontWeight: 600, marginLeft: 2 }}>원</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
