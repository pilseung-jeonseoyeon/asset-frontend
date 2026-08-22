// 가계부 엑셀 가져오기(2026-08-22 신설). **백엔드 API는 아직 없다** — 아래는 프론트가 먼저 정한
// 제안 계약이고, 정본은 서버에 생기는 OpenAPI 문서다. 서버가 만들어지면 여기 타입을 OpenAPI와 대조해
// 맞추고, 차이가 나면 이 주석을 고친다. 전체 제안(엑셀 열 순서·매칭 규칙·에러 규칙)은
// docs/excel-import.md 참고.
//
// 결정 사항(2026-08-22, 사용자):
//  - 엑셀 해석은 서버가 한다. 프론트는 파일을 multipart로 그대로 올리고, 양식(템플릿)도 서버에서 받는다
//    → 프론트에 xlsx 라이브러리를 넣지 않는다(번들 +400KB 회피). 계좌·카테고리 "이름 → id" 매칭도 서버.
//  - 미리보기 단계 없이 바로 등록하고 결과 요약만 받는다(dryRun은 나중에 필요해지면 쿼리로 추가).
//
// 제안 엔드포인트
//  - GET  /import/excel/transactions/template → 엑셀 바이너리(양식 + 예시 행). 내보내기와 같은 blob 응답.
//  - POST /import/excel/transactions (multipart/form-data, 필드명 `file`) → ApiResponse<ImportTransactionsResult>
//    한 파일 안의 행은 "가능한 건 전부 등록, 안 되는 행만 건너뜀"이다(전체 롤백 아님) — 실패 행 번호와
//    사유를 돌려줘야 사용자가 그 행만 고쳐 다시 올릴 수 있다.

export type ImportKind = 'transactions'

/** 건너뛴 행 하나. `row`는 엑셀의 실제 행 번호(1행 = 헤더, 데이터는 2행부터)라 사용자가 바로 찾아간다. */
export interface ImportRowFailure {
  row: number
  /** 사용자에게 그대로 보여줄 한국어 사유(예: "계좌 '토스뱅크'를 찾을 수 없어요"). */
  message: string
}

export interface ImportTransactionsResult {
  /** 헤더를 뺀 데이터 행 수. */
  totalRows: number
  successCount: number
  failureCount: number
  failures: ImportRowFailure[]
}
