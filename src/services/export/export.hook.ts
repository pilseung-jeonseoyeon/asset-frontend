import { useMutation } from '@tanstack/react-query'
import { downloadExportFile } from './export.service'
import { saveFile } from '@/utils/saveFile'
import type { ExportFileParams, ExportKind } from './export.type'

interface DownloadExportFileVariables {
  kind: ExportKind
  params?: ExportFileParams
}

/** 파일 만들기 + 저장(브라우저 다운로드 / 데스크톱 저장 창)까지 한 훅으로 묶는다 — 화면은 mutate()와 isPending/error만 본다. */
export function useDownloadExportFile() {
  return useMutation({
    mutationFn: ({ kind, params }: DownloadExportFileVariables) => downloadExportFile(kind, params),
    onSuccess: (file) => saveFile(file),
  })
}
