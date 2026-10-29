// PostgREST 직접 조회(테이블·뷰)의 snake_case 행을 화면 타입(camelCase)으로 바꾼다. RPC 응답은 이미 camelCase 라 쓰지 않는다.

function camelize(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase())
}

/** 객체·배열을 깊이 돌며 키만 camelCase 로 바꾼다. 값은 그대로(날짜·숫자 문자열 변환 없음). */
export function camelizeRow<T>(value: unknown): T {
  if (Array.isArray(value)) return value.map((v) => camelizeRow(v)) as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[camelize(k)] = camelizeRow(v)
    return out as T
  }
  return value as T
}

/** camelCase 요청 본문을 snake_case 열 이름으로. undefined 값은 싣지 않는다(부분 수정용). */
export function snakeizeRow(value: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value)) {
    if (v === undefined) continue
    out[k.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())] = v
  }
  return out
}
