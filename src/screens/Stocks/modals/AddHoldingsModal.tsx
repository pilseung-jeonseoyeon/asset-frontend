// 주식 화면의 "보유 종목 추가" 진입점(2026-08-20 추가). dc.html 원본에 대응 블록이 없는 새 모달이다.
//
// 왜 필요했나: 계좌를 새로 만들 때는 AddAccountModal이 CreateAccountRequest.holdings로 보유 종목을
// 한 번에 담을 수 있는데, **이미 만들어 둔 계좌**에는 그 흐름이 없었다. 기존 계좌에 이미 갖고 있던
// 종목 여러 개를 넣으려면 매수 모달(QuickStockModal)을 종목 수만큼 열고 닫아야 했다.
//
// 서버 계약: "기존 계좌에 보유 종목 일괄 등록" 엔드포인트는 없다(GET /stocks/holdings는 조회 전용,
// POST /accounts의 holdings는 계좌 생성 시에만). 그래서 여기서는 담은 줄 수만큼 POST /trades(BUY)를
// 순차로 보낸다 — 순차인 이유와 부분 실패 처리는 usePostTradesBulk(trade.hook.ts) 주석 참고.
//
// 계좌를 먼저 고르는 순서인 이유: 계좌 유형이 시장(KR/US/CRYPTO)을 결정하고, 시장이 다시 종목 검색
// 결과·평균단가 통화·수량 단위를 결정한다(marketOfAccountType). QuickStockModal은 반대로 시장 탭을
// 먼저 고르지만, 여기서는 "이 계좌에 담긴 것을 채워 넣는다"가 사용자의 머릿속 순서다.
//
// 입력 블록 자체는 AccountHoldingsField를 그대로 재사용한다(검색 팝오버·담은 목록·수량/평단가 인라인
// 입력). 다른 점은 안내 문구뿐이다 — 계좌 등록 폼은 체결일이 무조건 오늘이지만 이 모달은 기준일을
// 직접 고를 수 있어서, hint prop으로 문구를 갈아끼운다.

import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal, ModalHeader } from '../../../components/primitives/Modal/Modal'
import { Dropdown } from '../../../components/primitives/Dropdown/Dropdown'
import { DatePicker } from '../../../components/primitives/DatePicker/DatePicker'
import { BankIcon } from '../../../components/primitives/BankIcon/BankIcon'
import { useAppState } from '../../../state/AppStateContext'
import { useEntityDropdown } from '../../../state/selectors/dropdown'
import { useDatePicker } from '../../../state/selectors/datePicker'
import { isoDateToDisplay, isoDateToNav, pickedToISODate, toISODate } from '../../../utils/date'
import { accountInstitutionMeta, filterHoldingAccounts, marketOfAccountType } from '../../../data/stocksView'
import { AccountHoldingsField } from '../../Assets/modals/AccountHoldingsField'
import type { DraftHolding } from '../../Assets/modals/AccountHoldingsField'
import { useGetAccounts } from '@/services/account'
import { useGetInstitutions } from '@/services/institution'
import { usePostTradesBulk } from '@/services/trade'
import type { CreateTradeRequest } from '@/services/trade'

const LABEL_STYLE: CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }
const FIELD_BORDER_STYLE: CSSProperties = { border: '0.5px solid var(--border)', borderRadius: 10, padding: '13px 16px' }
const ERROR_STYLE: CSSProperties = { fontSize: 11.5, color: 'var(--down)', marginTop: 6 }
const NOTE_STYLE: CSSProperties = { fontSize: 11.5, color: 'var(--text-weak)', marginTop: 6, lineHeight: 1.6 }

export function AddHoldingsModal() {
  const { state, setState } = useAppState()
  const isOpen = state.modalOpen === 'addHoldings'

  const [accountId, setAccountId] = useState<number | null>(null)
  const [holdings, setHoldings] = useState<DraftHolding[]>([])
  const [accountMissing, setAccountMissing] = useState(false)
  const [holdingsMissing, setHoldingsMissing] = useState(false)
  // 계좌를 바꾸는 바람에 담아둔 종목을 비웠다는 사실을 조용히 넘기지 않는다(아래 pickAccount 참고).
  const [clearedByAccountChange, setClearedByAccountChange] = useState(false)
  // 부분 실패 요약. 성공한 줄은 이미 서버에 들어갔으므로 되돌리지 않고, 실패한 줄만 목록에 남긴다.
  const [failureNote, setFailureNote] = useState<string | null>(null)

  const accountsQuery = useGetAccounts({}, { enabled: isOpen })
  const accounts = filterHoldingAccounts(accountsQuery.data ?? [])
  const institutionsQuery = useGetInstitutions({ enabled: isOpen })
  const institutions = institutionsQuery.data ?? []
  const postTrades = usePostTradesBulk()

  const selectedAccount = accountId !== null ? accounts.find((a) => a.id === accountId) : undefined
  const market = selectedAccount ? marketOfAccountType(selectedAccount.type) : null

  const pickAccount = (id: number) => {
    const next = accounts.find((a) => a.id === id)
    const nextMarket = next ? marketOfAccountType(next.type) : null
    // 담은 종목은 시장에 종속돼 있다 — 국내 계좌에 담아둔 종목을 해외 계좌로 그대로 옮길 수 없으므로
    // 시장이 바뀌면 비운다. AddAccountModal은 유형 칩을 바꿀 때 확인을 먼저 받지만, 여기서는 아직
    // 아무것도 서버로 나가지 않은 로컬 입력이고 되돌리는 비용도 "다시 검색해서 담기"뿐이라 곧바로
    // 비우되, 비웠다는 사실을 문구로 알린다.
    if (market && nextMarket !== market && holdings.length > 0) {
      setHoldings([])
      setClearedByAccountChange(true)
    } else {
      setClearedByAccountChange(false)
    }
    setAccountId(id)
    setAccountMissing(false)
    setFailureNote(null)
  }

  const ddAccount = useEntityDropdown(
    // QuickStockModal의 'stockAcct'와 키를 분리한다 — 두 모달이 같은 openDropdown 키를 다투면
    // 한쪽을 열었을 때 다른 쪽 드롭다운도 함께 열린 것으로 판정된다(QuickStockModal 헤더 주석과 같은 이유).
    'holdingAcct',
    accounts,
    (a) => a.id,
    (a) => a.name,
    accountId,
    pickAccount,
    (a) => accountInstitutionMeta(a, institutions)?.institutionName,
    (a) => {
      const meta = accountInstitutionMeta(a, institutions)
      return meta ? <BankIcon tokenKey={meta.tokenKey} size={28} /> : undefined
    },
  )
  const selectedAccountMeta = selectedAccount ? accountInstitutionMeta(selectedAccount, institutions) : null
  const ddAccountDisplay = {
    ...ddAccount,
    value: selectedAccountMeta
      ? `${ddAccount.value} · ${selectedAccountMeta.institutionName}`
      : ddAccount.value || '계좌를 선택하세요',
  }

  const todayISO = toISODate(new Date())
  // 미래 매매는 성립하지 않는다 — QuickStockModal의 매수일과 같은 상한을 건다.
  const dpTradeDate = useDatePicker('addHoldings', isoDateToDisplay(todayISO), isoDateToNav(todayISO), todayISO)

  if (!isOpen) return null

  const resetAndClose = () => {
    setState((st) => ({
      modalOpen: null,
      dpPicked: { ...st.dpPicked, addHoldings: undefined },
      dpNav: { ...st.dpNav, addHoldings: undefined },
      openDropdown: null,
    }))
    setAccountId(null)
    setHoldings([])
    setAccountMissing(false)
    setHoldingsMissing(false)
    setClearedByAccountChange(false)
    setFailureNote(null)
    postTrades.reset()
  }

  const isCrypto = market === 'CRYPTO'
  const unitWord = isCrypto ? '코인' : '종목'

  const handleSave = () => {
    const missingAccount = accountId === null
    const missingHoldings = holdings.length === 0
    setAccountMissing(missingAccount)
    setHoldingsMissing(missingHoldings)
    if (missingAccount || missingHoldings) return

    const picked = state.dpPicked['addHoldings'] as { y: number; m: number; d: number } | undefined
    const tradeDate = picked ? pickedToISODate(picked) : todayISO

    const bodies: CreateTradeRequest[] = holdings.map((h) => ({
      accountId: accountId as number,
      stockId: h.stockId,
      side: 'BUY',
      quantity: Number(h.quantityStr) || 0,
      // 평단가는 종목 표시 통화 기준이다(해외=달러, 국내·코인=원화) — AccountHoldingsField가 시장에
      // 맞는 단위로 받아두므로 여기서 환율을 곱하지 않는다.
      price: Number(h.avgPriceStr) || 0,
      tradeDate,
    }))

    postTrades.mutate(bodies, {
      onSuccess: (result) => {
        if (result.failed.length === 0) {
          resetAndClose()
          return
        }
        // 실패한 줄만 목록에 남겨 다시 시도하게 한다 — 성공한 줄까지 남기면 같은 매수가 두 번 잡힌다.
        // 되짚는 기준은 stockId가 아니라 **bodies의 index**다: 같은 종목을 평단가를 나눠 두 줄로 담을
        // 수 있어서 stockId로는 성공한 줄과 실패한 줄을 구분할 수 없다(BulkTradeResult 주석 참고).
        // bodies는 holdings.map으로 만들어 순서가 1:1로 대응한다.
        const failedIndexes = new Set(result.failed.map((f) => f.index))
        setHoldings((prev) => prev.filter((_, i) => failedIndexes.has(i)))
        setFailureNote(
          `${result.succeeded}개는 등록했고 ${result.failed.length}개는 실패했어요 (${result.failed[0].message}). 남은 ${unitWord}만 다시 시도해주세요`,
        )
      },
    })
  }

  const saveLabel = postTrades.isPending
    ? '등록 중…'
    : holdings.length > 0
      ? `${unitWord} ${holdings.length}개 등록`
      : '보유 종목 등록'

  return (
    <Modal onClose={resetAndClose} zIndex={80} width={480} panelStyle={{ maxHeight: '86vh', overflow: 'auto' }}>
      {!!state.openDropdown && (
        <div onClick={() => setState({ openDropdown: null })} style={{ position: 'absolute', inset: 0, zIndex: 94 }} />
      )}
      <ModalHeader icon="library_add" title="보유 종목 추가" onClose={resetAndClose} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ fontSize: 12, color: 'var(--text-weak)', lineHeight: 1.6 }}>
          이미 갖고 있는 종목을 기존 계좌에 한 번에 등록해요. 담은 줄은 아래 기준일에 매수한 것으로 기록돼요.
        </div>

        <div style={{ position: 'relative' }}>
          <div style={LABEL_STYLE}>계좌</div>
          {accountsQuery.isPending ? (
            <div aria-busy style={{ ...FIELD_BORDER_STYLE, fontSize: 12.5, color: 'var(--text-weak)' }}>—</div>
          ) : accounts.length === 0 ? (
            // 종목을 담을 수 있는 계좌가 하나도 없으면 빈 드롭다운으로 막다른 길을 만들지 않고 계좌
            // 추가로 보낸다(QuickStockModal과 같은 관례). addAccountReturnTo로 계좌를 만든 뒤 여기로 돌아온다.
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ ...FIELD_BORDER_STYLE, fontSize: 12.5, color: 'var(--text-weak)' }}>
                증권계좌를 먼저 추가해주세요
              </div>
              <button
                onClick={() => setState({ modalOpen: 'addAccount', addAccountReturnTo: 'addHoldings', openDropdown: null })}
                className="mini-hov"
                style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, padding: '9px 10px', borderRadius: 8, border: 'none', background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <Icon name="add" size={15} />
                계좌 추가
              </button>
            </div>
          ) : (
            <Dropdown
              dd={ddAccountDisplay}
              maxHeight={180}
              footer={
                <>
                  <div style={{ borderTop: '0.5px solid var(--border)', margin: '4px 0' }} />
                  <button
                    className="mini-hov"
                    onClick={() => setState({ modalOpen: 'addAccount', addAccountReturnTo: 'addHoldings', openDropdown: null })}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left', padding: '9px 10px', borderRadius: 8, border: 'none', background: 'transparent', fontSize: 12.5, fontWeight: 700, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    <Icon name="add" size={15} />
                    계좌 추가
                  </button>
                </>
              }
            />
          )}
          {accountMissing && accountId === null && <div style={ERROR_STYLE}>계좌를 선택해주세요</div>}
          {clearedByAccountChange && (
            <div style={NOTE_STYLE} role="status">
              계좌를 바꿔서 담아둔 종목을 비웠어요 — 계좌 종류가 달라 그대로 옮길 수 없어요
            </div>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <div style={LABEL_STYLE}>기준일 (매수일)</div>
          <DatePicker dp={dpTradeDate} />
        </div>

        {market ? (
          <div>
            {/* key에 market을 걸어 계좌를 바꾸면 통째로 다시 마운트한다 — 담긴 목록은 pickAccount가
                비우지만 "고르는 중이던 종목"은 이 컴포넌트 내부 상태라 부모가 비울 수 없다
                (AddAccountModal의 같은 자리 주석 참고). */}
            <AccountHoldingsField
              key={market}
              market={market}
              enabled={isOpen}
              items={holdings}
              onChange={(next) => {
                setHoldings(next)
                setHoldingsMissing(false)
                setClearedByAccountChange(false)
              }}
              hint={`담은 ${unitWord}은 위 기준일에 매수한 것으로 매매 내역에도 함께 남아요. 종목마다 매수일이 다르면 나눠서 등록해주세요`}
            />
            {holdingsMissing && holdings.length === 0 && <div style={ERROR_STYLE}>{unitWord}을 하나 이상 담아주세요</div>}
          </div>
        ) : (
          <div style={{ ...FIELD_BORDER_STYLE, fontSize: 12.5, color: 'var(--text-weak)' }}>
            계좌를 먼저 선택하면 담을 종목을 검색할 수 있어요
          </div>
        )}

        {failureNote && <div style={{ fontSize: 11.5, color: 'var(--down)', lineHeight: 1.6 }}>{failureNote}</div>}
        {postTrades.error && <div style={{ fontSize: 11.5, color: 'var(--down)' }}>{postTrades.error.message}</div>}

        <button
          onClick={handleSave}
          disabled={postTrades.isPending}
          aria-busy={postTrades.isPending}
          className="qbtn"
          style={{ padding: 14, borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: postTrades.isPending ? 'default' : 'pointer', opacity: postTrades.isPending ? 0.7 : 1, transition: 'transform .12s' }}
        >
          {saveLabel}
        </button>
      </div>
    </Modal>
  )
}
