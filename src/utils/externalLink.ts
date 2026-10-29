// 외부 링크(연동 가이드 등)를 여는 방법의 플랫폼 분기(스펙 6장 — 네 곳 중 하나).
// 브라우저: 평범한 새 탭. 데스크톱 앱(Electron): 앱 창 안에서 새 창을 열지 않고 기본 브라우저로 넘긴다(메인 프로세스가
// https 만 허용). 상대 경로(/guide/…)는 데스크톱에선 공개 사이트 주소에 붙인다 — 가이드 HTML 은 public/ 에 있어 그 도메인에서
// 서빙된다.
import type { MouseEvent } from 'react'
import { desktopApi, isDesktopApp } from './platform'

/** 데스크톱 앱이 상대 경로 링크를 열 때 붙이는 공개 사이트 주소(index.html 의 og:url 과 같다). */
export const PUBLIC_SITE_ORIGIN = 'https://monit.io.kr'

/** 절대 URL 로. http(s) 가 아니면(javascript: 등) 거부한다. */
export function toExternalUrl(url: string): string {
  const absolute = new URL(url, isDesktopApp() ? PUBLIC_SITE_ORIGIN : window.location.origin)
  if (absolute.protocol !== 'https:' && absolute.protocol !== 'http:') throw new Error(`열 수 없는 링크: ${url}`)
  return absolute.toString()
}

export async function openExternal(url: string): Promise<void> {
  const target = toExternalUrl(url)
  const desktop = desktopApi()
  if (desktop) {
    await desktop.openExternal(target)
    return
  }
  window.open(target, '_blank', 'noopener,noreferrer')
}

/**
 * `<a {...externalLinkProps(url)}>` 로 쓴다. 브라우저에서는 그대로 새 탭 링크(href·target·rel)라 우클릭·가운데 클릭도 되고,
 * 데스크톱에서만 클릭을 가로채 기본 브라우저로 보낸다.
 */
export function externalLinkProps(url: string) {
  return {
    href: url,
    target: '_blank' as const,
    rel: 'noopener noreferrer',
    onClick: (event: MouseEvent<HTMLAnchorElement>) => {
      if (!isDesktopApp()) return
      event.preventDefault()
      void openExternal(url).catch(() => {})
    },
  }
}
