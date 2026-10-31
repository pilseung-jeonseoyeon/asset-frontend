// 기관 아이콘의 이름 글자(모노그램). 2026-10-31 사용자 결정 — 추상 심볼(bank-archetypes)은 이름을 읽어야 알아볼 수 있어
// 브랜드 색 타일 위에 짧은 이름을 쓴다. 실제 CI 로고는 상표라 쓰지 않는다(ds_rules_v3.md §12-1 원칙 1은 그대로).
// 규칙: 아래 표에 있으면 그 값 → 이름이 영문으로 시작하면 그 영문(KB · NH · iM) → 업권 꼬리말을 뗀 이름의 앞 두 글자.
// 세 글자는 브랜드를 두 글자로 줄이면 못 알아보는 곳만(카카오 · 업비트 등). 작은 타일에서는 BankIcon이 첫 글자만 쓴다.

const MONOGRAM_OVERRIDES: Record<string, string> = {
  citi: '씨티',
  suhyup: '수협',
  kbank: 'K',
  kakaobank: '카카오',
  kakaopaysec: '카카오',
  kakaopay: '카카오',
  post: '우체국',
  mg: 'MG',
  koreainv: '한투',
  koreainvsb: '한투',
  meritz: '메리츠',
  meritzfire: '메리츠',
  yuanta: '유안타',
  hyundaisec: '현대차',
  sangsangin: '상상인',
  sangsanginsb: '상상인',
  lina: '라이나',
  metlife: 'Met',
  lifeplanet: '플래닛',
  sgi: 'SGI',
  acuon: '애큐온',
  upbit: '업비트',
  coinone: '코인원',
  gopax: '고팍스',
  naverpay: '네이버',
  payco: '페이코',
  banksalad: '뱅샐',
  gepco: '공무원',
  hug: '청약',
}

const LATIN_LEAD = /^[A-Za-z]+/

export function bankMonogramOf(tokenKey: string, name: string): string {
  const override = MONOGRAM_OVERRIDES[tokenKey]
  if (override) return override
  const latin = name.match(LATIN_LEAD)?.[0]
  if (latin) return latin
  return Array.from(name).slice(0, 2).join('')
}
