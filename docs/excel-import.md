# 엑셀 가져오기·내보내기 — 계약 요약

> 정본은 DB 함수(`supabase/migrations/20261024000007_app_api.sql` 3·4부 — `import_transactions` · `import_accounts` ·
> `export_transactions` · `export_trades` · `export_accounts`)와 이 문서다. 2026-10-24에 스프링(POI) 구현을 그대로 옮겼다 —
> 시트 이름·열 순서·헤더·오류 코드·문구가 스프링 `ExcelConstants`·`LedgerFacadeService`·`AccountFacadeService`와 같아서
> 예전에 내려받은 양식·내보내기 파일도 그대로 올라간다. 달라지면 여기와 `src/services/import`·`src/services/export`·
> `src/utils/xlsx`를 함께 고친다.

진입점은 설정 → 데이터 관리 및 백업 모달(`src/screens/Settings/modals/DataModal.tsx`)의
"엑셀로 가져오기" 행(가계부 거래 / 계좌 탭)과 "전체 내역 내보내기" 행이다.

## 공통 규칙

- **엑셀 파일은 앱이 만들고 읽는다**(SheetJS `xlsx`, `src/utils/xlsx/` — 엑셀 기능을 처음 쓸 때만 내려받는 별도 청크, 약 490KB).
  **검증·이름 → id 매칭·전체 롤백은 DB 함수가 한다.** 앱은 시트를 "행 번호 + 문자열 칸" 배열로 바꿔 RPC에 넘길 뿐
  날짜·금액·이름을 해석하지 않는다(해석 규칙이 DB 한 곳에만 있도록).
- **미리보기 없이 바로 등록**하고 결과 요약만 받는다.
- **전체 성공 아니면 전체 롤백.** 한 행이라도 틀리면 아무것도 저장하지 않고 틀린 행을 전부 돌려준다.
  사용자는 알려준 행을 고쳐 같은 파일을 다시 올리므로, 파일 input은 고른 뒤 값을 비워 같은 파일을 연달아
  고를 수 있게 둔다.
- **중복 검사는 하지 않는다** — 같은 파일을 두 번 올리면 두 번 등록된다.
- 모든 칸이 빈 행은 건너뛰고, 최대 **5,000행**까지 받는다(넘으면 `*_ROW_LIMIT_EXCEEDED`). 데이터는 2행부터(1행은 헤더).
  파일은 **5MB**까지 — 앱이 올리기 전에 막는다(`INVALID_INPUT`).
- 셀 읽기 규칙(`src/utils/xlsx/readSheet.ts`, 스프링 `cellText`와 같다): 날짜 서식의 숫자 셀은 `yyyy-MM-dd`(엑셀 일련번호를
  직접 연·월·일로 풀어 시간대 때문에 하루가 밀리지 않는다), 숫자 셀은 지수 없는 평문(`12000` · `500.02`), 문자열은 앞뒤 공백을
  떼고, 수식 셀은 저장된 결과값을 읽는다. 퍼센트 서식의 숫자 셀만 스프링과 달리 **보이는 숫자**로 읽는다(`4%` → `4` —
  엑셀은 `4%`를 0.04로 저장해 그대로 넘기면 연이율이 0.04%가 됐다, 2026-10-31. 따옴표·`\%`로 쓴 글자 `%`는 100배 하지 않는다).

## 양식 내려받기

| 종류 | 파일명 | 1번 시트 | 2번 시트 `등록된 이름` |
|---|---|---|---|
| 거래 | `Monit_가계부_템플릿.xlsx` | `거래내역` — A~I 헤더 + 예시 1행 | A열 `계좌`(해지 안 한 계좌명) / C~E열 `구분`·`대분류`·`소분류`(내 소분류 조합 전부) |
| 계좌 | `Monit_계좌_템플릿.xlsx` | `계좌` — A~I 헤더 + 예시 1행 | A열 `유형`(현금·예적금·주식·가상자산·연금·기타) / C열 `기관`(등록된 기관명 전체) |

앱이 `get_accounts`·`get_categories`·`institutions`에서 이름을 읽어 두 시트짜리 파일을 만든다(`downloadImportTemplate`).
입력 시트의 이름 칸은 `등록된 이름` 시트의 값과 정확히 같아야 한다(앞뒤 공백만 무시). 거래 양식의 예시 행은 내 첫 계좌와
첫 지출 대분류·소분류(없으면 첫 분류, 그것도 없으면 `식비/외식`)로 채워져 있어 그대로 올려도 등록된다(날짜는 내려받은 날).
계좌 양식의 예시 행은 `증권계좌 · 주식 · (첫 기관) · 1000000 · 500.02 · (빈칸) · 2026-01-02 · (빈칸) · Y`다.

## 거래 가져오기 — `import_transactions(p_rows jsonb)`

`거래내역` 시트(없으면 첫 시트)를 읽는다. 모닛 양식뿐 아니라 **편한가계부 내보내기 xlsx도 그대로** 올릴 수 있다 —
A~H열이 편한가계부와 같고, I열(상대계좌)만 모닛이 덧붙인 것이다. 1행 헤더가 A~H와 다르면 파일 단위 실패
(`IMPORT_FILE_UNREADABLE`)다 — 앱이 올리기 전에 검사한다.

| 열 | 헤더 | 값 | 필수 |
|---|---|---|---|
| A | 날짜 | 엑셀 날짜 셀 또는 `yyyy-MM-dd`(구분자 `.`·`/` 허용, 뒤에 시각이 붙으면 앞의 날짜만 읽음) | ✔ |
| B | 계좌 | 계좌 **이름**. 돈이 나가는 계좌(출금). **수입만 예외로 돈이 들어온 계좌** | ✔ |
| C | 대분류 | 구분에 맞는 대분류 이름 | 수입·지출·저축 ✔ |
| D | 소분류 | 그 대분류 아래 소분류 이름 | 수입·지출·저축 ✔ |
| E | 내용 | 거래 제목(1~200자) | ✔ |
| F | 금액 | 0보다 큰 원 단위 정수(쉼표·`원` 표기 허용) | ✔ |
| G | 구분 | `수입` `지출` `저축` `이체`(enum 이름 `EXPENSE` 등도 허용) | ✔ |
| H | 메모 | 비워도 됨 | |
| I | 상대계좌 | **입금 계좌**(돈이 들어가는 쪽) 이름 | 이체·저축 ✔ |

행 하나는 `{ rowNumber, date, account, category, subcategory, description, amount, type, memo, transferAccount }`(rowNumber 외 전부
문자열)로 넘어가고, DB 함수가 스프링 `resolveImportRow`와 같은 순서(구분 → 날짜 → 금액 → 내용 → 계좌 → 상대계좌 → 분류 →
거래 규칙 트리거)로 검사한다.

| 구분 | B열 `계좌` | I열 `상대계좌` |
|---|---|---|
| 수입 | **입금 계좌**(돈이 들어온 곳) | 비움 |
| 지출 | 출금 계좌(돈이 나간 곳) | 비움 |
| 저축 | 출금 계좌 | **입금 계좌**(저축액이 쌓이는 곳) |
| 이체 | 출금 계좌 | **입금 계좌**(받는 곳) |

계좌·상대계좌는 **사용 중인 계좌 이름**으로 찾는다(해지한 계좌는 같은 이름의 사용 중 계좌가 없을 때만 — 000022). 사용 중인 계좌끼리
이름이 같으면 어느 계좌인지 정할 수 없어 `IMPORT_ACCOUNT_AMBIGUOUS`라, 2026-10-31부터 계좌 등록·수정·계좌 가져오기에서 같은 이름을
막는다(`ACCOUNT_NAME_DUPLICATE`, 000029). 그 전부터 겹쳐 있던 계좌가 있으면 가져오기 패널이 이름과 개수를 미리 알린다.

저축에 I열을 비우면 출금만 잡혀 총자산이 줄어들므로 DB가 막는다(`TRANSFER_ACCOUNT_REQUIRED` — 줄 오류 문구는 "이체·저축 거래는
상대계좌(I열)가 필수입니다.", 000030). 같은 표가 가져오기 패널에도 있다
(`DataModal.tsx`의 `IMPORT_ACCOUNT_GUIDE`).

### 에러

- 파일 단위(ApiError): `IMPORT_FILE_UNREADABLE`(xlsx가 아니거나 헤더가 다름 — 앱) · `IMPORT_ROWS_EMPTY` ·
  `IMPORT_ROW_LIMIT_EXCEEDED`(5,000행 초과) · `INVALID_INPUT`(5MB 초과 — 앱) · `EXCEL_MODULE_UNAVAILABLE`(SheetJS 청크를 못 받음).
- 행 단위(결과의 `errors`): `IMPORT_DATE_INVALID` `IMPORT_AMOUNT_INVALID` `IMPORT_TYPE_INVALID` `IMPORT_DESCRIPTION_INVALID`
  `IMPORT_ACCOUNT_NOT_FOUND` `IMPORT_ACCOUNT_AMBIGUOUS` `IMPORT_TRANSFER_ACCOUNT_NOT_FOUND` `IMPORT_CATEGORY_NOT_FOUND`
  `IMPORT_SUBCATEGORY_NOT_FOUND`, 또는 일반 거래 등록과 같은 규칙 코드(`SUBCATEGORY_REQUIRED` 등 — 3단계 트리거).
  문구는 `private.import_message`가 붙인다(`src/services/errorMessages.ts`와 같은 문장 — 규칙 코드 중 `TRANSFER_ACCOUNT_REQUIRED`만
  가져오기 쪽에 고칠 열 '(I열)'을 더 적는다). 화면은 코드로 분기하지 않고 `message`만 보여준다.

## 계좌 가져오기 — `import_accounts(p_rows jsonb)`

`계좌` 시트(없으면 첫 시트)의 **A~I열**을 읽고 J열 이후는 무시한다. 1행 헤더 9개가 전부 양식과 같아야 한다
(`ACCOUNT_IMPORT_FILE_UNREADABLE`). **계좌 목록 내보내기 파일도 같은 열이라 그대로 올릴 수 있다.**
계좌에는 표시 통화가 없으므로 '통화' 열은 없다(예전 문서의 C열 '통화'는 스프링 구현에도 없던 잘못된 기술 — 2026-10-24 정리).

| 열 | 헤더 | 값 |
|---|---|---|
| A | 계좌명 | 1~100자 |
| B | 유형 | 현금·예적금·주식·가상자산·연금·기타(enum 이름 `STOCK` 등도 허용) |
| C | 기관 | 등록된 기관명과 정확히 일치(앞뒤 공백 무시), 비우면 무기관 |
| D | 원화예수금 | 0 이상 원 단위 정수(쉼표·`원` 허용), 비우면 잔액 줄을 만들지 않음(0과 같다) |
| E | 달러예수금 | 0 이상, 소수 둘째 자리까지 — 주식·가상자산 계좌만(그 외는 `INITIAL_BALANCE_SINGLE_CURRENCY_ONLY`) |
| F | 연이율(%) | 0~999.99, 소수 둘째 자리까지(`%` 표기 허용) |
| G | 개설일 | `yyyy-MM-dd` |
| H | 만기일 | `yyyy-MM-dd` |
| I | 즉시현금화 | `Y`/`N`(예/아니오도 됨), 비우면 Y |

행 하나는 `{ rowNumber, name, type, institution, balanceKrw, balanceUsd, interestRate, openedAt, maturityDate, isLiquid }`로 넘어가고
DB 함수가 행마다 `create_account`를 부른다(초기 잔액 ADJUSTMENT 포함). 달러 줄의 원화 환산에 환율이 필요하므로 환율 테이블이
비어 있으면 `FX_RATE_NOT_FOUND`가 행 오류로 나온다.

에러:
- 파일 단위: `ACCOUNT_IMPORT_FILE_UNREADABLE`(앱) · `ACCOUNT_IMPORT_ROWS_EMPTY` · `ACCOUNT_IMPORT_ROW_LIMIT_EXCEEDED` · `INVALID_INPUT`(5MB) ·
  `EXCEL_MODULE_UNAVAILABLE`.
- 행 단위: `ACCOUNT_IMPORT_NAME_INVALID` `ACCOUNT_IMPORT_TYPE_INVALID` `ACCOUNT_IMPORT_INSTITUTION_NOT_FOUND` `ACCOUNT_IMPORT_BALANCE_INVALID`
  `ACCOUNT_IMPORT_USD_BALANCE_INVALID` `ACCOUNT_IMPORT_RATE_INVALID` `ACCOUNT_IMPORT_DATE_INVALID` `ACCOUNT_IMPORT_LIQUID_INVALID`,
  또는 계좌 등록 규칙 코드(`INITIAL_BALANCE_*` 등).

## 가져오기 결과

두 함수 모두 같은 모양(`ImportTransactionsResult`)을 돌려준다.

```json
{ "importedCount": 4, "errors": [] }
```
```json
{ "importedCount": 0, "errors": [
    { "rowNumber": 3, "code": "IMPORT_ACCOUNT_NOT_FOUND", "message": "등록된 계좌에서 계좌(B열)와 같은 이름을 찾을 수 없습니다." }
] }
```

- `rowNumber`는 엑셀에 보이는 행 번호(헤더 1행, 첫 데이터 2행 — 빈 행을 건너뛰어도 번호는 원래 자리). `errors`가 하나라도 있으면
  `importedCount`는 0이다.
- `importedCount > 0`일 때만 무효화한다: `transaction` · `account` · `asset` · `dashboard` · `goal`, 계좌 가져오기는
  `institution`도(`import.hook.ts`).

## 내보내기

| 종류 | DB 함수 | 시트 | 파일명 |
|---|---|---|---|
| 거래 | `export_transactions(p_from, p_to)` | `거래내역` — 거래일·타입·대분류·소분류·금액·계좌·상대계좌·내용·메모 | `Monit_가계부_거래내역_{기간}.xlsx` |
| 매매 | `export_trades(p_from, p_to)` | `매매내역` — 체결일·종목명·티커·시장·매수/매도·수량·단가·수수료·세금·환율·메모 | `Monit_주식_매매내역_{기간}.xlsx` |
| 계좌 | `export_accounts()` | `계좌` — 계좌 가져오기 양식과 같은 A~I | `Monit_계좌_목록_{내려받은 날}.xlsx` |

- RPC가 `{ headers, rows }`를 돌려주고 앱이 xlsx로 만들어 저장한다(`downloadExportFile` → `buildWorkbook` → `saveFile`).
  파일명 규칙은 `exportFilename`(`export.service.ts`, 2026-10-31 사용자 결정 — `Monit_` + 한글, 날짜는 `yyyyMMdd`):
  `{기간}`은 기간을 고르면 `{from}-{to}`(예: `20260731-20261031`, `to`를 생략하면 내려받은 날), 전체 기간이면
  `전체_{to 또는 내려받은 날}`이다. 시트 이름도 한글(`거래내역` · `매매내역` · `계좌`).
- `from`·`to`는 `yyyy-MM-dd`, 양끝 포함, 생략하면 제한 없음. 거래는 거래일, 매매는 체결일 오름차순. 거래 내보내기에
  `ADJUSTMENT`(잔액 정정)·`EXCHANGE`(환전)는 들어가지 않는다. 거래 내보내기의 타입은 `수입`·`지출`·`저축`·`이체`, 계좌·상대계좌는
  계좌 **이름**(해지한 계좌도 이름 그대로)이다 — 2026-10-30에 스프링 형식(영어 enum·계좌 id)에서 바꿨다(사용자 요청). 숫자 문자열은 꼬리 0을 뗀다(`10.00000000` → `10`).
- 계좌 내보내기는 해지하지 않은 계좌의 **통화별 현재 예수금**(원화·달러 각각 그 통화 금액 그대로 — 환율 미적용, 보유 종목 평가액 제외)이다.
- 화면: 드롭다운 위쪽에서 기간(전체 기간 · 올해 · 최근 3개월 · 최근 1개월)을 고르고 아래에서 종류(가계부 거래 내역 ·
  주식 매매 내역 · 계좌 목록)를 누르면 바로 저장된다. 기간은 거래·매매에만 실리고 계좌 목록은 항상 전체다.
  '올해'는 1월 1일~오늘, 최근 N개월은 `recentMonthsRange`(`src/utils/date.ts`) — 정산월이 아니라 달력 기준이다.
  '전체 기간'은 `from`·`to`를 모두 생략한다.
- 저장은 `saveFile`(`src/utils/saveFile.ts`) — 브라우저는 다운로드, 데스크톱 앱은 저장 창. 실패 코드는 `EXPORT_FAILED` ·
  `EXCEL_MODULE_UNAVAILABLE`.

## 프론트 쪽 파일

- `src/utils/xlsx/` — `readSheet`(시트 → 행 번호 + 문자열 칸, 빈 행 제거, `SheetReadError`) · `buildWorkbook`(시트 배열 → xlsx Blob) ·
  `loader.ts`(SheetJS 지연 로드, `XlsxLoadError`)
- `src/utils/saveFile.ts` — `saveFile({ blob, filename })`(엑셀·월간 리포트 이미지 공용)
- `src/services/import/` — `downloadImportTemplate`, `uploadImportFile`, `useDownloadImportTemplate`, `useUploadImportFile`
  (`ImportKind = 'transactions' | 'accounts'`)
- `src/services/export/` — `downloadExportFile`, `exportFilename`, `useDownloadExportFile` (`ExportKind = 'transactions' | 'trades' | 'accounts'`)
- `src/screens/Settings/modals/DataModal.tsx` — 가져오기 패널(탭·양식·업로드·결과)과 내보내기 드롭다운
