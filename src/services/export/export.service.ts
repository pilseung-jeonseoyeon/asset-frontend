import { downloadBlobFile, todayStamp } from '../apiBlob'
import type { ExportFileParams, ExportFileResult, ExportKind } from './export.type'

const EXPORT_PATHS: Record<ExportKind, string> = {
  transactions: '/export/excel/transactions',
  trades: '/export/excel/trades',
}

// Content-Disposition이 없을 때(현재 백엔드가 그럴 확률이 높다 — B-3-5) 쓰는 폴백 파일명의 한글 라벨.
const EXPORT_KIND_LABEL: Record<ExportKind, string> = {
  transactions: '거래내역',
  trades: '매매내역',
}

/**
 * 엑셀 파일을 내려받는다. 성공하면 { blob, filename }을 돌려준다 — 실제 다운로드 트리거는 훅에서 한다.
 * blob 전용 인스턴스·401 재시도·에러 메시지 복원은 src/services/apiBlob.ts가 담당한다(원래 이 파일에
 * 있던 것을 가져오기 도메인과 공유하려고 끌어올렸다).
 */
export function downloadExportFile(kind: ExportKind, params?: ExportFileParams): Promise<ExportFileResult> {
  return downloadBlobFile(EXPORT_PATHS[kind], {
    params,
    fallbackFilename: `monit-${EXPORT_KIND_LABEL[kind]}-${todayStamp()}.xlsx`,
    errorCode: 'EXPORT_FAILED',
    fallbackErrorMessage: '파일을 내려받지 못했어요.',
  })
}
