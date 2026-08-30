# 가계부 엑셀 가져오기 — 서버 계약 요약

> 상태: **백엔드 구현 중 → 프론트 연결 완료**(2026-08-22). 정본은 서버 OpenAPI 문서이고, 아래는 백엔드 소스
> (`TransactionExcelImportController` · `TransactionImportRes` · `TransactionImportErrorRes` · `ExcelConstants` · `LedgerErrorCode`)와
> 대조해 적은 요약이다. 실행 중인 서버 문서에 업로드 엔드포인트가 올라오면 다시 한 번 대조하고, 달라진 점은 여기와
> `src/services/import/import.type.ts`에 반영한다.

## 목적

다른 가계부에서 옮겨 오거나 한 번에 많은 거래를 넣을 때, 모닛 양식 엑셀을 올려 거래를 일괄 등록한다.
진입점은 설정 → 데이터 관리 모달의 "엑셀로 가져오기" 행(`src/screens/Settings/modals/DataModal.tsx`).

## 결정 사항

- **엑셀 해석은 서버가 한다.** 프론트는 파일을 multipart로 그대로 올리고, 양식 파일도 서버에서 받는다.
  (프론트에 xlsx 라이브러리를 넣지 않음. 계좌·카테고리 이름 → id 매칭은 서버가 DB를 보고 한다.)
- **미리보기 없이 바로 등록**하고 결과 요약만 받는다.
- **전체 성공 아니면 전체 롤백.** 한 행이라도 틀리면 **아무것도 저장하지 않고** 틀린 행을 전부 알려준다
  (프론트 제안이었던 "되는 건 등록, 안 되는 건 건너뜀"은 채택되지 않았다). 사용자는 알려준 행을 고쳐 같은
  파일을 다시 올린다 — 그래서 파일 input은 같은 파일을 연달아 다시 고를 수 있게 해둔다.

## 양식 파일 (`transactions_template.xlsx`)

시트가 둘이다.

1. **`거래내역`** — 1행 헤더(A~I) + 2행 예시. 데이터는 2행부터(예시를 지우고 쓴다).
2. **`등록된 이름`** — 이 사용자의 계좌명과 (구분·대분류·소분류) 조합 목록(참고용). 거래내역 시트의 계좌·분류 칸은
   **여기 있는 이름과 정확히 같아야** 한다.

A~H열은 편한가계부 내보내기 양식과 같고, I열(상대계좌)만 모닛이 덧붙인 것이다.

| 열 | 헤더 | 값 | 필수 |
|---|---|---|---|
| A | 날짜 | 날짜(엑셀 날짜 셀 또는 `yyyy-MM-dd`) | ✔ |
| B | 계좌 | 사용자 계좌 **이름**. 돈이 **나가는** 계좌다 — 지출·이체·저축은 **출금 계좌**. 단 **수입은 예외로 돈이 들어온 입금 계좌**(=이 계좌가 곧 입금 계좌라 I열을 비운다) | ✔ |
| C | 대분류 | 수입/지출/저축 대분류 이름 | 수입·지출·저축 ✔ |
| D | 소분류 | 소분류 이름(대분류 아래에서 찾음) | 수입·지출·저축 ✔ |
| E | 내용 | 거래 제목(1~200자) | ✔ |
| F | 금액 | 1원 이상 정수 | ✔ |
| G | 구분 | `수입` `지출` `저축` `이체` 중 하나 | ✔ |
| H | 메모 | 비워도 됨 | |
| I | 상대계좌 | **입금 계좌**(돈이 들어가는 쪽) 이름. 이체·저축에서 B열 출금 계좌의 상대편이다 — 거래 등록 규칙(이체·저축은 `transferAccountId` 필수)과 같다 | 이체·저축 ✔ |

### 계좌 두 칸(B열·I열)이 각각 무엇인지

**I열 '상대계좌'는 곧 '입금 계좌'다** — 돈이 들어가는 쪽. B열 '계좌'는 돈이 나가는 쪽(출금 계좌)이다.
**수입만 예외**로, 들어온 돈이 담기는 계좌를 I열이 아니라 **B열에 적는다**(수입은 서버 계약상
`accountId`만 받고 `transferAccountId`를 금지하기 때문 — CLAUDE.md 도메인 컨텍스트).

| 구분 | B열 `계좌` | I열 `상대계좌` |
|---|---|---|
| 수입 | **입금 계좌**(돈이 들어온 곳) | 비움 |
| 지출 | 출금 계좌(돈이 나간 곳) | 비움 |
| 저축 | 출금 계좌 | **입금 계좌**(저축액이 쌓이는 곳) |
| 이체 | 출금 계좌 | **입금 계좌**(받는 곳) |

저축에 I열을 비우면 출금만 잡혀 총자산이 줄어든다(같은 이유로 서버가 400으로 막는다).

최대 **5,000행**(`IMPORT_MAX_ROWS`). 열별 세부 검증(날짜 표기 허용 범위, 공백 처리 등)은 서버 구현이 정본이다.

## 엔드포인트

(아래 경로는 `VITE_API_BASE_URL`(…/api/v1) 뒤에 붙는다.)

### `GET /import/excel/transactions/template`
- 응답: 엑셀 바이너리, `Content-Disposition: attachment; filename="transactions_template.xlsx"`.
  프론트는 헤더의 이름을 쓰고, 없으면 같은 이름으로 폴백(`downloadBlobFile`, 내보내기와 같은 blob 클라이언트).

### `POST /import/excel/transactions`
- 요청: `multipart/form-data`, 필드명 **`file`** (`.xlsx`).
  **프론트는 이 요청에 `Content-Type: multipart/form-data`를 명시해야 한다** — 공용 axios 기본 헤더가
  application/json인데, axios 1.x는 FormData + JSON 헤더 조합이면 FormData를 JSON으로 직렬화해 보내 서버가
  415(`Content-Type 'application/json' is not supported`)로 거절한다(2026-08-22 실제 발생). `import.service.ts` 참고.
- 응답 (`ApiResponse<ImportTransactionsResult>`):
  ```json
  { "success": true, "data": { "importedCount": 4, "errors": [] } }
  ```
  ```json
  { "success": true, "data": { "importedCount": 0, "errors": [
      { "rowNumber": 3, "code": "IMPORT_ACCOUNT_NOT_FOUND", "message": "등록된 계좌에서 같은 이름을 찾을 수 없습니다." },
      { "rowNumber": 5, "code": "IMPORT_SUBCATEGORY_NOT_FOUND", "message": "해당 대분류에 같은 이름의 소분류가 없습니다." }
  ] } }
  ```
  - `rowNumber`는 엑셀 화면에 보이는 행 번호(헤더 1행, 첫 데이터 2행). `message`는 그대로 화면에 보여준다.
  - `errors`가 하나라도 있으면 `importedCount`는 0이다(전체 롤백). 둘 다 200.
  - 파일 단위 실패는 공통 에러 봉투(400): `IMPORT_FILE_UNREADABLE`(엑셀을 읽을 수 없음) ·
    `IMPORT_ROWS_EMPTY`(가져올 거래 없음) · `IMPORT_ROW_LIMIT_EXCEEDED`(5,000행 초과).
  - 행 단위 코드: `IMPORT_DATE_INVALID` `IMPORT_AMOUNT_INVALID` `IMPORT_TYPE_INVALID` `IMPORT_DESCRIPTION_INVALID`
    `IMPORT_ACCOUNT_NOT_FOUND` `IMPORT_ACCOUNT_AMBIGUOUS` `IMPORT_CATEGORY_NOT_FOUND` `IMPORT_SUBCATEGORY_NOT_FOUND`.
    (거래 등록 규칙 위반 — 이체에 소분류, 저축에 상대계좌 누락 등 — 은 일반 `POST /transactions`와 같은 코드로 온다.)
- 등록된 거래는 일반 `POST /transactions`로 만든 것과 동일하게 취급(잔액·자산·목표·대시보드 재계산) →
  프론트는 `importedCount > 0`일 때만 거래 1건 등록과 같은 쿼리 범위를 무효화한다.

## 프론트 쪽 파일

- `src/services/apiBlob.ts` — blob 전용 axios(내보내기와 공용), `downloadBlobFile`
- `src/services/import/` — `downloadImportTemplate`, `uploadImportFile`, `useDownloadImportTemplate`, `useUploadImportFile`
- `src/utils/download.ts` — `triggerBrowserDownload`
- `src/screens/Settings/modals/DataModal.tsx` — 가져오기 행 + 양식/업로드/결과 UI
