export type XlsxModule = typeof import('xlsx')

/** SheetJS 청크를 못 받았을 때(오프라인 등). 호출부가 사용자 문구로 바꾼다. */
export class XlsxLoadError extends Error {
  constructor(cause: unknown) {
    super('XLSX_LOAD_FAILED', { cause })
    this.name = 'XlsxLoadError'
  }
}

let pending: Promise<XlsxModule> | null = null

/**
 * SheetJS(약 400KB)는 엑셀 기능을 처음 쓸 때만 내려받는다 — 초기 청크에 넣지 않는다(동적 import 라 Vite 가 따로 쪼갠다).
 * 한 번 받으면 재사용하고, 실패했으면 다음 호출에서 다시 시도한다.
 */
export function loadXlsx(): Promise<XlsxModule> {
  pending ??= import('xlsx').catch((cause: unknown) => {
    pending = null
    throw new XlsxLoadError(cause)
  })
  return pending
}
