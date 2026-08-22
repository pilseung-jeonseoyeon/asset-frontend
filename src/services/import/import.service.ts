import { api, unwrap } from '../api'
import type { ApiResponse } from '../api.types'
import { downloadBlobFile, todayStamp } from '../apiBlob'
import type { BlobFileResult } from '../apiBlob'
import type { ImportKind, ImportTransactionsResult } from './import.type'

const IMPORT_PATHS: Record<ImportKind, string> = {
  transactions: '/import/excel/transactions',
}

const IMPORT_KIND_LABEL: Record<ImportKind, string> = {
  transactions: '가계부양식',
}

/** 가져오기용 엑셀 양식(헤더 + 예시 행)을 내려받는다. 실제 다운로드 트리거는 훅에서 한다. */
export function downloadImportTemplate(kind: ImportKind): Promise<BlobFileResult> {
  return downloadBlobFile(`${IMPORT_PATHS[kind]}/template`, {
    fallbackFilename: `monit-${IMPORT_KIND_LABEL[kind]}-${todayStamp()}.xlsx`,
    errorCode: 'IMPORT_TEMPLATE_FAILED',
    fallbackErrorMessage: '양식을 내려받지 못했어요.',
  })
}

/**
 * 엑셀 파일을 multipart(`file`)로 올려 서버가 행을 해석·등록하게 한다. 공용 `api` 인스턴스의 기본
 * Content-Type은 application/json이지만, axios는 body가 FormData면 브라우저가 boundary를 붙인
 * multipart 헤더를 쓰도록 그 값을 지운다 — 여기서 직접 boundary를 만들지 않는다.
 */
export async function uploadImportFile(kind: ImportKind, file: File): Promise<ImportTransactionsResult> {
  const form = new FormData()
  form.append('file', file, file.name)
  // 큰 파일은 서버 해석에 시간이 걸린다 — 공용 10초 타임아웃 대신 넉넉히 준다.
  const res = await api.post<ApiResponse<ImportTransactionsResult>>(IMPORT_PATHS[kind], form, { timeout: 60000 })
  return unwrap(res)
}
