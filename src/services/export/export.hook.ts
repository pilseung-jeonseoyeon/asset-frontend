import { useMutation } from '@tanstack/react-query'
import { downloadExportFile } from './export.service'
import type { ExportFileParams, ExportFileResult, ExportKind } from './export.type'

interface DownloadExportFileVariables {
  kind: ExportKind
  params?: ExportFileParams
}

function triggerBrowserDownload({ blob, filename }: ExportFileResult) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  // click()이 트리거하는 다운로드는 비동기라, 같은 틱에서 바로 revoke하면 Safari/Firefox 일부
  // 버전에서 다운로드 시작 전에 URL이 무효화돼 조용히 실패한다 — 한 틱 미뤄서 해제한다.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** 요청 + 브라우저 다운로드 트리거까지 한 훅으로 묶는다 — 화면은 mutate()와 isPending/error만 본다. */
export function useDownloadExportFile() {
  return useMutation({
    mutationFn: ({ kind, params }: DownloadExportFileVariables) => downloadExportFile(kind, params),
    onSuccess: triggerBrowserDownload,
  })
}
