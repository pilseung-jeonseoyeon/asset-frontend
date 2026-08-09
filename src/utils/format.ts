// Source: secret/Asset Manager v14.dc.html L3695 `const fmt = (n) => n.toLocaleString('ko-KR')`.
// Note: the §4-2 "억/만" Korean abbreviation captions (e.g. "약 12억 8,450만 원") are NOT computed by
// any shared function in the source — every instance found (L867, L912, L2429) is a hardcoded literal
// string in the mock data. No general-purpose abbreviation helper is invented here to match that.

export function fmt(n: number): string {
  return n.toLocaleString('ko-KR')
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
