// 엑셀 가져오기(거래 내역 · 계좌 목록). 정본은 DB 함수 `import_transactions(p_rows)` · `import_accounts(p_rows)`
// (supabase/migrations/20261024000007_app_api.sql 3부)와 docs/excel-import.md(엑셀 열 순서·에러 코드·전체 롤백 규칙)다.
// 결과 타입은 두 종류가 같은 모양이라 하나(ImportTransactionsResult)를 같이 쓴다.
//
// 결정 사항:
// - 엑셀 파일은 앱이 읽고 만든다(SheetJS, 필요할 때만 내려받는 별도 청크 — src/utils/xlsx). 앱은 시트를 "행 번호 + 문자열 칸"으로
//   바꿔 넘길 뿐, 날짜·금액·이름 해석과 "이름 → id" 매칭은 DB 함수가 한 곳에서 한다.
// - 미리보기 단계 없이 바로 등록하고 결과 요약만 받는다.
//
// 계약(스프링 `TransactionImportRes` 그대로):
// **한 행이라도 실패하면 아무것도 저장하지 않고** `importedCount`가 0, `errors`에 실패한 행이 전부 담긴다.
// 전부 통과했을 때만 저장되고 `errors`는 빈 배열이다. 즉 "일부만 등록"은 없다 — 화면은 errors가 비어
// 있으면 성공, 아니면 "고친 뒤 다시 올려주세요"로 안내한다.
// 파일 자체를 못 읽거나 헤더가 다르면(IMPORT_FILE_UNREADABLE — 앱이 올리기 전에 검사) 행이 없거나(IMPORT_ROWS_EMPTY)
// 5,000행을 넘으면(IMPORT_ROW_LIMIT_EXCEEDED) 결과가 아니라 ApiError 로 온다.

/** accounts: 계좌 일괄 등록(import_accounts) — 응답 모양(importedCount + errors, 전체 롤백)은 거래와 같다. */
export type ImportKind = 'transactions' | 'accounts'

/** 실패한 엑셀 한 행. `rowNumber`는 엑셀 화면에 보이는 번호 그대로(헤더가 1행, 첫 데이터는 2행). */
export interface ImportRowError {
  rowNumber: number
  /** 실패 사유 코드(예: IMPORT_ACCOUNT_NOT_FOUND, IMPORT_SUBCATEGORY_NOT_FOUND). 화면은 분기하지 않고 message만 보여준다. */
  code: string
  /** 사용자에게 그대로 보여줄 한국어 사유(예: "등록된 계좌에서 같은 이름을 찾을 수 없습니다."). */
  message: string
}

export interface ImportTransactionsResult {
  /** 등록된 거래 수. errors가 하나라도 있으면 0이다(전체 롤백). */
  importedCount: number
  errors: ImportRowError[]
}

/** 가져오기 양식 파일. 저장은 훅(saveFile)이 한다. */
export interface ImportTemplateResult {
  blob: Blob
  filename: string
}
