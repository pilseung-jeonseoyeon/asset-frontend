// 월간 리포트 스토리 카드를 PNG로 굽고, 저장하거나 공유한다.
//
// 규격은 ds_rules §11-1의 스토리 1080×1920 하나만 쓴다(피드 1080×1350은 카드 비율이 달라 별도 레이아웃이
// 필요하므로 만들지 않았다). 화면의 카드는 항상 9:16이라(ReportOverlay 카드 스타일 참고) 캔버스
// 크기만 지정하면 비율 왜곡 없이 확대된다 — 모바일에서 카드가 작게 보여도 결과물 해상도는 같다.
//
// html-to-image는 DOM을 SVG(foreignObject)로 감싸 캔버스에 그린다. 화면에 보이는 그대로(현재 테마·금액
// 숨김 상태)가 찍히고, 웹폰트는 같은 출처(src/styles/fonts.css)라 그대로 포함된다. 라이브러리는 이
// 화면에서만 쓰므로 초기 청크에 넣지 않고 누를 때 불러온다.

import { triggerBrowserDownload } from './download'

export const REPORT_EXPORT_WIDTH = 1080
export const REPORT_EXPORT_HEIGHT = 1920

/** 이 속성이 붙은 요소(달 이동·저장·공유 버튼 등)는 이미지에서 뺀다. */
export const REPORT_EXPORT_EXCLUDE_ATTR = 'data-report-export-exclude'

function normalizeRange(range: string): string {
  return (range || 'U+0-10FFFF').toLowerCase().replace(/\s+/g, '')
}

function normalizeFamily(family: string): string {
  return family.replace(/["']/g, '').trim()
}

async function toDataUrl(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`font fetch failed: ${res.status}`)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(blob)
  })
}

/**
 * 이미지에 넣을 @font-face CSS. html-to-image 기본 동작은 문서의 @font-face 93개(Pretendard 조각 92
 * + Material Symbols, 3.9MB)를 전부 base64로 박아 넣는데, 그 크기의 SVG를 그리느라 브라우저가 수십 초
 * 멈춘다(2026-09-06 확인). 대신 **브라우저가 이미 내려받은 조각**(document.fonts에서 status=loaded —
 * unicode-range 덕에 화면에 쓰인 글자가 든 조각만 로드된다)만 골라 같은 형식으로 만든다. 보통 몇 개,
 * 수백 KB다. 실패하면 null을 돌려주고 호출부가 폰트 없이(시스템 글꼴) 굽는다.
 */
async function buildLoadedFontEmbedCss(node: HTMLElement): Promise<string | null> {
  try {
    // 아이콘(.ms)이 한 개도 없는 장이면 Material Symbols(370KB)는 넣을 이유가 없다 — 굽는 시간을 줄인다.
    const needsIconFont = node.querySelector('.ms') !== null
    const loaded = new Set<string>()
    document.fonts.forEach((f) => {
      if (f.status === 'loaded') loaded.add(`${normalizeFamily(f.family)}|${normalizeRange(f.unicodeRange)}`)
    })
    const rules: CSSFontFaceRule[] = []
    for (const sheet of Array.from(document.styleSheets)) {
      let list: CSSRuleList
      try {
        list = sheet.cssRules
      } catch {
        continue // 다른 출처 스타일시트는 읽을 수 없다 — 이 앱의 폰트는 전부 같은 출처라 상관없다.
      }
      for (const rule of Array.from(list)) if (rule instanceof CSSFontFaceRule) rules.push(rule)
    }
    const parts: string[] = []
    const unmatched = new Set(loaded)
    for (const rule of rules) {
      const family = normalizeFamily(rule.style.getPropertyValue('font-family'))
      const range = normalizeRange(rule.style.getPropertyValue('unicode-range'))
      const key = `${family}|${range}`
      if (!loaded.has(key)) continue
      unmatched.delete(key)
      if (!needsIconFont && family.startsWith('Material Symbols')) continue
      const src = rule.style.getPropertyValue('src')
      const match = /url\((['"]?)([^'")]+)\1\)/.exec(src)
      if (!match) return null
      const dataUrl = await toDataUrl(match[2])
      parts.push(`@font-face{${rule.style.cssText.replace(match[0], `url(${dataUrl})`)}}`)
    }
    // 로드된 폰트 중 @font-face 규칙과 짝을 못 지은 게 하나라도 있으면(unicode-range 표기가 브라우저마다
    // 미묘하게 다를 수 있다) 일부 글자만 시스템 글꼴로 바뀐 이미지를 조용히 만들지 말고 전체 폴백으로.
    if (unmatched.size > 0) return null
    return parts.join('\n')
  } catch {
    return null
  }
}

export async function renderReportSlidePng(node: HTMLElement): Promise<Blob> {
  const { toBlob } = await import('html-to-image')
  const fontEmbedCSS = await buildLoadedFontEmbedCss(node)
  const blob = await toBlob(node, {
    canvasWidth: REPORT_EXPORT_WIDTH,
    canvasHeight: REPORT_EXPORT_HEIGHT,
    pixelRatio: 1,
    // 카드 배경(--surface)은 노드 자체에 있지만, 모서리 밖 투명 영역이 남지 않도록 같은 색을 깐다.
    backgroundColor: getComputedStyle(node).backgroundColor,
    filter: (el) => !(el instanceof HTMLElement && el.hasAttribute(REPORT_EXPORT_EXCLUDE_ATTR)),
    ...(fontEmbedCSS === null ? { skipFonts: true } : { fontEmbedCSS }),
  })
  if (!blob) throw new Error('이미지를 만들지 못했어요. 잠시 후 다시 시도해 주세요.')
  return blob
}

export function reportImageFilename(year: number, month: number): string {
  return `monit-report-${year}-${String(month).padStart(2, '0')}.png`
}

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled'

/**
 * OS 공유 창(Web Share API)으로 이미지를 넘긴다. 파일 공유를 지원하지 않는 브라우저(데스크톱 Firefox 등)면
 * 대신 다운로드로 떨어뜨리고 'downloaded'를 돌려준다 — 호출부가 "공유 창을 열 수 없어 저장했다"고
 * 알릴 수 있게. 사용자가 공유 창을 닫으면(AbortError) 'cancelled'.
 */
export async function shareReportImage(blob: Blob, filename: string, title: string): Promise<ShareOutcome> {
  const file = new File([blob], filename, { type: 'image/png' })
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean }
  const canShareFiles = typeof nav.share === 'function' && typeof nav.canShare === 'function' && nav.canShare({ files: [file] })
  if (!canShareFiles) {
    triggerBrowserDownload({ blob, filename })
    return 'downloaded'
  }
  try {
    await nav.share({ files: [file], title })
    return 'shared'
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
    throw error
  }
}
