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
// 폼 범위 축소(2026-08-19, 사용자 요청): 이 모달은 이제 자산 유형 / 계좌 이름 / 금융기관(필수) /
// 현재 잔액 / 유동성 여부, 5개 항목만 받는다. dc.html 원본과 예전 버전에 있던 통화(원화/달러) 토글,
// 이자율(선택), 개설일(선택), 만기일(선택) 입력은 뺐다 — 빠르게 계좌를 등록하는 흐름을 우선한 제품
// 결정이고, 필요하면 계좌 등록 뒤 EditAccountModal(계좌 수정, 이번 축소 대상 아님)에서 채울 수 있다.
//
// 통화 선택 UI는 없다 — 저장 시 보내는 currency는 자산 유형 칩에서 그대로 파생된다: 해외주식 칩이면
// 'USD', 나머지 5개 칩은 'KRW'다. form.currency를 곧이곧대로 읽지 않는 이유는 assetClassFormPreset이
// 주식 외 4개 자산군 칩을 고를 때 currency를 건드리지 않기 때문(그 함수 주석 참고 — "이미 사용자가
// 골라둔 통화를 조용히 되돌리면 안 된다") — 해외주식 칩을 한 번 골랐다가 다른 칩으로 바꾸면
// form.currency에 'USD' 잔재가 남는데, 이 모달에는 그걸 고칠 UI가 없다.
//
// 잔액 입력은 자산 유형에 따라 갈린다. 해외주식 칩은 실제 증권사 계좌처럼 **달러 예수금과 원화
// 예수금이 동시에** 있을 수 있다(2026-08-20, 사용자 결정 — "환전 안 한 원화도 따로 있다") — 그래서
// 이 칩만 입력칸이 두 개고 둘 다 선택 입력이다(한쪽만 채우거나 둘 다 비워도 된다). 두 칸은 환산 관계가
// 아니라 서로 다른 돈이므로 하나를 고치면 다른 쪽 값이 바뀌는 로직을 넣지 않는다. 저장 시 이 두 값을
// initialBalanceNative(달러)/initialBalanceKrw(원화)로 **함께** 싣는다 — 예전 계약(둘 중 통화에 맞는
// 한쪽만 허용, 아래 환율 문단 참고)과 달리 이제 서버가 외화 계좌에도 두 필드를 동시에 받는다(신규
// 백엔드 계약, 이 글 작성 시점 아직 배포 전 — 배포 전까지는 해외주식 등록이 400
// INITIAL_BALANCE_CURRENCY_MISMATCH로 실패하는 게 정상이다). 나머지 5개 칩은 여전히 원화 한 칸만
// initialBalanceKrw로 보낸다.
//
// 환율은 프론트가 다루지 않는다(2026-08-20 백엔드 계약 변경). 예전에는 서버가 원화 원금만 보관해
// '달러 × 적용 환율'을 여기서 계산해 보냈지만, 이제 서버가 외화 원금을 그대로 보관하고 원화 평가액은
// 기준일 환율로 매번 환산한다 — 프론트가 환율을 곱하면 오히려 이중 환산이 된다. 그래서 환율 입력칸도,
// 환산 미리보기도, 곱셈 오버플로 방어도 모두 필요 없어졌다.
//
// 금융기관은 반드시 "고르는" 항목이다 — 계좌 이름과 같은 인라인 오류 패턴(필드 아래 var(--down) 문구)
// 으로 미선택 저장을 막는다. 단, 고를 수 있는 값에는 목록 맨 아래의 **'없음'**이 포함된다(2026-08-19,
// 사용자 요청 — "현금이면 없음으로 해야 할 것 같다"). 서버도 무기관 계좌를 정식으로 지원한다
// (CreateAccountReq.institutionId: "금융기관 ID — 현금 등 무기관 자산은 생략한다").
// 그래서 "아직 아무것도 안 고름"과 "없음을 골랐음"을 반드시 구분해야 한다 — 둘 다 institutionId는
// null이므로 form만으로는 갈라낼 수 없어 로컬 상태 institutionNone으로 후자를 표시한다. 저장 시
// institutionId는 아예 싣지 않는다(위 스펙의 "생략한다").
// 목록이 비어 있어도 '없음'은 항상 고를 수 있으므로 예전의 "등록된 금융기관이 없어요" 막다른 안내는
// 두지 않는다 — 옵션이 '없음' 하나뿐인 드롭다운이 그 상황을 그대로 보여준다.
//
// 기관 추가 진입점은 두지 않는다(2026-08-19, 사용자 결정): POST/DELETE /institutions API는 있지만
// 제품상 프론트에 기관 추가·삭제 기능은 필요 없다고 정리됐다 — 한때 여기에 "금융기관 추가" 버튼과
// Dropdown footer 진입점을 뒀다가 그 결정에 따라 제거했으므로, "기관이 없으면 만들 수 있어야
// 하지 않나"는 이유로 되살리지 말 것. 목록 조회 실패(isError)는 빈 목록과 구분해 "불러오지
// 못했어요" + 다시 시도로 보여준다(describeQueryError, GeneralModal.tsx의 재시도 배너와 동일한 관례).

import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal } from '../../../components/primitives/Modal/Modal'
import { Dropdown } from '../../../components/primitives/Dropdown/Dropdown'
import { useAppState } from '../../../state/AppStateContext'
import { useIsMobile } from '../../../utils/useMediaQuery'
import { useEntityDropdown } from '../../../state/selectors/dropdown'
import { BLANK_ACCOUNT_FORM } from '../../../state/initialState'
import { fmt, parseAmount, sanitizeDecimalInput } from '../../../utils/format'
import { ASSET_CLASS_META, ASSET_CLASS_ORDER, assetClassFormPreset, assetClassOfAccountType } from '../../../data/assetsView'
import { describeQueryError } from '../../../data/ledgerView'
import { useGetInstitutions } from '@/services/institution'
import { usePostAccount } from '@/services/account'
import { isFxRateMissing } from '@/services/stock'
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
// 금액/환율 입력칸 공통 스타일 — 통화 기호 span과 한 줄로 붙는 테두리 없는 input.
const AMOUNT_INPUT_STYLE: CSSProperties = {
  border: 'none', outline: 'none', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit',
  width: '100%', color: 'var(--text-strong)',
}
const AMOUNT_PREFIX_STYLE: CSSProperties = { fontSize: 15, fontWeight: 700, color: 'var(--text-weak)' }
const FIELD_HINT_STYLE: CSSProperties = { fontSize: 11.5, color: 'var(--text-mid)', marginTop: 6 }
// GeneralModal.tsx의 재시도 배너와 동일한 텍스트 버튼 규격.
const RETRY_BTN_STYLE: CSSProperties = {
  border: 'none', background: 'transparent', padding: 0, fontSize: 12, fontWeight: 700,
  color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit',
}

export function AddAccountModal() {
  const { state, setState } = useAppState()
  const isMobile = useIsMobile()
  const isOpen = state.modalOpen === 'addAccount'
  const form = state.accountForm
  const institutionsQuery = useGetInstitutions({ enabled: isOpen })
  const institutions = institutionsQuery.data ?? []
  const postAccount = usePostAccount()
  // 좁은 폭에서는 절반씩 나눈 두 필드(특히 Dropdown 팝오버)가 서로를 가리거나 잘리므로 세로로
  // 쌓는다 — 데스크톱은 기존 그대로 좌우 2열.
  const fieldRowStyle: CSSProperties = { display: 'flex', gap: 14, flexDirection: isMobile ? 'column' : 'row' }

  const [nameInvalid, setNameInvalid] = useState(false)
  const [institutionMissing, setInstitutionMissing] = useState(false)
  // "없음을 명시적으로 골랐다" — institutionId가 null인 두 상태(미선택 / 없음)를 가르는 유일한 근거다.
  const [institutionNone, setInstitutionNone] = useState(false)

  const ddInstitution = useEntityDropdown(
    'addAcctInst',
    institutions,
    (i) => i.id,
    (i) => i.name,
    form.institutionId,
    (id) => {
      setState((st) => ({ accountForm: { ...st.accountForm, institutionId: id } }))
      setInstitutionNone(false)
      setInstitutionMissing(false)
    },
  )
  // 서버 기관 목록 뒤에 프론트가 직접 붙이는 '없음' 옵션 — 현금처럼 어느 기관에도 속하지 않는 자산용
  // (파일 상단 주석 참고). 서버에 존재하는 기관이 아니므로 id는 문자열 sentinel을 쓴다(Dropdown의
  // React key 용도일 뿐 서버로 나가지 않는다).
  const ddInstitutionDisplay = {
    ...ddInstitution,
    value: institutionNone ? '없음' : ddInstitution.value || '금융기관을 선택하세요',
    options: [
      ...ddInstitution.options,
      {
        id: 'none',
        name: '없음',
        pick: () => {
          setState((st) => ({ accountForm: { ...st.accountForm, institutionId: null }, openDropdown: null }))
          setInstitutionNone(true)
          setInstitutionMissing(false)
        },
      },
    ],
  }
  const institutionsErr = describeQueryError(institutionsQuery.error)


  // 자산 유형 칩은 서버 값(type)에서 역산한다 — AssetCategoryModal이 프리셋을 미리 넣어준 채로 열려도
  // 항상 지금 폼 상태와 일치하는 칩이 선택돼 보인다. 계좌 유형이 6종으로 통합되면서 이제 통화를 보지
  // 않고도 국내/해외주식이 갈린다.
  const selectedAssetClass = assetClassOfAccountType(form.type)
  const isForeignStock = selectedAssetClass === 'FOREIGN_STOCK'
  // 실제로 전송할 통화. form.currency를 곧이곧대로 읽지 않는 이유는 파일 상단 주석 참고 — 해외주식이
  // 아닌 자산군에서는 'USD' 잔재가 남을 수 있고, 이 화면에는 그걸 되돌릴 UI가 없다.
  const accountCurrency: Currency = isForeignStock ? 'USD' : 'KRW'
  const nativeAmount = Number(form.initialBalanceUsd) || 0

  if (!isOpen) return null

  const resetAndClose = () => {
    setState((st) => ({
      modalOpen: st.addAccountReturnTo,
      addAccountReturnTo: null,
      accountForm: BLANK_ACCOUNT_FORM,
      openDropdown: null,
    }))
    // 이 모달은 AppShell에 항상 마운트되어 있어 닫아도 언마운트되지 않는다. 로컬 상태와 mutation
    // 에러를 직접 지우지 않으면 다음에 "계좌 추가"를 열었을 때 지난 실패 메시지가 그대로 보인다.
    setNameInvalid(false)
    setInstitutionMissing(false)
    setInstitutionNone(false)
    postAccount.reset()
  }

  const patchForm = (patch: Partial<typeof form>) =>
    setState((st) => ({ accountForm: { ...st.accountForm, ...patch } }))

  const handleSave = () => {
    const missingName = !form.name.trim()
    // '없음'을 고른 것도 어엿한 선택이다 — 아직 아무것도 안 고른 경우만 막는다.
    const missingInstitution = form.institutionId === null && !institutionNone
    setNameInvalid(missingName)
    setInstitutionMissing(missingInstitution)
    if (missingName || missingInstitution) return

    const body: CreateAccountRequest = {
      name: form.name.trim(),
      type: form.type,
      currency: accountCurrency,
      // 해외주식은 달러 예수금과 원화 예수금이 서로 다른 돈이라 둘 다 싣는다(비웠으면 0) — 파일 상단
      // 주석 참고. 나머지 5개 자산군은 지금처럼 원화 한 필드만 보낸다.
      ...(isForeignStock
        ? { initialBalanceNative: nativeAmount, initialBalanceKrw: form.initialBalanceKrw }
        : { initialBalanceKrw: form.initialBalanceKrw }),
      isLiquid: form.isLiquid,
      // '없음'이면 institutionId를 아예 싣지 않는다(서버 스펙: "현금 등 무기관 자산은 생략한다").
      ...(form.institutionId !== null ? { institutionId: form.institutionId } : {}),
    }

    postAccount.mutate(body, { onSuccess: resetAndClose })
  }

  // 두 레이아웃(해외주식 2칸 / 나머지 5개 1칸)이 금융기관 필드를 그대로 공유하므로 한 곳에서만
  // 정의한다 — 로딩/에러/미선택 상태를 두 군데에서 따로 관리하면 갈라지기 쉽다.
  const institutionField = (
    <div style={{ flex: 1, position: 'relative' }}>
      <div style={LABEL_STYLE}>금융기관</div>
      {institutionsQuery.isPending ? (
        <div aria-busy style={{ ...FIELD_BORDER_STYLE, fontSize: 13.5, color: 'var(--text-weak)' }}>—</div>
      ) : institutionsErr ? (
        <div style={{ ...FIELD_BORDER_STYLE, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, fontSize: 12.5, color: 'var(--down)' }}>
          금융기관을 불러오지 못했어요
          <button type="button" onClick={() => void institutionsQuery.refetch()} style={RETRY_BTN_STYLE}>다시 시도</button>
        </div>
      ) : (
        <Dropdown dd={ddInstitutionDisplay} maxHeight={220} />
      )}
      {institutionMissing && form.institutionId === null && !institutionNone && (
        <div style={{ fontSize: 11.5, color: 'var(--down)', marginTop: 6 }}>금융기관을 선택해주세요</div>
      )}
    </div>
  )

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
        {isForeignStock ? (
          <>
            {institutionField}
            <div style={fieldRowStyle}>
              <div style={{ flex: 1 }}>
                <div style={LABEL_STYLE}>달러 예수금</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...FIELD_BORDER_STYLE }}>
                  <span style={AMOUNT_PREFIX_STYLE}>$</span>
                  {/* 달러는 센트 단위가 있어 소수점 둘째 자리까지 받는다. 입력 도중 상태("12." 등)를
                      지우지 않도록 문자열 그대로 보관하고 저장 시점에만 숫자로 환산한다. */}
                  <input
                    type="text" inputMode="decimal" placeholder="0.00"
                    value={form.initialBalanceUsd}
                    onChange={(e) => patchForm({ initialBalanceUsd: sanitizeDecimalInput(e.target.value, 2) })}
                    style={AMOUNT_INPUT_STYLE}
                  />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={LABEL_STYLE}>원화 예수금</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...FIELD_BORDER_STYLE }}>
                  <span style={AMOUNT_PREFIX_STYLE}>₩</span>
                  <input
                    type="text" inputMode="numeric" placeholder="0"
                    value={form.initialBalanceKrw ? fmt(form.initialBalanceKrw) : ''}
                    onChange={(e) => patchForm({ initialBalanceKrw: parseAmount(e.target.value) })}
                    style={AMOUNT_INPUT_STYLE}
                  />
                </div>
              </div>
            </div>
            {/* 두 칸이 "같은 돈의 환산"이 아니라 "따로 들어 있는 두 돈"이라는 걸 분명히 한다 — 안 그러면
                환전 안 한 원화를 달러 칸에 환산해서 적어야 하는지 헷갈릴 수 있다. */}
            <div style={FIELD_HINT_STYLE}>달러와 원화, 계좌에 실제로 들어 있는 두 돈을 각각 적어주세요. 서로 환산해서 넣지 않아도 돼요</div>
          </>
        ) : (
          <div style={fieldRowStyle}>
            {institutionField}
            <div style={{ flex: 1 }}>
              <div style={LABEL_STYLE}>현재 잔액</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...FIELD_BORDER_STYLE }}>
                <span style={AMOUNT_PREFIX_STYLE}>₩</span>
                <input
                  type="text" inputMode="numeric" placeholder="0"
                  value={form.initialBalanceKrw ? fmt(form.initialBalanceKrw) : ''}
                  onChange={(e) => patchForm({ initialBalanceKrw: parseAmount(e.target.value) })}
                  style={AMOUNT_INPUT_STYLE}
                />
              </div>
            </div>
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
        {postAccount.error && (
          // FX_RATE_NOT_FOUND(422)는 서버 장애가 아니라 "그 통화 환율 고시가 아직 없음"이다 — 달러 계좌를
          // 만들 때만 나며, 사용자가 잘못한 게 아니므로 빨간 에러가 아니라 회색 안내로 렌더한다
          // (docs/api-conventions.md "에러가 아닌 실패"). 그 외 실패는 서버 message를 그대로 보여준다.
          isFxRateMissing(postAccount.error) ? (
            <div style={{ fontSize: 11.5, color: 'var(--text-weak)' }}>
              아직 오늘 환율이 들어오지 않아 해외주식 계좌를 만들 수 없어요. 잠시 뒤에 다시 시도해주세요
            </div>
          ) : (
            <div style={{ fontSize: 11.5, color: 'var(--down)' }}>{postAccount.error.message}</div>
          )
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
