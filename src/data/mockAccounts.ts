// Source: secret/Asset Manager v14.dc.html L3721-3740 (accounts) — transcribed verbatim.
// Primarily Assets-screen data (Phase 10), but also consulted by Ledger's modalLedgerEntry
// (withdrawAcctObj lookup for the invest-gain/principal breakdown, L4308-4312) — kept here as the
// single shared source rather than duplicated per screen.

export interface AccountTx {
  date: string
  desc: string
  tag: string
  tagBg: string
  tagColor: string
  amount: string
  positive: boolean
}

export interface Account {
  id: string
  group: '은행 · 현금' | '주식 · 투자'
  name: string
  sub: string
  balance: number
  icon: string
  iconBg: string
  iconColor: string
  badge: { text: string; positive: boolean; bg?: string; fg?: string } | null
  dday?: string
  trend: string
  tx: AccountTx[]
}

export const accounts: Account[] = [
  {
    id: 'a0', group: '은행 · 현금', name: '신한은행 예금', sub: '정기예금 · 연 3.8%', balance: 312400000,
    icon: 'account_balance', iconBg: 'var(--fill-subtle)', iconColor: 'var(--accent)', badge: null,
    trend: 'M0 34 L20 30 L40 26 L60 22 L80 16 L100 10',
    tx: [
      { date: '06.25', desc: '이자 지급', tag: '이자', tagBg: 'var(--fill-subtle)', tagColor: 'var(--text-mid)', amount: '+12,400', positive: true },
      { date: '05.25', desc: '이자 지급', tag: '이자', tagBg: 'var(--fill-subtle)', tagColor: 'var(--text-mid)', amount: '+12,100', positive: true },
      { date: '04.02', desc: '정기예금 추가 납입', tag: '이체', tagBg: 'var(--fill-subtle)', tagColor: 'var(--text-mid)', amount: '+50,000,000', positive: true },
    ],
  },
  {
    id: 'a1', group: '은행 · 현금', name: '카카오뱅크 적금', sub: '자유적금 · 연 4.2% · 만기 12.14', balance: 88200000,
    icon: 'savings', iconBg: 'var(--fill-subtle)', iconColor: 'var(--text-mid)', badge: null, dday: 'D−167',
    trend: 'M0 36 L20 33 L40 28 L60 24 L80 18 L100 12',
    tx: [
      { date: '06.27', desc: '적금 이자 입금', tag: '이자', tagBg: 'var(--fill-subtle)', tagColor: 'var(--text-mid)', amount: '+32,000', positive: true },
      { date: '06.14', desc: '자동이체 납입', tag: '자동이체', tagBg: 'var(--fill-subtle)', tagColor: 'var(--text-mid)', amount: '+1,000,000', positive: true },
      { date: '05.14', desc: '자동이체 납입', tag: '자동이체', tagBg: 'var(--fill-subtle)', tagColor: 'var(--text-mid)', amount: '+1,000,000', positive: true },
    ],
  },
  {
    id: 'a2', group: '은행 · 현금', name: '파킹통장', sub: '수시입출금 · 연 2.6%', balance: 87600000,
    icon: 'wallet', iconBg: 'var(--fill-subtle)', iconColor: 'var(--text-mid)', badge: null,
    trend: 'M0 30 L20 31 L40 28 L60 26 L80 22 L100 20',
    tx: [
      { date: '06.25', desc: '급여 입금', tag: '월급', tagBg: 'var(--fill-subtle)', tagColor: 'var(--text-mid)', amount: '+8,500,000', positive: true },
      { date: '06.10', desc: '넷플릭스 프리미엄', tag: '구독', tagBg: 'var(--fill-subtle)', tagColor: 'var(--text-mid)', amount: '−17,000', positive: false },
      { date: '06.08', desc: '외식 · 식비', tag: '식비', tagBg: 'var(--fill-subtle)', tagColor: 'var(--text-mid)', amount: '−68,500', positive: false },
    ],
  },
  {
    id: 'a3', group: '주식 · 투자', name: '미래에셋 (해외)', sub: 'USD 평가 · 환율 1,378.50', balance: 268000000,
    icon: 'public', iconBg: 'var(--fill-subtle)', iconColor: 'var(--up)', badge: { text: '+9.8%', positive: true },
    trend: 'M0 40 L20 34 L40 30 L60 22 L80 14 L100 6',
    tx: [
      { date: '06.28', desc: 'NVIDIA 매수', tag: '투자', tagBg: 'var(--fill-subtle)', tagColor: 'var(--text-mid)', amount: '−18,200,000', positive: false },
      { date: '06.15', desc: 'Apple 배당금', tag: '배당', tagBg: 'var(--fill-subtle)', tagColor: 'var(--text-mid)', amount: '+410,000', positive: true },
      { date: '05.30', desc: 'Tesla 매도', tag: '투자', tagBg: 'var(--fill-subtle)', tagColor: 'var(--text-mid)', amount: '+6,120,000', positive: true },
    ],
  },
  {
    id: 'a4', group: '주식 · 투자', name: '미래에셋 (국내)', sub: '국내주식 · 12종목', balance: 124000000,
    icon: 'trending_up', iconBg: 'var(--fill-subtle)', iconColor: 'var(--up)', badge: { text: '+12.4%', positive: true },
    trend: 'M0 38 L20 32 L40 34 L60 24 L80 20 L100 8',
    tx: [
      { date: '06.28', desc: '삼성전자 매수', tag: '투자', tagBg: 'var(--fill-subtle)', tagColor: 'var(--text-mid)', amount: '−2,418,000', positive: false },
      { date: '06.03', desc: 'SK하이닉스 매수', tag: '투자', tagBg: 'var(--fill-subtle)', tagColor: 'var(--text-mid)', amount: '−5,600,000', positive: false },
    ],
  },
  {
    id: 'a5', group: '주식 · 투자', name: '키움증권', sub: '국내주식 · 5종목', balance: 58000000,
    icon: 'candlestick_chart', iconBg: 'var(--accent-soft)', iconColor: 'var(--accent)', badge: { text: '−3.2%', positive: false },
    trend: 'M0 12 L20 18 L40 16 L60 24 L80 28 L100 34',
    tx: [
      { date: '06.20', desc: 'NAVER 매도', tag: '투자', tagBg: 'var(--fill-subtle)', tagColor: 'var(--text-mid)', amount: '+3,200,000', positive: true },
      { date: '05.11', desc: '카카오 매수', tag: '투자', tagBg: 'var(--fill-subtle)', tagColor: 'var(--text-mid)', amount: '−4,100,000', positive: false },
    ],
  },
]

// Source: L3742-3746 — badge bg/fg color derivation, applied once here so both consumers share it.
accounts.forEach((a) => {
  if (a.badge) {
    a.badge.bg = a.badge.positive ? 'var(--up-chip)' : 'var(--down-chip)'
    a.badge.fg = a.badge.positive ? 'var(--up)' : 'var(--down)'
  }
})

export const acctOptions = ['파킹통장', '신한은행 정기예금', '카카오뱅크 적금', '미래에셋 (국내)', '미래에셋 (해외)', '업비트']
