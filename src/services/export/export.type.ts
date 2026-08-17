// GET /export/excel/transactions, GET /export/excel/trades (OpenAPI 태그: "엑셀 내보내기 (2차)").
// 두 엔드포인트 모두 응답이 `type: string, format: byte`(엑셀 바이너리)뿐이고, `from`/`to`
// 쿼리(모두 선택, date)만 받는다. Content-Disposition 파일명 스펙은 아직 백엔드에서 확정되지
// 않아(docs/backend-request.md B-3-5) 폴백 파일명을 프론트에서 만든다(export.service.ts 참고).

export type ExportKind = 'transactions' | 'trades'

export interface ExportFileParams {
  /** yyyy-MM-dd. 생략하면 전체 기간. */
  from?: string
  to?: string
}

export interface ExportFileResult {
  blob: Blob
  filename: string
}
