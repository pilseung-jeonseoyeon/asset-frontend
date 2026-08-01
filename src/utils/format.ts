// Source: secret/Asset Manager v14.dc.html L3695 `const fmt = (n) => n.toLocaleString('ko-KR')`.
// Note: the §4-2 "억/만" Korean abbreviation captions (e.g. "약 12억 8,450만 원") are NOT computed by
// any shared function in the source — every instance found (L867, L912, L2429) is a hardcoded literal
// string in the mock data. No general-purpose abbreviation helper is invented here to match that.

export function fmt(n: number): string {
  return n.toLocaleString('ko-KR')
}
