// Source: secret/ds_rules_v2_5.md L566-745 (§12-3, 125-institution master table) — transcribed verbatim.
// bg/fg CSS values are declared as --bank-{tokenKey}-bg/-fg in src/styles/bank-tokens.css (source of the
// literal values there is dc.html L33-166/184-317, which matches this table's 라이트/다크 columns 1:1).

import type { BankArchetype } from './bank-archetypes'

export type BankCategory =
  | 'bank' // 은행 · 상호금융
  | 'securities' // 증권
  | 'card' // 카드
  | 'lifeInsurance' // 생명보험
  | 'fireInsurance' // 손해보험
  | 'savingsBank' // 저축은행
  | 'crypto' // 가상자산 거래소
  | 'fintech' // 핀테크 · 페이
  | 'pension' // 연금 · 공공기금

export interface BankInstitution {
  name: string
  tokenKey: string
  category: BankCategory
  archetype: BankArchetype
}

// ds_rules_v2_5.md §1-7 "yellow exception": KB family (#FFB600) and Kakao family (#FFE300) base colors
// fail 3:1 light-mode contrast at stroke-width 1.8 → raised to 2.0 for these token keys only.
export const BANK_YELLOW_STROKE_EXCEPTIONS = new Set<string>([
  'kb', 'kbsec', 'kbcard', 'kblife', 'kbins', 'kbsb',
  'kakaobank', 'kakaopaysec', 'kakaopay',
])

export const BANK_INSTITUTIONS: BankInstitution[] = [
  // 은행 · 상호금융 (23)
  { name: 'KB국민은행', tokenKey: 'kb', category: 'bank', archetype: 'star4' },
  { name: '신한은행', tokenKey: 'shinhan', category: 'bank', archetype: 'swoosh' },
  { name: '하나은행', tokenKey: 'hana', category: 'bank', archetype: 'ring2' },
  { name: '우리은행', tokenKey: 'woori', category: 'bank', archetype: 'circledot' },
  { name: 'NH농협은행', tokenKey: 'nh', category: 'bank', archetype: 'chevron2' },
  { name: 'IBK기업은행', tokenKey: 'ibk', category: 'bank', archetype: 'arrowbox' },
  { name: 'SC제일은행', tokenKey: 'sc', category: 'bank', archetype: 'arcpair' },
  { name: '한국씨티은행', tokenKey: 'citi', category: 'bank', archetype: 'arcband' },
  { name: 'Sh수협은행', tokenKey: 'suhyup', category: 'bank', archetype: 'wave' },
  { name: 'KDB산업은행', tokenKey: 'kdb', category: 'bank', archetype: 'pillar' },
  { name: '케이뱅크', tokenKey: 'kbank', category: 'bank', archetype: 'letterk' },
  { name: '카카오뱅크', tokenKey: 'kakaobank', category: 'bank', archetype: 'roundsq' },
  { name: '토스뱅크', tokenKey: 'tossbank', category: 'bank', archetype: 'tbar' },
  { name: 'iM뱅크', tokenKey: 'imbank', category: 'bank', archetype: 'circledot' },
  { name: '부산은행', tokenKey: 'busan', category: 'bank', archetype: 'wave' },
  { name: '경남은행', tokenKey: 'kyongnam', category: 'bank', archetype: 'wave' },
  { name: '광주은행', tokenKey: 'gwangju', category: 'bank', archetype: 'wave' },
  { name: '전북은행', tokenKey: 'jeonbuk', category: 'bank', archetype: 'wave' },
  { name: '제주은행', tokenKey: 'jeju', category: 'bank', archetype: 'wave' },
  { name: '우체국예금', tokenKey: 'post', category: 'bank', archetype: 'envelope' },
  { name: '새마을금고', tokenKey: 'mg', category: 'bank', archetype: 'pillar' },
  { name: '신협', tokenKey: 'shinhyup', category: 'bank', archetype: 'ring2' },
  { name: '산림조합', tokenKey: 'forest', category: 'bank', archetype: 'leaf' },

  // 증권 (29)
  { name: '미래에셋증권', tokenKey: 'mirae', category: 'securities', archetype: 'triangleup' },
  { name: '한국투자증권', tokenKey: 'koreainv', category: 'securities', archetype: 'arrowrise' },
  { name: 'NH투자증권', tokenKey: 'nhinv', category: 'securities', archetype: 'chevron2' },
  { name: '삼성증권', tokenKey: 'samsungsec', category: 'securities', archetype: 'ellipse' },
  { name: 'KB증권', tokenKey: 'kbsec', category: 'securities', archetype: 'star4' },
  { name: '신한투자증권', tokenKey: 'shinhansec', category: 'securities', archetype: 'swoosh' },
  { name: '키움증권', tokenKey: 'kiwoom', category: 'securities', archetype: 'arrowrise' },
  { name: '하나증권', tokenKey: 'hanasec', category: 'securities', archetype: 'ring2' },
  { name: '메리츠증권', tokenKey: 'meritz', category: 'securities', archetype: 'arcband' },
  { name: '대신증권', tokenKey: 'daishin', category: 'securities', archetype: 'arrowrise' },
  { name: '유안타증권', tokenKey: 'yuanta', category: 'securities', archetype: 'arrowrise' },
  { name: '교보증권', tokenKey: 'kyobosec', category: 'securities', archetype: 'arrowrise' },
  { name: 'iM증권', tokenKey: 'imsec', category: 'securities', archetype: 'circledot' },
  { name: '현대차증권', tokenKey: 'hyundaisec', category: 'securities', archetype: 'arrowrise' },
  { name: 'IBK투자증권', tokenKey: 'ibksec', category: 'securities', archetype: 'arrowbox' },
  { name: '신영증권', tokenKey: 'shinyoung', category: 'securities', archetype: 'arrowrise' },
  { name: 'SK증권', tokenKey: 'sksec', category: 'securities', archetype: 'arcpair' },
  { name: '다올투자증권', tokenKey: 'daol', category: 'securities', archetype: 'arrowrise' },
  { name: '한화투자증권', tokenKey: 'hanwhasec', category: 'securities', archetype: 'tri3' },
  { name: 'DB금융투자', tokenKey: 'dbsec', category: 'securities', archetype: 'arrowrise' },
  { name: '유진투자증권', tokenKey: 'eugene', category: 'securities', archetype: 'arrowrise' },
  { name: 'BNK투자증권', tokenKey: 'bnk', category: 'securities', archetype: 'arrowrise' },
  { name: '상상인증권', tokenKey: 'sangsangin', category: 'securities', archetype: 'arrowrise' },
  { name: 'LS증권', tokenKey: 'lssec', category: 'securities', archetype: 'arrowrise' },
  { name: '토스증권', tokenKey: 'tosssec', category: 'securities', archetype: 'tbar' },
  { name: '카카오페이증권', tokenKey: 'kakaopaysec', category: 'securities', archetype: 'roundsq' },
  { name: '부국증권', tokenKey: 'bookook', category: 'securities', archetype: 'arrowrise' },
  { name: '한양증권', tokenKey: 'hanyang', category: 'securities', archetype: 'arrowrise' },
  { name: '흥국증권', tokenKey: 'heungkuksec', category: 'securities', archetype: 'arrowrise' },

  // 카드 (9)
  { name: '신한카드', tokenKey: 'shinhancard', category: 'card', archetype: 'card' },
  { name: '삼성카드', tokenKey: 'samsungcard', category: 'card', archetype: 'card' },
  { name: '현대카드', tokenKey: 'hyundaicard', category: 'card', archetype: 'card' },
  { name: 'KB국민카드', tokenKey: 'kbcard', category: 'card', archetype: 'card' },
  { name: '롯데카드', tokenKey: 'lottecard', category: 'card', archetype: 'card' },
  { name: '하나카드', tokenKey: 'hanacard', category: 'card', archetype: 'card' },
  { name: '우리카드', tokenKey: 'wooricard', category: 'card', archetype: 'card' },
  { name: 'BC카드', tokenKey: 'bccard', category: 'card', archetype: 'card' },
  { name: 'NH농협카드', tokenKey: 'nhcard', category: 'card', archetype: 'card' },

  // 생명보험 (20)
  { name: '삼성생명', tokenKey: 'samsunglife', category: 'lifeInsurance', archetype: 'shield' },
  { name: '한화생명', tokenKey: 'hanwhalife', category: 'lifeInsurance', archetype: 'tri3' },
  { name: '교보생명', tokenKey: 'kyobolife', category: 'lifeInsurance', archetype: 'shield' },
  { name: '신한라이프', tokenKey: 'shinhanlife', category: 'lifeInsurance', archetype: 'shield' },
  { name: 'NH농협생명', tokenKey: 'nhlife', category: 'lifeInsurance', archetype: 'shield' },
  { name: '미래에셋생명', tokenKey: 'miraelife', category: 'lifeInsurance', archetype: 'shield' },
  { name: '동양생명', tokenKey: 'tongyang', category: 'lifeInsurance', archetype: 'shield' },
  { name: 'KB라이프생명', tokenKey: 'kblife', category: 'lifeInsurance', archetype: 'shield' },
  { name: '흥국생명', tokenKey: 'heungkuklife', category: 'lifeInsurance', archetype: 'shield' },
  { name: 'DB생명', tokenKey: 'dblife', category: 'lifeInsurance', archetype: 'shield' },
  { name: 'ABL생명', tokenKey: 'abl', category: 'lifeInsurance', archetype: 'shield' },
  { name: '라이나생명', tokenKey: 'lina', category: 'lifeInsurance', archetype: 'shield' },
  { name: '메트라이프생명', tokenKey: 'metlife', category: 'lifeInsurance', archetype: 'shield' },
  { name: '푸본현대생명', tokenKey: 'fubon', category: 'lifeInsurance', archetype: 'shield' },
  { name: 'iM라이프', tokenKey: 'imlife', category: 'lifeInsurance', archetype: 'shield' },
  { name: 'KDB생명', tokenKey: 'kdblife', category: 'lifeInsurance', archetype: 'shield' },
  { name: '하나생명', tokenKey: 'hanalife', category: 'lifeInsurance', archetype: 'shield' },
  { name: '처브라이프', tokenKey: 'chubb', category: 'lifeInsurance', archetype: 'shield' },
  { name: 'IBK연금보험', tokenKey: 'ibkpension', category: 'lifeInsurance', archetype: 'shield' },
  { name: '교보라이프플래닛', tokenKey: 'lifeplanet', category: 'lifeInsurance', archetype: 'shield' },

  // 손해보험 (14)
  { name: '삼성화재', tokenKey: 'samsungfire', category: 'fireInsurance', archetype: 'umbrella' },
  { name: 'DB손해보험', tokenKey: 'dbins', category: 'fireInsurance', archetype: 'umbrella' },
  { name: '현대해상', tokenKey: 'hyundaimarine', category: 'fireInsurance', archetype: 'umbrella' },
  { name: 'KB손해보험', tokenKey: 'kbins', category: 'fireInsurance', archetype: 'umbrella' },
  { name: '메리츠화재', tokenKey: 'meritzfire', category: 'fireInsurance', archetype: 'umbrella' },
  { name: '한화손해보험', tokenKey: 'hanwhains', category: 'fireInsurance', archetype: 'umbrella' },
  { name: '롯데손해보험', tokenKey: 'lotteins', category: 'fireInsurance', archetype: 'umbrella' },
  { name: '흥국화재', tokenKey: 'heungkukfire', category: 'fireInsurance', archetype: 'umbrella' },
  { name: 'MG손해보험', tokenKey: 'mgins', category: 'fireInsurance', archetype: 'umbrella' },
  { name: 'NH농협손해보험', tokenKey: 'nhins', category: 'fireInsurance', archetype: 'umbrella' },
  { name: '하나손해보험', tokenKey: 'hanains', category: 'fireInsurance', archetype: 'umbrella' },
  { name: 'AXA손해보험', tokenKey: 'axa', category: 'fireInsurance', archetype: 'umbrella' },
  { name: '캐롯손해보험', tokenKey: 'carrot', category: 'fireInsurance', archetype: 'umbrella' },
  { name: '서울보증보험', tokenKey: 'sgi', category: 'fireInsurance', archetype: 'umbrella' },

  // 저축은행 (15)
  { name: 'SBI저축은행', tokenKey: 'sbi', category: 'savingsBank', archetype: 'pillar' },
  { name: 'OK저축은행', tokenKey: 'ok', category: 'savingsBank', archetype: 'pillar' },
  { name: '웰컴저축은행', tokenKey: 'welcome', category: 'savingsBank', archetype: 'pillar' },
  { name: '페퍼저축은행', tokenKey: 'pepper', category: 'savingsBank', archetype: 'pillar' },
  { name: '한국투자저축은행', tokenKey: 'koreainvsb', category: 'savingsBank', archetype: 'pillar' },
  { name: '애큐온저축은행', tokenKey: 'acuon', category: 'savingsBank', archetype: 'pillar' },
  { name: '다올저축은행', tokenKey: 'daolsb', category: 'savingsBank', archetype: 'pillar' },
  { name: 'JT친애저축은행', tokenKey: 'jt', category: 'savingsBank', archetype: 'pillar' },
  { name: '상상인저축은행', tokenKey: 'sangsanginsb', category: 'savingsBank', archetype: 'pillar' },
  { name: '모아저축은행', tokenKey: 'moa', category: 'savingsBank', archetype: 'pillar' },
  { name: '신한저축은행', tokenKey: 'shinhansb', category: 'savingsBank', archetype: 'pillar' },
  { name: 'KB저축은행', tokenKey: 'kbsb', category: 'savingsBank', archetype: 'pillar' },
  { name: '하나저축은행', tokenKey: 'hanasb', category: 'savingsBank', archetype: 'pillar' },
  { name: 'NH저축은행', tokenKey: 'nhsb', category: 'savingsBank', archetype: 'pillar' },
  { name: '우리금융저축은행', tokenKey: 'woorisb', category: 'savingsBank', archetype: 'pillar' },

  // 가상자산 거래소 (5)
  { name: '업비트', tokenKey: 'upbit', category: 'crypto', archetype: 'hexcoin' },
  { name: '빗썸', tokenKey: 'bithumb', category: 'crypto', archetype: 'hexcoin' },
  { name: '코인원', tokenKey: 'coinone', category: 'crypto', archetype: 'hexcoin' },
  { name: '코빗', tokenKey: 'korbit', category: 'crypto', archetype: 'hexcoin' },
  { name: '고팍스', tokenKey: 'gopax', category: 'crypto', archetype: 'hexcoin' },

  // 핀테크 · 페이 (5)
  { name: '토스', tokenKey: 'toss', category: 'fintech', archetype: 'tbar' },
  { name: '카카오페이', tokenKey: 'kakaopay', category: 'fintech', archetype: 'roundsq' },
  { name: '네이버페이', tokenKey: 'naverpay', category: 'fintech', archetype: 'nmark' },
  { name: '페이코', tokenKey: 'payco', category: 'fintech', archetype: 'arcpair' },
  { name: '뱅크샐러드', tokenKey: 'banksalad', category: 'fintech', archetype: 'leaf' },

  // 연금 · 공공기금 (5)
  { name: '국민연금공단', tokenKey: 'nps', category: 'pension', archetype: 'leaf' },
  { name: '공무원연금공단', tokenKey: 'gepco', category: 'pension', archetype: 'leaf' },
  { name: '사학연금공단', tokenKey: 'tp', category: 'pension', archetype: 'leaf' },
  { name: '군인연금', tokenKey: 'mps', category: 'pension', archetype: 'leaf' },
  { name: '주택도시기금(청약)', tokenKey: 'hug', category: 'pension', archetype: 'home' },
]

export function findBankInstitution(tokenKey: string): BankInstitution | undefined {
  return BANK_INSTITUTIONS.find((b) => b.tokenKey === tokenKey)
}
