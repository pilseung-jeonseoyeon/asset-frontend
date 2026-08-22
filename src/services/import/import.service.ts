import { api, unwrap } from '../api'
import type { ApiResponse } from '../api.types'
import { downloadBlobFile } from '../apiBlob'
import type { BlobFileResult } from '../apiBlob'
import type { ImportKind, ImportTransactionsResult } from './import.type'

const IMPORT_PATHS: Record<ImportKind, string> = {
  transactions: '/import/excel/transactions',
}

// 서버가 Content-Disposition으로 주는 이름(transactions_template.xlsx)과 같은 폴백. 헤더를 못 읽었을 때만 쓴다.
const IMPORT_TEMPLATE_FALLBACK_FILENAME: Record<ImportKind, string> = {
  transactions: 'transactions_template.xlsx',
}

/**
 * 가져오기용 엑셀 양식을 내려받는다. 양식은 시트가 둘이다 — 1번 "거래내역"(A~I 헤더 + 예시 행),
 * 2번 "등록된 이름"(이 사용자의 계좌·대분류·소분류 이름 목록 — 거래내역 시트의 계좌·분류 칸은 여기 있는
 * 이름과 정확히 같아야 한다). 실제 다운로드 트리거는 훅에서 한다.
 */
export function downloadImportTemplate(kind: ImportKind): Promise<BlobFileResult> {
  return downloadBlobFile(`${IMPORT_PATHS[kind]}/template`, {
    fallbackFilename: IMPORT_TEMPLATE_FALLBACK_FILENAME[kind],
    errorCode: 'IMPORT_TEMPLATE_FAILED',
    fallbackErrorMessage: '양식을 내려받지 못했어요.',
  })
}

/**
 * 엑셀 파일을 multipart(`file`)로 올려 서버가 행을 해석·등록하게 한다.
 *
 * Content-Type을 여기서 `multipart/form-data`로 **반드시 덮어쓴다**. 공용 `api` 인스턴스의 기본 헤더가
 * application/json인데, axios 1.x는 "body가 FormData이고 Content-Type이 JSON이면" FormData를 JSON 객체로
 * 직렬화해 보낸다(lib/defaults transformRequest의 `hasJSONContentType ? JSON.stringify(formDataToJSON(data))`).
 * 그래서 2026-08-22 첫 업로드가 서버에서 `Content-Type 'application/json' is not supported`(415)로 거절됐다.
 * multipart로 지정하면 브라우저 어댑터가 그 값을 지우고 boundary가 붙은 실제 multipart 헤더를 브라우저가 붙인다
 * — 여기서 직접 boundary를 만들지 않는다.
 * 응답은 전체 성공(errors 빈 배열) 또는 전체 롤백(importedCount 0 + errors) 둘 중 하나다(import.type.ts 참고).
 */
export async function uploadImportFile(kind: ImportKind, file: File): Promise<ImportTransactionsResult> {
  const form = new FormData()
  form.append('file', file, file.name)
  const res = await api.post<ApiResponse<ImportTransactionsResult>>(IMPORT_PATHS[kind], form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    // 큰 파일은 서버 해석에 시간이 걸린다 — 공용 10초 타임아웃 대신 넉넉히 준다.
    timeout: 60000,
  })
  return unwrap(res)
}
