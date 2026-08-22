import { useMutation, useQueryClient } from '@tanstack/react-query'
import { downloadImportTemplate, uploadImportFile } from './import.service'
import { qk } from '../queryKeys'
import { triggerBrowserDownload } from '@/utils/download'
import type { ImportKind } from './import.type'

/** 양식 요청 + 브라우저 다운로드 트리거까지 한 훅으로 — 화면은 mutate()와 isPending/error만 본다. */
export function useDownloadImportTemplate() {
  return useMutation({
    mutationFn: (kind: ImportKind) => downloadImportTemplate(kind),
    onSuccess: triggerBrowserDownload,
  })
}

/**
 * 파일을 올려 거래를 일괄 등록한다. 성공하면(일부 행만 실패했어도 200) 거래 1건 등록과 같은 범위를
 * 무효화한다 — 서버가 잔액·자산 분포·목표·대시보드를 원장에서 다시 계산하기 때문이다
 * (transaction.hook.ts의 useInvalidateTransaction과 같은 목록. 도메인 폴더끼리 import하지 않는 규칙
 * 때문에 여기 한 번 더 적는다 — 그쪽 목록이 바뀌면 여기도 같이 맞춘다).
 */
export function useUploadImportFile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ kind, file }: { kind: ImportKind; file: File }) => uploadImportFile(kind, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.transaction.all() })
      void queryClient.invalidateQueries({ queryKey: qk.account.all() })
      void queryClient.invalidateQueries({ queryKey: qk.asset.all() })
      void queryClient.invalidateQueries({ queryKey: qk.dashboard.all() })
      void queryClient.invalidateQueries({ queryKey: qk.goal.all() })
    },
  })
}
