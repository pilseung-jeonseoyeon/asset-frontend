import { useMutation } from '@tanstack/react-query'
import { downloadExportFile } from './export.service'
import { triggerBrowserDownload } from '@/utils/download'
import type { ExportFileParams, ExportKind } from './export.type'

interface DownloadExportFileVariables {
  kind: ExportKind
  params?: ExportFileParams
}

/** 요청 + 브라우저 다운로드 트리거까지 한 훅으로 묶는다 — 화면은 mutate()와 isPending/error만 본다. */
export function useDownloadExportFile() {
  return useMutation({
    mutationFn: ({ kind, params }: DownloadExportFileVariables) => downloadExportFile(kind, params),
    onSuccess: triggerBrowserDownload,
  })
}
