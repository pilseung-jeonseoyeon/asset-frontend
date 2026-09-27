# 엑셀 가져오기·내보내기 — 서버 계약 요약

> 정본은 실행 중인 서버 OpenAPI(`/v3/api-docs`, 태그 "엑셀 가져오기" · "엑셀 내보내기 (2차)")다.
> 아래는 2026-09-27 스냅샷과 대조한 요약이고, 달라지면 여기와 `src/services/import`·`src/services/export`를 함께 고친다.
> 경로는 모두 `VITE_API_BASE_URL`(…/api/v1) 뒤에 붙는다.

진입점은 설정 → 데이터 관리 및 백업 모달(`src/screens/Settings/modals/DataModal.tsx`)의
"엑셀로 가져오기" 행(가계부 거래 / 계좌 탭)과 "전체 내역 내보내기" 행이다.

## 공통 규칙

- **엑셀 해석은 서버가 한다.** 프론트는 파일을 multipart로 그대로 올리고 양식도 서버에서 받는다
  (프론트에 xlsx 라이브러리를 넣지 않는다. 이름 → id 매칭도 서버가 한다).
- **미리보기 없이 바로 등록**하고 결과 요약만 받는다.
- **전체 성공 아니면 전체 롤백.** 한 행이라도 틀리면 아무것도 저장하지 않고 틀린 행을 전부 돌려준다.
  사용자는 알려준 행을 고쳐 같은 파일을 다시 올리므로, 파일 input은 고른 뒤 값을 비워 같은 파일을 연달아
  고를 수 있게 둔다.
- **중복 검사는 하지 않는다** — 같은 파일을 두 번 올리면 두 번 등록된다.
- 모든 칸이 빈 행은 건너뛰고, 최대 **5,000행**까지 받는다. 데이터는 2행부터(1행은 헤더).

## 양식 내려받기

| 엔드포인트 | 파일명(`Content-Disposition`) |
|---|---|
| `GET /import/excel/transactions/template` | `transactions_template.xlsx` |
| `GET /import/excel/accounts/template` | `accounts_template.xlsx` |

응답은 JSON 봉투가 아니라 XLSX 바이너리다. 프론트는 헤더의 파일명을 쓰고, 못 읽으면 같은 이름으로 폴백한다
(`downloadBlobFile`, `src/services/apiBlob.ts`). 두 양식 모두 시트가 둘이다 — 입력 시트(1행 헤더 + 2행 예시)와
**`등록된 이름`** 시트(참고용 이름 목록). 입력 시트의 이름 칸은 `등록된 이름` 시트의 값과 정확히 같아야 한다.

## 거래 가져오기 — `POST /import/excel/transactions`

`거래내역` 시트(없으면 첫 시트)를 읽는다. 모닛 양식뿐 아니라 **편한가계부 내보내기 xlsx도 그대로** 올릴 수 있다 —
A~H열이 편한가계부와 같고, I열(상대계좌)만 모닛이 덧붙인 것이다. 1행 헤더가 A~H와 다르면 파일 단위 실패다.

양식의 예시 행은 그 사용자의 첫 계좌와 첫 지출 분류로 채워져 있어 그대로 올려도 등록된다.
`등록된 이름` 시트에는 해지하지 않은 계좌명과 (구분·대분류·소분류) 조합이 실린다.

| 열 | 헤더 | 값 | 필수 |
|---|---|---|---|
| A | 날짜 | 엑셀 날짜 셀 또는 `yyyy-MM-dd`(구분자 `.`·`/` 허용, 뒤에 시각이 붙으면 앞의 날짜만 읽음) | ✔ |
| B | 계좌 | 계좌 **이름**. 돈이 나가는 계좌(출금). **수입만 예외로 돈이 들어온 계좌** | ✔ |
| C | 대분류 | 구분에 맞는 대분류 이름 | 수입·지출·저축 ✔ |
| D | 소분류 | 그 대분류 아래 소분류 이름 | 수입·지출·저축 ✔ |
| E | 내용 | 거래 제목(1~200자) | ✔ |
| F | 금액 | 0보다 큰 원 단위 정수(쉼표·`원` 표기 허용) | ✔ |
| G | 구분 | `수입` `지출` `저축` `이체` | ✔ |
| H | 메모 | 비워도 됨 | |
| I | 상대계좌 | **입금 계좌**(돈이 들어가는 쪽) 이름 | 이체·저축 ✔ |

- 계좌·상대계좌 이름은 앞뒤 공백을 무시하고 정확히 일치해야 한다. 해지 전 거래를 올릴 수 있게 **해지한 계좌명도 허용**한다
  (`등록된 이름` 시트에는 안 나온다).
- 이체는 대분류·소분류를 무시한다.

### 계좌 두 칸(B열·I열)

I열 '상대계좌'는 곧 입금 계좌, B열 '계좌'는 출금 계좌다. **수입만 예외**로 들어온 돈이 담기는 계좌를 B열에 적는다
(수입은 `accountId`만 받고 `transferAccountId`를 금지하는 거래 등록 규칙 때문).

| 구분 | B열 `계좌` | I열 `상대계좌` |
|---|---|---|
| 수입 | **입금 계좌**(돈이 들어온 곳) | 비움 |
| 지출 | 출금 계좌(돈이 나간 곳) | 비움 |
| 저축 | 출금 계좌 | **입금 계좌**(저축액이 쌓이는 곳) |
| 이체 | 출금 계좌 | **입금 계좌**(받는 곳) |

저축에 I열을 비우면 출금만 잡혀 총자산이 줄어들므로 서버가 막는다. 같은 표가 가져오기 패널에도 있다
(`DataModal.tsx`의 `IMPORT_ACCOUNT_GUIDE`).

### 에러

- 파일 단위(400, 공통 에러 봉투): `IMPORT_FILE_UNREADABLE`(xlsx가 아니거나 헤더가 다름) · `IMPORT_ROWS_EMPTY` ·
  `IMPORT_ROW_LIMIT_EXCEEDED`(5,000행 초과) · `INVALID_INPUT`(5MB 초과).
- 행 단위(200 응답의 `errors`): `IMPORT_*` 코드 또는 일반 `POST /transactions`와 같은 거래 등록 규칙 코드
  (`SUBCATEGORY_REQUIRED` 등). 백엔드 소스 기준 `IMPORT_*` 행 코드는 `IMPORT_DATE_INVALID` `IMPORT_AMOUNT_INVALID`
  `IMPORT_TYPE_INVALID` `IMPORT_DESCRIPTION_INVALID` `IMPORT_ACCOUNT_NOT_FOUND` `IMPORT_ACCOUNT_AMBIGUOUS`
  `IMPORT_CATEGORY_NOT_FOUND` `IMPORT_SUBCATEGORY_NOT_FOUND`이다(OpenAPI에는 목록이 없다). 화면은 코드로 분기하지 않고
  `message`만 보여준다.

## 계좌 가져오기 — `POST /import/excel/accounts`

`계좌` 시트(없으면 첫 시트)의 A~J열을 읽고 K열 이후는 무시한다. 1행 헤더가 양식과 다르면 파일 단위 실패다.
**계좌 목록 내보내기 파일도 같은 열이라 그대로 올릴 수 있다.** `등록된 이름` 시트에는 유형·통화 목록과 등록된 기관명이 실린다.

| 열 | 헤더 | 값 |
|---|---|---|
| A | 계좌명 | 1~100자 |
| B | 유형 | 현금·예적금·주식·가상자산·연금·기타(enum 이름 `STOCK` 등도 허용) |
| C | 통화 | `KRW`·`USD`, 비우면 KRW |
| D | 기관 | 등록된 기관명과 정확히 일치(앞뒤 공백 무시), 비우면 무기관 |
| E | 원화예수금 | 0 이상 원 단위 정수(쉼표·`원` 허용), 비우면 0 |
| F | 달러예수금 | 0 이상, 소수 둘째 자리까지 |
| G | 연이율(%) | 0~999.99 |
| H | 개설일 | `yyyy-MM-dd` |
| I | 만기일 | `yyyy-MM-dd` |
| J | 즉시현금화 | `Y`/`N`, 비우면 Y |

에러:
- 파일 단위(400): `ACCOUNT_IMPORT_FILE_UNREADABLE` · `ACCOUNT_IMPORT_ROWS_EMPTY` · `ACCOUNT_IMPORT_ROW_LIMIT_EXCEEDED`.
- 행 단위: `ACCOUNT_IMPORT_*` 코드(예: `ACCOUNT_IMPORT_TYPE_INVALID`) 또는 계좌 등록 규칙 코드. 전체 목록은 OpenAPI에 없다.

## 가져오기 응답

두 엔드포인트 모두 `multipart/form-data`, 파트명 **`file`**(`.xlsx`)이고 응답 모양이 같다(`ApiResponse<ImportTransactionsResult>`,
항상 200).

```json
{ "success": true, "data": { "importedCount": 4, "errors": [] } }
```
```json
{ "success": true, "data": { "importedCount": 0, "errors": [
    { "rowNumber": 3, "code": "IMPORT_ACCOUNT_NOT_FOUND", "message": "등록된 계좌에서 계좌(B열)와 같은 이름을 찾을 수 없습니다." }
] } }
```

- `rowNumber`는 엑셀에 보이는 행 번호(헤더 1행, 첫 데이터 2행). `errors`가 하나라도 있으면 `importedCount`는 0이다.
- **업로드 요청에는 `Content-Type: multipart/form-data`를 명시해야 한다.** 공용 axios 기본 헤더가 JSON이라 그대로 두면
  axios 1.x가 FormData를 JSON으로 직렬화해 서버가 415로 거절한다. boundary는 브라우저가 붙인다(`import.service.ts`).
- 타임아웃은 60초(공용 10초 대신).
- `importedCount > 0`일 때만 무효화한다: `transaction` · `account` · `asset` · `dashboard` · `goal`, 계좌 가져오기는
  `institution`도(`import.hook.ts`).

## 내보내기

| 엔드포인트 | 쿼리 | 서버 파일명 |
|---|---|---|
| `GET /export/excel/transactions` | `from` `to`(거래일, 선택) | `transactions.xlsx` |
| `GET /export/excel/trades` | `from` `to`(체결일, 선택) | `trades_{from}_{to}.xlsx` — `from` 생략 시 `all`, `to` 생략 시 내려받은 날짜(KST) |
| `GET /export/excel/accounts` | 없음 | `accounts.xlsx` |

- `from`·`to`는 `yyyy-MM-dd`, 양끝 포함, 생략하면 제한 없음. 매매 파일은 체결일 오름차순. 포맷은 xlsx 하나(CSV 없음).
- 계좌 내보내기는 해지하지 않은 계좌를 **잔액이 아니라 등록 시점 원금**으로 담는다(현재 잔액은 원금 + 가계부 증감이라 파생값).
- 화면: 드롭다운 위쪽에서 기간(전체 기간 · 올해 · 최근 3개월 · 최근 1개월)을 고르고 아래에서 종류(가계부 거래 내역 ·
  주식 매매 내역 · 계좌 목록)를 누르면 바로 내려받는다. 기간은 거래·매매에만 실리고 계좌 목록은 항상 전체다.
  '올해'는 1월 1일~오늘, 최근 N개월은 `recentMonthsRange`(`src/utils/date.ts`) — 정산월이 아니라 달력 기준이다.
  '전체 기간'은 `from`·`to`를 모두 생략한다.
- 헤더에서 파일명을 못 읽으면 `monit-{거래내역|매매내역|계좌목록}-{yyyyMMdd}.xlsx`로 저장한다(`export.service.ts`).
- blob 클라이언트 타임아웃은 60초. 실패 응답도 Blob이라 `apiBlob.ts`가 텍스트로 읽어 서버 `message`를 복원한다.

## 프론트 쪽 파일

- `src/services/apiBlob.ts` — blob 전용 axios(가져오기 양식·내보내기 공용), `downloadBlobFile`
- `src/services/import/` — `downloadImportTemplate`, `uploadImportFile`, `useDownloadImportTemplate`, `useUploadImportFile` (`ImportKind = 'transactions' | 'accounts'`)
- `src/services/export/` — `downloadExportFile`, `useDownloadExportFile` (`ExportKind = 'transactions' | 'trades' | 'accounts'`)
- `src/utils/download.ts` — `triggerBrowserDownload`
- `src/screens/Settings/modals/DataModal.tsx` — 가져오기 패널(탭·양식·업로드·결과)과 내보내기 드롭다운

## 확인 필요

- 계좌 가져오기 C열 '통화'와 F열 설명("외화 표시 계좌 또는 주식·가상자산 계좌만")은 계좌에서 표시 통화가 사라진
  2026-09-26 계약 변경과 맞지 않는다. 서버 설명이 옛 문구인지, 통화 열이 실제로 무엇에 쓰이는지 백엔드에 확인한다.
