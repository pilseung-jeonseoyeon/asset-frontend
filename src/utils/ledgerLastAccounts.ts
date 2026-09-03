// 가계부 거래 입력 폼의 "마지막에 저장한 계좌"를 거래유형별로 이 기기에 기억한다(2026-09-03 사용자
// 요청 — 매번 계좌를 고쳐 고르는 게 귀찮다). 서버에 두지 않고 localStorage에 두는 이유: 순전히
// 입력 편의용 힌트라 틀려도 잃는 게 없고(사용자가 고르면 그게 우선), 서버 계약을 바꾸지 않아도 된다.
// 대신 기기·브라우저마다 따로 쌓인다(사파리와 홈 화면 앱은 저장 공간이 분리돼 있다).
//
// 저장하는 건 계좌 id 숫자만이다 — 이름·금액 같은 민감정보는 넣지 않는다. 키 접두어와 try/catch
// 규칙은 `src/stores/auth.ts`의 SEEN_SESSION_KEY, `src/utils/theme.ts`의 THEME_STORAGE_KEY와 같다
// (사파리 프라이빗 등 저장소 접근이 막힌 환경에서 예외가 나도 앱이 죽으면 안 된다).
//
// 적용 시점은 LedgerEntryModal의 계좌 드롭다운 "폴백" 단계다 — AppState에 써 넣지 않는다.
// 초안 규칙(state/selectors/entryDraft.ts)이 계좌 선택을 "적은 것"으로 치지 않는 것과 맞추기 위함이다:
// 기억된 계좌를 state에 써 버리면 열었다 바로 닫아도 초안이 생기는 문제로 되돌아간다.

import type { EntryType } from '../state/types'

const LAST_ACCOUNTS_KEY = 'monit.ledger.lastAccounts'

/** 한 거래유형에서 마지막으로 쓴 계좌들. 수입·지출은 accountId만, 저축·이체는 출금 계좌까지. */
export interface LastUsedAccounts {
  /** '계좌'/'저축계좌'/'입금계좌' 필드(entryAccountId). */
  accountId: number | null
  /** '출금계좌' 필드(entryWithdrawAccountId). 수입·지출은 항상 null. */
  withdrawAccountId: number | null
}

type LastAccountsByType = Partial<Record<EntryType, LastUsedAccounts>>

function isEntryType(value: string): value is EntryType {
  return value === 'income' || value === 'expense' || value === 'saving' || value === 'transfer'
}

function isAccountId(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isInteger(value) && value > 0)
}

/** 저장된 값을 통째로 읽는다. 없거나 깨져 있으면(수동 조작·옛 버전) 빈 객체 — 절대 throw하지 않는다. */
function readAll(): LastAccountsByType {
  try {
    const raw = window.localStorage.getItem(LAST_ACCOUNTS_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    const result: LastAccountsByType = {}
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!isEntryType(key) || typeof value !== 'object' || value === null) continue
      const { accountId, withdrawAccountId } = value as Record<string, unknown>
      if (!isAccountId(accountId) || !isAccountId(withdrawAccountId)) continue
      result[key] = { accountId, withdrawAccountId }
    }
    return result
  } catch {
    return {}
  }
}

/** 거래유형 하나의 마지막 계좌. 기억이 없으면 null. */
export function readLastUsedAccounts(entryType: EntryType): LastUsedAccounts | null {
  return readAll()[entryType] ?? null
}

/** 거래를 저장 성공한 뒤 호출한다. 저장 실패는 조용히 무시한다(정본이 아니라 힌트다). */
export function storeLastUsedAccounts(entryType: EntryType, accounts: LastUsedAccounts): void {
  try {
    const next: LastAccountsByType = { ...readAll(), [entryType]: accounts }
    window.localStorage.setItem(LAST_ACCOUNTS_KEY, JSON.stringify(next))
  } catch {
    // 접근 불가면 다음에 열 때 기억이 없을 뿐이다 — 첫 계좌 폴백으로 동작한다.
  }
}
