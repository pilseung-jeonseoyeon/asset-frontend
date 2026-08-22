# 가계부 엑셀 가져오기 — 프론트 제안 계약 (백엔드 구현 요청)

> 상태: **백엔드 API 없음** (2026-08-22 프론트 레이어 먼저 작성). 서버가 만들어지면 정본은 OpenAPI 문서이고,
> 이 문서와 `src/services/import/import.type.ts`를 그쪽에 맞춰 고친다.

## 목적

타 가계부(편한가계부 양식)에서 내보낸 엑셀을 올려 거래를 한 번에 등록한다. 진입점은
설정 → 데이터 관리 모달의 "엑셀로 가져오기" 행(`src/screens/Settings/modals/DataModal.tsx`).

## 결정 사항

- **엑셀 해석은 서버가 한다.** 프론트는 파일을 multipart로 그대로 올리고, 양식 파일도 서버에서 받는다.
  (프론트에 xlsx 라이브러리를 넣지 않음. 계좌·카테고리 이름 → id 매칭은 서버가 DB를 보고 한다.)
- **미리보기 없이 바로 등록**하고 결과 요약만 받는다. 행 단위로 "되는 건 등록, 안 되는 건 건너뜀"(파일 전체 롤백 아님).
  나중에 필요하면 `?dryRun=true`를 추가해 검증만 하도록 확장한다.

## 엑셀 열 순서 (A열부터, 1행 = 헤더, 2행부터 데이터)

| 열 | 헤더 | 값 | 필수 |
|---|---|---|---|
| A | 날짜 | `yyyy-MM-dd` · `yyyy.MM.dd` · `yyyy/MM/dd` 또는 엑셀 날짜 셀. 시각이 붙어 있으면 무시 | ✔ |
| B | 계좌(자산) | 사용자 계좌 **이름**(정확히 일치, 앞뒤 공백 무시). 이체·저축은 **출금 계좌** | ✔ |
| C | 대분류 | 수입/지출/저축 대분류 이름. **이체 행은 입금(상대) 계좌 이름**(편한가계부 관례) — *확인 필요* | 수입·지출·저축 ✔ |
| D | 소분류 | 소분류 이름(대분류 아래에서 찾음). 이체 행은 비움 | 수입·지출·저축 ✔ |
| E | 내용 | 거래 제목 | ✔ |
| F | 금액 | 양수. `1,234` · `1234원` 같은 표기 허용(콤마·`원` 제거) | ✔ |
| G | 수입/지출/저축/이체 | 네 값 중 하나(공백 무시). `INCOME/EXPENSE/SAVING/TRANSFER`도 허용하면 좋음 | ✔ |
| H | 상세내역(메모) | 메모, 비워도 됨 | |

저축 행의 상대 계좌(`transferAccountId`)가 문제다 — 거래 등록 규칙상 저축은 `subcategoryId`와
`transferAccountId`가 **둘 다 필수**인데(CLAUDE.md 도메인 컨텍스트) 이 양식엔 그 칸이 없다.
제안: **저축 행은 소분류 이름이 저축 계좌 이름과 같으면 그 계좌로**, 아니면 실패 사유로
"저축이 들어간 계좌를 찾을 수 없어요"를 내려준다. 더 나은 규칙이 있으면 백엔드가 정하고 여기 반영.

## 엔드포인트

### `GET /import/excel/transactions/template`
- 응답: 엑셀 바이너리(`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`), 헤더 행 + 예시 행 2~3개.
- `Content-Disposition: attachment; filename*=UTF-8''...` 주면 프론트가 그 이름을 쓰고, 없으면
  `monit-가계부양식-yyyyMMdd.xlsx`로 폴백. (내보내기 `GET /export/excel/transactions`와 같은 방식 — 같은 blob 클라이언트 사용)

### `POST /import/excel/transactions`
- 요청: `multipart/form-data`, 필드명 **`file`** (`.xlsx`, 필요하면 `.xls`/`.csv`까지). 권장 최대 5MB / 5,000행.
- 응답 (`ApiResponse<ImportTransactionsResult>`):
  ```json
  {
    "success": true,
    "data": {
      "totalRows": 120,
      "successCount": 117,
      "failureCount": 3,
      "failures": [
        { "row": 14, "message": "계좌 '토스뱅크'를 찾을 수 없어요" },
        { "row": 58, "message": "소분류 '배달'이 대분류 '식비' 아래에 없어요" },
        { "row": 91, "message": "금액이 비어 있어요" }
      ]
    }
  }
  ```
  - `row`는 엑셀 실제 행 번호(헤더가 1행). `message`는 사용자에게 그대로 보여주는 한국어 문장.
  - 일부 행만 실패해도 **200**. 파일 자체를 못 읽을 때(형식 아님, 헤더 불일치, 빈 파일)는 400 +
    공통 에러 봉투(`error.code/message`) — 예: `IMPORT_INVALID_FILE`, `IMPORT_HEADER_MISMATCH`, `IMPORT_EMPTY`.
- 등록된 거래는 일반 `POST /transactions`로 만든 것과 동일하게 취급(잔액·자산·목표·대시보드 재계산).

## 프론트 쪽 파일

- `src/services/apiBlob.ts` — blob 전용 axios(내보내기에서 끌어올림), `downloadBlobFile`
- `src/services/import/` — `downloadImportTemplate`, `uploadImportFile`, `useDownloadImportTemplate`, `useUploadImportFile`
- `src/utils/download.ts` — `triggerBrowserDownload`
- `src/screens/Settings/modals/DataModal.tsx` — 가져오기 행 + 양식/업로드/결과 UI
