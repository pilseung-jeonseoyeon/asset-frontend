// GET /export/excel/transactions · /trades · /accounts. 응답은 엑셀 바이너리(xlsx)이고, 거래·매매는
// `from`/`to` 쿼리(모두 선택, date)만 받는다(계좌는 파라미터 없음). 파일명은 서버 Content-Disposition을
// 쓰고, 헤더를 읽지 못할 때만 프론트 폴백 파일명을 쓴다(export.service.ts 참고).

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
