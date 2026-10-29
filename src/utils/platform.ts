// 지금 데스크톱 앱(Electron) 안에서 돌고 있는가. 프리로드가 window.monit 을 노출했는지로 안다(electron/preload.ts).
// 분기가 필요한 곳은 네 군데뿐이다(스펙 6장) — 파일 저장(saveFile) · 안 읽은 수 배지(desktopNotification) ·
// 외부 링크(externalLink) · 월간 리포트 공유(저장으로 대체). 그 밖의 화면 코드는 플랫폼을 몰라야 한다. 브라우저에서는 항상 false.
export function isDesktopApp(): boolean {
  return typeof window !== 'undefined' && typeof window.monit !== 'undefined'
}

/** 데스크톱 API. 브라우저에서 부르면 undefined — 호출부가 isDesktopApp() 으로 먼저 가른다. */
export function desktopApi(): MonitDesktopApi | undefined {
  return typeof window !== 'undefined' ? window.monit : undefined
}
