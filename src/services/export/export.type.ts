// GET /export/excel/transactions, GET /export/excel/trades (OpenAPI 태그: "엑셀 내보내기 (2차)").
// 응답은 엑셀 바이너리(xlsx)이고, 거래·매매는 `from`/`to` 쿼리(모두 선택, date)만 받는다(계좌는 파라미터 없음). Content-Disposition 파일명 스펙은 아직 백엔드에서 확정되지
// 않아(docs/backend-request.md B-3-5) 폴백 파일명을 프론트에서 만든다(export.service.ts 참고).

/** accounts: 해지하지 않은 계좌 목록(등록 시점 원금) — 계좌 가져오기 양식과 같은 열이라 그대로 다시 올릴 수 있다. 기간(from/to)은 받지 않는다. */
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
