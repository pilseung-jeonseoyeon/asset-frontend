// 엑셀 내보내기(거래 · 매매 · 계좌). DB 함수 export_transactions(p_from, p_to) · export_trades(p_from, p_to) · export_accounts()가
// `{ headers, rows }`를 돌려주고 앱이 xlsx 파일로 만든다(export.service.ts). 열 순서는 스프링과 같고, 시트 이름·파일명은 한글이다(exportFilename).
// 거래·매매는 `from`/`to`(모두 선택, date)만 받고 계좌는 파라미터 없음. 계약은 docs/excel-import.md.

/** accounts: 해지하지 않은 계좌 목록(통화별 현재 예수금) — 계좌 가져오기 양식과 같은 열이라 그대로 다시 올릴 수 있다. 기간(from/to)은 받지 않는다. */
export type ExportKind = 'transactions' | 'trades' | 'accounts'

export interface ExportFileParams {
  /** yyyy-MM-dd. 생략하면 전체 기간. */
  from?: string
  to?: string
}

export interface ExportFileResult {
  blob: Blob
  filename: string
}
