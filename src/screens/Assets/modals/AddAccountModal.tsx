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
// 통화 선택 UI는 없지만, 저장 시 보내는 currency는 무조건 'KRW'가 아니다 — 자산 유형 칩이
// FOREIGN_STOCK(해외주식)이면 'USD'를, 그 외 5개 칩은 전부 'KRW'를 보낸다(2026-08-19, 리뷰 수정:
// 이전엔 항상 'KRW'였는데, 해외주식 칩을 고르고 저장해도 서버에는 KRW로 나가 국내주식으로 분류되는
// 버그였다 — assetClassOfAccountType('BROKERAGE','KRW') === 'DOMESTIC_STOCK'). currency는
// selectedAssetClass에서 직접 파생시킨다(`selectedAssetClass === 'FOREIGN_STOCK' ? 'USD' : 'KRW'`) —
// form.currency를 그대로 읽지 않는 이유: assetClassFormPreset은 BROKERAGE 외 4개 자산군(CASH_PENSION/
// DEPOSIT/CRYPTO/ETC) 칩을 고를 때 currency 필드를 건드리지 않는다(그 함수 자체 주석 참고 — "이미
// 사용자가 골라둔 통화를 조용히 되돌리면 안 된다"는 EditAccountModal 등 다른 호출부를 위한 설계다).
// 그래서 해외주식 칩을 한 번이라도 골랐다가 다른 칩으로 바꾸면 form.currency엔 'USD'가 그대로 남는데,
// 이 모달은 currency를 고르는 화면이 없어 사용자가 그 잔재를 볼 수도 고칠 수도 없다 — form.currency를
// 곧이곧대로 읽으면 크립토/현금 등도 조용히 USD로 저장되는 새로운 사고가 난다. selectedAssetClass는
// (BROKERAGE를 제외한 모든 type에서) currency와 무관하게 결정되므로 이 되짚음에 안전하다.
//
// 잔액 입력은 여전히 원화 금액 하나(form.initialBalanceKrw)뿐이다 — "달러 잔액 + 적용 환율 → 원화
// 환산" 계산이나 USD/KRW 환율 입력, ₩/$ 심볼 분기는 되살리지 않는다(계좌 잔액을 원화로 받는 API
// 계약은 통화 필드와 무관하다). 이자율(선택)/개설일(선택)/만기일(선택) 입력도 여전히 빠져 있다 —
// 필요하면 계좌 등록 뒤 EditAccountModal에서 채울 수 있다.
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
import { fmt, parseAmount } from '../../../utils/format'
import { ASSET_CLASS_META, ASSET_CLASS_ORDER, assetClassFormPreset, assetClassOfAccountType } from '../../../data/assetsView'
import { describeQueryError } from '../../../data/ledgerView'
import { useGetInstitutions } from '@/services/institution'
import { usePostAccount } from '@/services/account'
import type { CreateAccountRequest } from '@/services/account'

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


  // 자산 유형 칩은 서버 값(type+currency)에서 역산한다 — AssetCategoryModal이 프리셋을 미리 넣어준
  // 채로 열려도 항상 지금 폼 상태와 일치하는 칩이 선택돼 보인다. currency는 화면에 노출되지 않지만
  // 국내/해외주식 칩을 가르는 데는 여전히 쓰인다(파일 상단 주석 참고).
  const selectedAssetClass = assetClassOfAccountType(form.type, form.currency)

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
      currency: selectedAssetClass === 'FOREIGN_STOCK' ? 'USD' : 'KRW',
      initialBalanceKrw: form.initialBalanceKrw,
      isLiquid: form.isLiquid,
      // '없음'이면 institutionId를 아예 싣지 않는다(서버 스펙: "현금 등 무기관 자산은 생략한다").
      ...(form.institutionId !== null ? { institutionId: form.institutionId } : {}),
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
        <div style={fieldRowStyle}>
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
          <div style={{ flex: 1 }}>
            <div style={LABEL_STYLE}>현재 잔액</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...FIELD_BORDER_STYLE }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-weak)' }}>₩</span>
              <input
                type="text" inputMode="numeric" placeholder="0"
                value={form.initialBalanceKrw ? fmt(form.initialBalanceKrw) : ''}
                onChange={(e) => patchForm({ initialBalanceKrw: parseAmount(e.target.value) })}
                style={{ border: 'none', outline: 'none', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', width: '100%', color: 'var(--text-strong)' }}
              />
            </div>
          </div>
        </div>
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
