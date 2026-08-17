// Source: secret/Asset Manager v14.dc.html L3695 `const fmt = (n) => n.toLocaleString('ko-KR')`.

import type { Currency } from '@/services/common.type'

export function fmt(n: number): string {
  return n.toLocaleString('ko-KR')
}

/**
 * 통화별 고정 소수 자릿수로 금액을 포맷한다. fmt()와 마찬가지로 통화 기호(₩/$)는 포함하지
 * 않는다 — 붙이는 건 호출부 몫이다. 원화는 소수점 없는 정수, 그 외(현재는 USD만 취급)는
 * 소수점 2자리로 고정한다. fmt()가 자릿수를 고정하지 않아 USD 금액이 `$77` / `$77.5` /
 * `$77.523`처럼 값마다 들쭉날쭉해지는 문제가 있었다(주식 화면 리뷰 지적) — 화면마다 각자
 * 포맷 함수를 새로 만들지 않도록 이 헬퍼 하나로 통일한다.
 */
export function formatCurrencyAmount(n: number, currency: Currency): string {
  if (currency === 'KRW') return fmt(n)
  return n.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * 조/억/만 단위 한국식 축약. 반올림은 만 원 단위(ds_rules §4-2)이고 0인 단위는 생략한다.
 * 부호와 "약 "/" 원" 접두·접미사는 호출부가 붙인다(fmt와 동일하게 통화 문자열을 포함하지 않음).
 * 억 단위가 4자리 이상(1조 이상)이면 조 단위로 올려 쓰고, 각 자릿수는 천 단위 콤마를 붙인다.
 * 리터럴 예시로 검증된 규칙(secret/Asset Manager v14.dc.html L867, L912, L2429):
 *   1,284,500,000 → "12억 8,450만"  (원문 "약 12억 8,450만 원")
 *     142,300,000 → "1억 4,230만"   (원문 "약 1억 4,230만 원")
 *     300,000,000 → "3억"
 *      50,000,000 → "5,000만"
 *     102,000,000 → "1억 200만"
 * 1,500,000,000,000 → "1조 5,000억"
 */
export function formatKoreanAbbrev(n: number): string {
  const abs = Math.abs(Math.round(n))
  let jo = Math.floor(abs / 1_000_000_000_000)
  let eok = Math.floor((abs % 1_000_000_000_000) / 100_000_000)
  let man = Math.round((abs % 100_000_000) / 10_000)
  // 만 단위 반올림이 억 단위로 넘어가는 경계(예: 99,996만 → 1억 0만)를 보정한다.
  if (man >= 10_000) {
    eok += 1
    man -= 10_000
  }
  // 억 단위가 조 단위로 넘어가는 경계(예: 9,999억 9,996만 → 1조 0억)를 보정한다.
  if (eok >= 10_000) {
    jo += 1
    eok -= 10_000
  }
  const parts: string[] = []
  if (jo > 0) parts.push(`${jo.toLocaleString('ko-KR')}조`)
  if (eok > 0) parts.push(`${eok.toLocaleString('ko-KR')}억`)
  if (man > 0) parts.push(`${man.toLocaleString('ko-KR')}만`)
  return parts.length ? parts.join(' ') : '0'
}

/**
 * 금액 입력창의 문자열을 정수로 되돌린다. 숫자가 아닌 문자(콤마, 원, 공백 등)는 전부 버린다.
 * 입력이 비었거나 숫자가 하나도 없으면 0.
 *
 * 금액 입력은 `value={fmt(n)}` + `onChange={(e) => setAmount(parseAmount(e.target.value))}` 조합으로
 * 쓴다. 원본에서 이식된 `filterAmountInput`처럼 DOM value를 직접 조작하지 않는다(controlled 유지).
 */
export function parseAmount(input: string): number {
  const digits = input.replace(/[^0-9]/g, '')
  return digits ? Number(digits) : 0
}

/**
 * 수량·환율처럼 소수를 허용하는 입력용. 소수점은 하나만 남기고, 소수 자릿수를 maxFractionDigits로 자른다.
 * 서버가 BigDecimal(수량·환율·평가액)로 받는 값이라 정수로 반올림하면 안 된다.
 * 입력 도중 상태("12." 같은 미완성 문자열)를 지워버리지 않도록 숫자가 아닌 정규화된 문자열을 돌려준다.
 */
export function sanitizeDecimalInput(input: string, maxFractionDigits = 8): string {
  const cleaned = input.replace(/[^0-9.]/g, '')
  const [whole, ...rest] = cleaned.split('.')
  if (rest.length === 0) return whole
  return `${whole}.${rest.join('').slice(0, maxFractionDigits)}`
}
