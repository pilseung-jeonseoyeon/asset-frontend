// 증권사·거래소 API 키 연동(BYOK)의 화면 표기 규칙.
//
// 계좌 추가 모달의 연동 서브뷰(screens/Assets/modals/ConnectAccountView)와 설정의 연동 관리
// (screens/Settings/modals/ConnectionsSection)가 함께 쓰기 때문에 어느 한쪽 화면 폴더가 아니라
// 여기 둔다 — 문구가 두 벌로 갈리면 같은 연동이 화면마다 다른 이름으로 불린다.
//
// 설계: docs/superpowers/specs/2026-08-29-byok-connection-design.md

import type { ConnectionProvider, SyncResponse } from '@/services/connection'
import type { AssetClass } from '@/services/common.type'

/**
 * 기관별 발급 안내.
 *
 * label은 **아직 연동한 적 없는 기관**을 그려야 하는 자리(계좌 추가 배너, 기관 선택)에서만 쓰는
 * 폴백이다. 이미 연동한 기관은 서버가 주는 providerDescription을 우선한다 — 기관 표시명이 바뀌면
 * 프론트 배포 없이 따라가야 한다.
 *
 * keyLabel/secretLabel이 기관마다 다른 이유: 각 기관 발급 화면에 실제로 적힌 용어를 그대로 써야
 * 사용자가 어느 값을 복사해 붙일지 헷갈리지 않는다.
 */
export interface ProviderMeta {
  label: string
  assetClass: AssetClass
  keyLabel: string
  secretLabel: string
  /** 발급 경로 안내 — 기관 사이트에서 무엇을 눌러야 하는지. 한 줄 요약이고, 자세한 절차는 가이드 페이지. */
  guide: string
  /**
   * 백엔드가 이 기관의 동기화를 구현했는지. false면 등록은 되지만 동기화가 400
   * CONNECTION_PROVIDER_NOT_SUPPORTED로 떨어진다 — 그래서 화면에서 아예 고를 수 없게 막는다.
   * 키를 다 발급받고 입력까지 마친 뒤에 실패를 알게 되면 헛수고가 너무 크다.
   */
  supported: boolean
}

export const PROVIDER_META: Record<ConnectionProvider, ProviderMeta> = {
  UPBIT: {
    label: '업비트',
    assetClass: 'CRYPTO',
    keyLabel: 'Access key',
    secretLabel: 'Secret key',
    guide: 'PC 웹 업비트 → 마이페이지 → Open API 관리에서 발급받으세요. 권한은 자산조회·주문조회만 체크합니다.',
    supported: true,
  },
  TOSS_INVEST: {
    label: '토스증권',
    assetClass: 'STOCK',
    keyLabel: 'client_id',
    secretLabel: 'client_secret',
    guide: 'PC 웹 토스증권 → 설정 → Open API에서 바로 발급됩니다.',
    supported: true,
  },
  KB_SECURITIES: {
    label: 'KB증권',
    assetClass: 'STOCK',
    keyLabel: 'appKey',
    secretLabel: 'appSecret',
    guide: 'KB증권 홈페이지 → 고객서비스 → Open API에서 신청합니다.',
    // 백엔드가 체결 조회를 아직 구현하지 못했다(공개 문서에 응답 필드 정의가 없음).
    supported: false,
  },
  KIWOOM: {
    label: '키움증권',
    assetClass: 'STOCK',
    keyLabel: 'appkey',
    secretLabel: 'secretkey',
    guide: 'openapi.kiwoom.com에서 KIWOOM REST API를 실전용으로 신청하세요.',
    supported: true,
  },
}

const PROVIDER_ORDER: ConnectionProvider[] = ['UPBIT', 'TOSS_INVEST', 'KB_SECURITIES', 'KIWOOM']

/** 앱 키·시크릿의 서버 최대 길이(CreateConnectionReq maxLength). */
export const CONNECTION_KEY_MAX_LENGTH = 255

/**
 * 기관별 키 발급 절차를 담은 가이드 페이지(`public/guide/connections.html`). 허용 IP·권한 범위·
 * 시크릿 1회 노출처럼 화면 안에 다 적으면 폼이 안 보일 만큼 긴 내용을 여기로 뺐다.
 *
 * SPA 라우트가 아니라 우리 도메인의 정적 HTML이다 — CLAUDE.md가 라우팅 범위를 5개 메뉴 화면으로
 * 못박고 있고, 새 창으로 여는 문서에 앱 번들을 다시 받게 할 이유가 없다. vercel.json의 rewrite
 * 예외 목록에 `guide/`가 들어 있어야 이 주소로 앱 화면이 뜨지 않는다.
 *
 * 새 창(target="_blank")으로 여는 이유: 같은 창에서 이동하면 입력하던 키가 날아간다
 * (키는 컴포넌트 로컬 state에만 있다).
 */
export const CONNECTION_GUIDE_URL = '/guide/connections.html'

/**
 * 연동 실패 문구. 서버 message도 사용자에게 보여줄 수 있는 한국어지만, 원인별로 "그래서 뭘 해야
 * 하는지"가 빠져 있다 — 특히 키가 틀린 것과 허용 IP를 등록하지 않은 것이 같은 코드로 오기 때문에
 * 두 가능성을 함께 짚어줘야 사용자가 헤매지 않는다.
 */
export function describeConnectionError(code: string, fallbackMessage: string): string {
  switch (code) {
    case 'CONNECTION_DUPLICATE':
      return '이미 같은 키로 등록된 연동이 있어요. 설정 → 데이터 관리 및 백업에서 확인해주세요.'
    case 'CONNECTION_INVALID_CREDENTIALS':
      return '키가 맞지 않거나 만료됐어요. 두 값을 다시 확인하고, 기관 사이트의 허용 IP 목록에 모닛 서버 IP가 등록돼 있는지도 확인해주세요.'
    case 'CONNECTION_PROVIDER_NOT_SUPPORTED':
      return '아직 모닛이 이 기관의 내역 가져오기를 지원하지 않아요. 준비되면 열립니다.'
    case 'CONNECTION_SYNC_FAILED':
      return '기관 쪽 응답에 문제가 있어 가져오지 못했어요. 잠시 뒤 다시 시도해주세요.'
    case 'CONNECTION_NOT_FOUND':
      return '연동을 찾을 수 없어요. 이미 해제됐을 수 있어요.'
    default:
      return fallbackMessage
  }
}

export function isConnectionProvider(value: string | null): value is ConnectionProvider {
  return value !== null && value in PROVIDER_META
}

/** 이 자산 유형에서 연동할 수 있는 기관. 자산군과 기관이 1:1로 갈린다(주식 3곳, 가상자산 1곳). */
export function providersFor(assetClass: AssetClass): ConnectionProvider[] {
  return PROVIDER_ORDER.filter((p) => PROVIDER_META[p].assetClass === assetClass)
}

/**
 * 연동 배너에 쓰는 기관명 나열(예: '토스증권·KB증권·키움증권'). 지원 기관이 늘거나 줄어도 배너
 * 문구를 따로 고치지 않도록 목록에서 만든다.
 */
export function providerLabelsFor(assetClass: AssetClass): string {
  return providersFor(assetClass)
    .map((p) => PROVIDER_META[p].label)
    .join('·')
}

export interface SyncSummary {
  headline: string
  detail: string | null
}

/** 체결을 부르는 말. 주식은 '매매', 코인은 '거래'가 자연스럽다. */
export function tradeNounFor(provider: ConnectionProvider): string {
  return PROVIDER_META[provider].assetClass === 'CRYPTO' ? '거래' : '매매'
}

/**
 * 동기화 결과를 사람이 읽는 문장으로.
 *
 * 서버가 주는 네 숫자를 그대로 나열하지 않고 실제로 일어난 일만 남긴다 — 0건짜리 항목까지 다 적으면
 * 성공 화면이 오히려 실패처럼 읽힌다. 다만 거부된 건수(rejected)는 0이 아닌 이상 반드시 드러낸다.
 * 숨기면 사용자가 나중에 "내역이 왜 비지?" 하고 헤매게 된다.
 *
 * noun은 tradeNounFor로 얻는다 — 진입 배너에서 "거래 내역"이라 부른 것을 결과 화면에서 "매매"로
 * 바꿔 부르면 같은 것을 두 이름으로 말하게 된다.
 */
export function describeSync(result: SyncResponse, noun = '매매'): SyncSummary {
  const nothing = result.imported === 0 && result.skipped === 0
  const headline = result.accountCreated
    ? nothing
      ? '계좌를 만들었어요.'
      : `계좌를 만들고 ${noun} ${result.imported.toLocaleString('ko-KR')}건을 가져왔어요.`
    : nothing
      ? `가져올 새 ${noun} 내역이 없었어요.`
      : `${noun} ${result.imported.toLocaleString('ko-KR')}건을 가져왔어요.`

  const notes: string[] = []
  // 첫 동기화는 계좌를 만들고 기준 시각만 잡는다 — 서버가 일부러 체결을 안 가져온다(설계 문서 §2).
  // 이 설명이 없으면 "0건"이 실패로 읽혀서 사용자가 키를 다시 발급받는 헛수고를 한다.
  if (result.accountCreated) {
    notes.push(`지금까지의 ${noun} 내역은 가져오지 않아요. 앞으로 새로 생기는 것부터 쌓입니다.`)
  }
  if (result.skipped > 0) notes.push(`이미 등록돼 있던 ${result.skipped.toLocaleString('ko-KR')}건은 건너뛰었어요.`)
  if (result.rejected > 0) notes.push(`검증에 걸려 등록하지 못한 ${result.rejected.toLocaleString('ko-KR')}건이 있어요.`)
  return { headline, detail: notes.length > 0 ? notes.join(' ') : null }
}
