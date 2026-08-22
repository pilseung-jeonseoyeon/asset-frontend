// 가계부 엑셀 가져오기(2026-08-22 신설). 정본은 서버 OpenAPI(`GET /import/excel/transactions/template`,
// `POST /import/excel/transactions`)다 — 아래 타입은 2026-08-22 백엔드 소스(`TransactionImportRes` /
// `TransactionImportErrorRes`)와 대조해 맞춘 것이고, 실행 중인 서버 문서에 반영되면 다시 한 번 대조한다.
// 전체 계약(엑셀 열 순서·에러 코드·전체 롤백 규칙)은 docs/excel-import.md 참고.
//
// 결정 사항(2026-08-22, 사용자):
//  - 엑셀 해석은 서버가 한다. 프론트는 파일을 multipart로 그대로 올리고, 양식(템플릿)도 서버에서 받는다
//    → 프론트에 xlsx 라이브러리를 넣지 않는다(번들 +400KB 회피). 계좌·카테고리 "이름 → id" 매칭도 서버.
//  - 미리보기 단계 없이 바로 등록하고 결과 요약만 받는다.
//
// 서버 계약(백엔드 `TransactionImportRes` 스키마 설명 그대로):
//  **한 행이라도 실패하면 아무것도 저장하지 않고** `importedCount`가 0, `errors`에 실패한 행이 전부 담긴다.
//  전부 통과했을 때만 저장되고 `errors`는 빈 배열이다. 즉 "일부만 등록"은 없다 — 화면은 errors가 비어
//  있으면 성공, 아니면 "고친 뒤 다시 올려주세요"로 안내한다.
//  파일 자체를 못 읽거나(IMPORT_FILE_UNREADABLE) 행이 없거나(IMPORT_ROWS_EMPTY) 5,000행을 넘으면
//  (IMPORT_ROW_LIMIT_EXCEEDED) 200이 아니라 공통 에러 봉투(ApiError)로 온다.

export type ImportKind = 'transactions'

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
