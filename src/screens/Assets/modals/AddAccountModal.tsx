// Source: secret/Asset Manager v14.dc.html L1379-1452 (modalAddAccount) — layout transcribed verbatim,
// then wired to POST /accounts (contents were previously uncontrolled/no-op — see git history). z-index
// 90 (NOT 80 — confirmed per-instance, this modal can be opened from within another modal via
// openAddAccountFrom{Entry,Stock,Recur}, hence the higher stacking). closeAddAccount returns to
// `addAccountReturnTo` (whatever modal opened this one) instead of just closing (L4513).
//
// 자산 유형 칩은 서버 AccountType(10종)이 아니라 자산 화면 카드의 6분류(src/data/assetsView.ts
// ASSET_CLASS_META/ASSET_CLASS_ORDER)를 쓴다(2026-08-17, 제품 결정) — 예전엔 매핑 근거가 없어 10종을
// 그대로 노출했지만, 지금은 백엔드 AccountService.splitByClass의 역방향 규칙이 확보돼 있다
// (assetClassFormPreset/assetClassOfAccountType, 같은 파일). 칩을 고르면 그 자산군의 대표 AccountType이
// `form.type`에 저장돼 서버로는 지금처럼 AccountType 그대로 나간다 — 일부는 정보가 뭉개진다: 예적금
// 칩은 정기예금이 아니라 '적금'(INSTALLMENT_SAVINGS)으로, 현금 칩은 CASH로 저장된다(둘 다 제품 결정,
// ASSET_CLASS_ACCOUNT_TYPE_PRESET 주석 참고). 어느 자산군 칸에서 열었는지에 따른 기본 칩 선택은
// AssetCategoryModal이 accountForm에 미리 넣어준다(assetClassFormPreset).
//
// 국내주식/해외주식은 둘 다 AccountType.BROKERAGE로 저장되고 서버가 계좌 통화(원화/달러)로 구분한다
// (증권계좌 예수금 통화 기준 — 백엔드 splitByClass 적용 작업 진행 중). 그래서 두 칩은 클릭 시 통화
// 기본값도 함께 맞춘다(해외주식→USD, 국내주식→KRW, 사용자가 통화 칩으로 다시 바꿀 수 있음), 반대로
// AssetCategoryModal 프리셋으로 폼이 이미 채워진 채 이 모달이 열릴 때는 form.type + form.currency로
// 어느 칩이 선택돼 있어야 하는지 역산한다(assetClassOfAccountType) — type만으로는 국내/해외를 가릴 수
// 없기 때문이다.
//
// 달러 계좌 잔액: 서버 initialBalanceKrw는 통화와 무관하게 **항상 원화 정수**이고 currency는 표기용일
// 뿐이다(POST /accounts 명세: "USD 계좌도 등록 시점 원화 환산액을 보낸다"). 그래서 예전처럼 달러 기호만
// 바꿔 붙이면 입력한 달러 금액이 그대로 원화로 저장되는 오저장이 난다. 통화가 USD면 '달러 금액'과 '적용
// 환율'을 따로 받아 여기서 원화로 환산해 보낸다 — USD/KRW 환율은 서버가 내려주지 않아 사용자 입력이
// 유일한 근거다(하드코딩·추정 금지). 환산 결과는 저장 전에 화면에 그대로 보여준다.
//
// 개설일 팝오버가 모달 밖으로 못 나가고 잘리던 결함: DatePicker 팝오버는 Dropdown과 달리 폭이 고정
// (240px, `left:0;right:0`이 있어도 CSS 우선순위상 width가 이긴다)이라, flex:1 두 칸짜리 좁은 열
// 안에 놓이면 그 칸 폭(desktop 기준 480 모달에서 ~203px)을 넘어 패널 오른쪽 경계 밖으로 삐져나간다.
// 이 패널은(다른 대부분의 모달처럼) `overflow:'auto'`라 그 삐져나온 부분이 그대로 잘리고 가로
// 스크롤바까지 생겼다. 고쳐야 할 지점은 overflow가 아니라 배치였다 — 만기일처럼 개설일도 단독 전체 폭
// 행으로 두면(이자율 %도 함께 단독 행으로) 팝오버 폭(240px)이 콘텐츠 폭(420px) 안에 항상 들어와
// 절대 패널 밖으로 넘치지 않는다. overflow:'auto'는 다른 모달들과 동일하게 유지한다 — 세로로 너무 긴
// 콘텐츠는 스크롤로 접근 가능해야 하므로(내용이 잘려 접근 불가가 되는 쪽이 더 나쁘다), Modal 기본값인
// overflow:'visible'로 되돌리는 건 위험하다.
//
// (세로 잘림은 별도 결함이었다 — 이 배치 수정만으로는 트리거가 패널 하단 가까이 있을 때 팝오버가
// 여전히 patch overflow:'auto' 경계에서 잘렸다. 그건 DatePicker 자체가 position:fixed 뷰포트 앵커링으로
// 고친다, 이 모달이 아니라 — DatePicker.tsx 헤더 주석 참고.)

import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal } from '../../../components/primitives/Modal/Modal'
import { Dropdown } from '../../../components/primitives/Dropdown/Dropdown'
import { DatePicker } from '../../../components/primitives/DatePicker/DatePicker'
import { useAppState } from '../../../state/AppStateContext'
import { useIsMobile } from '../../../utils/useMediaQuery'
import { useEntityDropdown } from '../../../state/selectors/dropdown'
import { useDatePicker } from '../../../state/selectors/datePicker'
import { BLANK_ACCOUNT_FORM } from '../../../state/initialState'
import { fmt, parseAmount, sanitizeDecimalInput } from '../../../utils/format'
import { isoDateToDisplay, isoDateToNav, pickedToISODate } from '../../../utils/date'
import { ASSET_CLASS_META, ASSET_CLASS_ORDER, assetClassFormPreset, assetClassOfAccountType } from '../../../data/assetsView'
import { useGetInstitutions } from '@/services/institution'
import { usePostAccount } from '@/services/account'
import type { CreateAccountRequest } from '@/services/account'
import type { Currency } from '@/services/common.type'

function chipStyle(active: boolean): CSSProperties {
  return {
    padding: '9px 14px', borderRadius: 10,
    border: active ? '0.5px solid var(--accent)' : '0.5px solid var(--border)',
    background: active ? 'var(--accent)' : 'var(--surface)',
    color: active ? '#fff' : 'var(--text-mid)',
    fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  }
}

const LABEL_STYLE: CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }
const FIELD_BORDER_STYLE: CSSProperties = { border: '0.5px solid var(--border)', borderRadius: 10, padding: '13px 16px' }
const CURRENCY_OPTIONS: { value: Currency; label: string }[] = [
  { value: 'KRW', label: '원화 (KRW)' },
  { value: 'USD', label: '달러 (USD)' },
]

export function AddAccountModal() {
  const { state, setState } = useAppState()
  const isMobile = useIsMobile()
  const isOpen = state.modalOpen === 'addAccount'
  const form = state.accountForm
  const institutionsQuery = useGetInstitutions({ enabled: isOpen })
  const institutions = institutionsQuery.data ?? []
  const postAccount = usePostAccount()
  // 좁은 폭에서는 절반씩 나눈 두 필드(특히 Dropdown/DatePicker 팝오버)가 서로를 가리거나 잘리므로
  // 세로로 쌓는다 — 데스크톱은 기존 그대로 좌우 2열.
  const fieldRowStyle: CSSProperties = { display: 'flex', gap: 14, flexDirection: isMobile ? 'column' : 'row' }

  const ddInstitution = useEntityDropdown(
    'addAcctInst',
    institutions,
    (i) => i.id,
    (i) => i.name,
    form.institutionId,
    (id) => setState((st) => ({ accountForm: { ...st.accountForm, institutionId: id } })),
  )
  const ddInstitutionDisplay = { ...ddInstitution, value: ddInstitution.value || '선택 안 함' }

  const dpOpened = useDatePicker(
    'addAccountOpened',
    form.openedAt ? isoDateToDisplay(form.openedAt) : '선택 안 함',
    isoDateToNav(form.openedAt),
  )
  const dpMaturity = useDatePicker(
    'addAccountMaturity',
    form.maturityDate ? isoDateToDisplay(form.maturityDate) : '선택 안 함',
    isoDateToNav(form.maturityDate),
  )
  const [nameInvalid, setNameInvalid] = useState(false)
  // USD 잔액 입력에서 저장을 막아야 하는 두 경우. nameInvalid와 같은 패턴으로 필드 아래 안내를 띄운다.
  //   'rate'     — 환율이 비어 있거나 0이라 원화 환산 자체가 불가능
  //   'overflow' — 환산 결과가 안전 정수 범위를 벗어나 값이 틀어짐(아래 krwFromUsd 주석 참고)
  const [usdError, setUsdError] = useState<'rate' | 'overflow' | null>(null)

  // 서버 initialBalanceKrw는 통화와 무관하게 항상 원화 정수다 — USD 계좌는 달러 금액 × 환율을 반올림해
  // 계산한다(둘 다 AddAccountModal.tsx 상단 주석의 결함 1 배경 참고). KRW 계좌는 기존과 동일하게
  // form.initialBalanceKrw를 그대로 쓴다.
  //
  // 두 입력에는 자릿수 상한이 없다(sanitizeDecimalInput은 소수 자릿수만 자른다). 계좌번호·전화번호를
  // 잘못 붙여넣는 식으로 아주 큰 수가 들어오면 곱셈 결과가 JS 안전 정수 범위(2^53-1)를 넘어 실제와
  // 다른 정수가 되고, 그대로 서버에 저장되면 자산 총액이 통째로 틀어진다 — 저장 전에 막는다.
  const usdAmount = Number(form.initialBalanceUsd) || 0
  const usdRate = Number(form.usdExchangeRate) || 0
  const krwFromUsd = Math.round(usdAmount * usdRate)
  const isKrwFromUsdSafe = Number.isSafeInteger(krwFromUsd)

  // 자산 유형 칩은 서버 값(type+currency)에서 역산한다 — AssetCategoryModal이 프리셋을 미리 넣어준
  // 채로 열려도, 사용자가 통화 칩을 눌러 바꿔도 항상 지금 폼 상태와 일치하는 칩이 선택돼 보인다.
  const selectedAssetClass = assetClassOfAccountType(form.type, form.currency)

  if (!isOpen) return null

  const resetAndClose = () => {
    setState((st) => ({
      modalOpen: st.addAccountReturnTo,
      addAccountReturnTo: null,
      accountForm: BLANK_ACCOUNT_FORM,
      dpPicked: { ...st.dpPicked, addAccountOpened: undefined, addAccountMaturity: undefined },
      dpNav: { ...st.dpNav, addAccountOpened: undefined, addAccountMaturity: undefined },
      openDropdown: null,
    }))
    // 이 모달은 AppShell에 항상 마운트되어 있어 닫아도 언마운트되지 않는다. 로컬 상태와 mutation
    // 에러를 직접 지우지 않으면 다음에 "계좌 추가"를 열었을 때 지난 실패 메시지가 그대로 보인다.
    setNameInvalid(false)
    setUsdError(null)
    postAccount.reset()
  }

  const patchForm = (patch: Partial<typeof form>) =>
    setState((st) => ({ accountForm: { ...st.accountForm, ...patch } }))

  const handleSave = () => {
    if (!form.name.trim()) {
      setNameInvalid(true)
      return
    }
    setNameInvalid(false)

    if (form.currency === 'USD') {
      if (usdRate <= 0) {
        setUsdError('rate')
        return
      }
      if (!isKrwFromUsdSafe) {
        setUsdError('overflow')
        return
      }
    }
    setUsdError(null)

    const openedPicked = state.dpPicked['addAccountOpened'] as { y: number; m: number; d: number } | undefined
    const maturityPicked = state.dpPicked['addAccountMaturity'] as { y: number; m: number; d: number } | undefined
    const openedAt = openedPicked ? pickedToISODate(openedPicked) : (form.openedAt ?? undefined)
    const maturityDate = maturityPicked ? pickedToISODate(maturityPicked) : (form.maturityDate ?? undefined)

    const body: CreateAccountRequest = {
      name: form.name.trim(),
      type: form.type,
      currency: form.currency,
      initialBalanceKrw: form.currency === 'USD' ? krwFromUsd : form.initialBalanceKrw,
      isLiquid: form.isLiquid,
      ...(form.institutionId !== null ? { institutionId: form.institutionId } : {}),
      ...(form.interestRate !== null ? { interestRate: form.interestRate } : {}),
      ...(openedAt ? { openedAt } : {}),
      ...(maturityDate ? { maturityDate } : {}),
    }

    postAccount.mutate(body, { onSuccess: resetAndClose })
  }

  return (
    <Modal onClose={resetAndClose} zIndex={90} width={480} panelStyle={{ maxHeight: '90vh', overflow: 'auto' }}>
      {!!state.openDropdown && (
        <div onClick={() => setState({ openDropdown: null })} style={{ position: 'absolute', inset: 0, zIndex: 94 }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <span style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="account_balance" size={20} />
          </span>
          <div style={{ fontSize: 16.5, fontWeight: 700 }}>계좌 추가</div>
        </div>
        <button
          onClick={resetAndClose}
          style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--track)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <Icon name="close" size={19} color="var(--text-mid)" />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <div style={LABEL_STYLE}>자산 유형</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {ASSET_CLASS_ORDER.map((c) => (
              <button
                key={c}
                className="mini-hov"
                onClick={() => patchForm(assetClassFormPreset(c))}
                style={chipStyle(selectedAssetClass === c)}
              >
                {ASSET_CLASS_META[c].label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={LABEL_STYLE}>계좌 이름</div>
          <input
            type="text" placeholder="예: 파킹통장"
            value={form.name}
            onChange={(e) => {
              patchForm({ name: e.target.value })
              if (nameInvalid) setNameInvalid(false)
            }}
            style={{ width: '100%', ...FIELD_BORDER_STYLE, fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', outline: 'none', color: 'var(--text-strong)', boxSizing: 'border-box' }}
          />
          {nameInvalid && <div style={{ fontSize: 11.5, color: 'var(--down)', marginTop: 6 }}>계좌 이름을 입력해주세요</div>}
        </div>
        <div>
          <div style={LABEL_STYLE}>통화</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {CURRENCY_OPTIONS.map((c) => (
              <button
                key={c.value}
                className="mini-hov"
                onClick={() => {
                  // 통화만 바꾸고 반대편 입력값은 지우지 않는다 — 잘못 눌렀다가 되돌렸을 때 방금 적은
                  // 숫자가 사라지면 다시 입력해야 한다. 저장 시 handleSave가 currency로 분기해 해당
                  // 통화의 값만 쓰므로, 남은 값이 몰래 저장될 위험은 없다(반대편 값도 그 통화로 되돌리면
                  // 화면에 그대로 보인다 — 숨은 값이 아니다).
                  patchForm({ currency: c.value })
                  setUsdError(null)
                }}
                style={chipStyle(form.currency === c.value)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div style={fieldRowStyle}>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={LABEL_STYLE}>금융기관 (선택)</div>
            {institutionsQuery.isPending ? (
              <div aria-busy style={{ ...FIELD_BORDER_STYLE, fontSize: 13.5, color: 'var(--text-weak)' }}>—</div>
            ) : institutions.length === 0 ? (
              <div style={{ ...FIELD_BORDER_STYLE, fontSize: 12.5, color: 'var(--text-weak)' }}>
                등록된 금융기관이 없어요
              </div>
            ) : (
              <Dropdown dd={ddInstitutionDisplay} maxHeight={220} />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={LABEL_STYLE}>{form.currency === 'USD' ? '현재 잔액 (달러)' : '현재 잔액'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...FIELD_BORDER_STYLE }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-weak)' }}>{form.currency === 'KRW' ? '₩' : '$'}</span>
              {form.currency === 'USD' ? (
                // 달러는 센트 단위가 있어 소수점 둘째 자리까지 받는다. 입력 도중 상태("12." 등)를 지우지
                // 않도록 문자열 그대로 보관하고 저장 시점에만 숫자로 환산한다.
                <input
                  type="text" inputMode="decimal" placeholder="0.00"
                  value={form.initialBalanceUsd}
                  onChange={(e) => patchForm({ initialBalanceUsd: sanitizeDecimalInput(e.target.value, 2) })}
                  style={{ border: 'none', outline: 'none', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', width: '100%', color: 'var(--text-strong)' }}
                />
              ) : (
                <input
                  type="text" inputMode="numeric" placeholder="0"
                  value={form.initialBalanceKrw ? fmt(form.initialBalanceKrw) : ''}
                  onChange={(e) => patchForm({ initialBalanceKrw: parseAmount(e.target.value) })}
                  style={{ border: 'none', outline: 'none', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', width: '100%', color: 'var(--text-strong)' }}
                />
              )}
            </div>
          </div>
        </div>
        {form.currency === 'USD' && (
          <div>
            <div style={LABEL_STYLE}>적용 환율 (1달러당 원화)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...FIELD_BORDER_STYLE }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-weak)' }}>₩</span>
              <input
                type="text" inputMode="decimal" placeholder="예: 1385"
                value={form.usdExchangeRate}
                onChange={(e) => {
                  patchForm({ usdExchangeRate: sanitizeDecimalInput(e.target.value, 2) })
                  if (usdError) setUsdError(null)
                }}
                style={{ border: 'none', outline: 'none', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', width: '100%', color: 'var(--text-strong)' }}
              />
            </div>
            {usdError ? (
              <div style={{ fontSize: 11.5, color: 'var(--down)', marginTop: 6 }}>
                {usdError === 'rate'
                  ? '적용 환율을 입력해주세요 — 달러 잔액을 원화로 바꿔 저장하는 데 필요해요'
                  : '금액이 너무 커서 저장할 수 없어요. 달러 잔액과 환율을 다시 확인해주세요'}
              </div>
            ) : (
              <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 6 }}>
                {/* 환율만 채우고 달러 잔액을 비워두면 조용히 0원 계좌가 만들어진다 — 서버가 0을 허용해
                    막지는 않지만, 왜 환산액이 안 보이는지는 알려준다. */}
                {usdAmount > 0 && usdRate > 0
                  ? isKrwFromUsdSafe
                    ? `원화 ${fmt(krwFromUsd)}원으로 저장돼요`
                    : '금액이 너무 커요 — 달러 잔액과 환율을 다시 확인해주세요'
                  : usdRate > 0
                    ? '달러 잔액을 입력하면 원화로 얼마인지 알려드려요'
                    : '자산은 원화로 환산해 저장돼요. 잔액을 넣은 날의 환율을 적어주세요'}
              </div>
            )}
          </div>
        )}
        <div>
          <div style={LABEL_STYLE}>유동성 여부</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {([{ label: '유동성 있음', val: true }, { label: '유동성 없음', val: false }] as const).map((n) => (
              <button key={n.label} className="mini-hov" onClick={() => patchForm({ isLiquid: n.val })} style={chipStyle(form.isLiquid === n.val)}>
                {n.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={LABEL_STYLE}>이자율 % (선택)</div>
          <input
            type="text" inputMode="decimal" placeholder="0.00"
            value={form.interestRate === null ? '' : String(form.interestRate)}
            onChange={(e) => {
              const sanitized = sanitizeDecimalInput(e.target.value, 2)
              patchForm({ interestRate: sanitized === '' ? null : Number(sanitized) })
            }}
            style={{ width: '100%', ...FIELD_BORDER_STYLE, fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', outline: 'none', color: 'var(--text-strong)', boxSizing: 'border-box' }}
          />
        </div>
        {/* 개설일은 만기일처럼 단독 전체 폭 행이어야 한다 — flex:1 두 칸짜리 좁은 열에 두면 DatePicker의
            고정 240px 팝오버가 칸 밖으로 삐져나가 패널의 overflow:'auto'에 잘린다(파일 상단 주석 참고). */}
        <div style={{ position: 'relative' }}>
          <div style={LABEL_STYLE}>개설일 (선택)</div>
          <DatePicker dp={dpOpened} />
        </div>
        <div style={{ position: 'relative' }}>
          <div style={LABEL_STYLE}>만기일 (선택)</div>
          <DatePicker dp={dpMaturity} />
        </div>
        {postAccount.error && (
          <div style={{ fontSize: 11.5, color: 'var(--down)' }}>{postAccount.error.message}</div>
        )}
        <button
          onClick={handleSave}
          disabled={postAccount.isPending}
          aria-busy={postAccount.isPending}
          className="qbtn"
          style={{ padding: 14, borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: postAccount.isPending ? 'default' : 'pointer', opacity: postAccount.isPending ? 0.7 : 1, transition: 'transform .12s' }}
        >
          {postAccount.isPending ? '저장 중…' : '계좌 추가'}
        </button>
      </div>
    </Modal>
  )
}
