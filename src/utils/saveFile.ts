/**
 * 앱이 만든 파일(Blob)을 사용자 기기에 저장한다. 엑셀 내보내기·가져오기 양식·월간 리포트 이미지가 같이 쓴다.
 *
 * 플랫폼 분기(스펙 6장 — 네 곳 중 하나)는 **이 한 곳**에만 둔다. 호출부는 플랫폼을 모른다.
 * - 브라우저: <a download> 로 다운로드 폴더에 떨어뜨린다.
 * - 데스크톱 앱(Electron): 메인 프로세스가 저장 창을 띄워 위치·이름을 고르게 하고 그 경로에 쓴다(electron/main.ts).
 *   취소하면 조용히 끝난다.
 */
import { desktopApi } from './platform'

export interface SaveFilePayload {
  blob: Blob
  filename: string
}

export async function saveFile({ blob, filename }: SaveFilePayload): Promise<void> {
  const desktop = desktopApi()
  if (desktop) {
    await desktop.saveFile(filename, new Uint8Array(await blob.arrayBuffer()))
    return
  }
  triggerBrowserDownload(blob, filename)
}

/**
 * click()이 트리거하는 다운로드는 비동기라, 같은 틱에서 바로 revoke하면 Safari/Firefox 일부 버전에서
 * 다운로드 시작 전에 URL이 무효화돼 조용히 실패한다 — 한 틱 미뤄서 해제한다.
 */
function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
