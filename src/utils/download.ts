/**
 * 받아 둔 Blob을 브라우저 다운로드로 흘려보낸다. 내보내기(export)와 가져오기 양식(import) 훅이 같이 쓴다.
 *
 * click()이 트리거하는 다운로드는 비동기라, 같은 틱에서 바로 revoke하면 Safari/Firefox 일부 버전에서
 * 다운로드 시작 전에 URL이 무효화돼 조용히 실패한다 — 한 틱 미뤄서 해제한다.
 */
export function triggerBrowserDownload({ blob, filename }: { blob: Blob; filename: string }) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
