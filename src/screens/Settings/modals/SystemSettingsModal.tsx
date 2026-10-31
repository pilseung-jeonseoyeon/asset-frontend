// 설정 → 시스템 관리 창. z-index 80, 너비 540px, maxHeight 86vh(넘치면 창 안에서 스크롤).
// 옛 '일반 및 디스플레이'(GeneralModal)와 '자산 · 가계부 맞춤 설정'(CustomModal)을 하나로 합쳤다(2026-10-31 사용자 결정 —
// 시안 docs/plan/view/설정 메뉴 나누기 시안.html의 D안). 처음엔 창 위쪽 탭으로 나눴다가 "탭이 불편하다"는 사용자 의견으로
// 같은 날 **한 페이지 목록**으로 바꿨다 — 묶음 제목 아래에 줄을 이어서 나열하고, 탭은 되살리지 않는다.
//   화면   DisplaySection        테마 · 대시보드 레이아웃
//   알림   DdayNotifyRow + NotificationSettingsSection   D-Day 알림 · 화면 안 팝업 · 맥/PC 알림 · 내용 보이기
//   자산   AssetSection          자산 목표 · 기준 통화
//   가계부 LedgerSection         월 시작일 · 카테고리 설정
// 이 기기에만 저장되는 줄에는 '이 기기에만'을 붙이고(systemStyles.ts), 그 뜻은 창 맨 아래에 한 번 적는다.
// 저장은 줄마다 바로 된다(저장 버튼 없음). mutation은 각 묶음 컴포넌트 안에 있어 창을 닫으면 지난 실패 메시지가 함께 사라진다.
// 서버 설정 조회 상태(로딩·실패)는 줄마다 반복하지 않고 맨 위에 한 번만 보여준다.

import type { CSSProperties } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal, ModalHeader } from '../../../components/primitives/Modal/Modal'
import { useAppState } from '../../../state/AppStateContext'
import { useCloseModal } from '../../../state/selectors/modal'
import { useGetUserSettings } from '@/services/user'
import { NotificationSettingsSection } from './NotificationSettingsSection'
import { AssetSection } from './system/AssetSection'
import { DdayNotifyRow } from './system/DdayNotifyRow'
import { DisplaySection } from './system/DisplaySection'
import { LedgerSection } from './system/LedgerSection'
import { FIRST_SECTION_TITLE_STYLE, SECTION_ICON_STYLE, SECTION_TITLE_STYLE } from './system/systemStyles'

function SectionTitle({ icon, first = false, children }: { icon: string; first?: boolean; children: string }) {
  return (
    <h3 style={first ? FIRST_SECTION_TITLE_STYLE : SECTION_TITLE_STYLE}>
      <span style={SECTION_ICON_STYLE}>
        <Icon name={icon} size={17} ariaHidden />
      </span>
      {children}
    </h3>
  )
}

const STATUS_STYLE: CSSProperties = { fontSize: 11.5, padding: '0 0 12px' }
// LoginForm.tsx의 "비밀번호를 잊으셨나요?" 링크와 같은 텍스트 버튼 규격(배경 없음, --accent, 12px/700).
const RETRY_BTN_STYLE: CSSProperties = {
  border: 'none', background: 'transparent', padding: 0, fontSize: 12, fontWeight: 700,
  color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit', marginLeft: 8,
}

export function SystemSettingsModal() {
  const { state, setState } = useAppState()
  const closeModal = useCloseModal()
  const isOpen = state.openModal === 'system'
  const { isPending, error, refetch } = useGetUserSettings({ enabled: isOpen })

  if (!isOpen) return null

  return (
    <Modal onClose={closeModal} zIndex={80} width={540} panelStyle={{ maxHeight: '86vh', overflow: 'auto' }}>
      <ModalHeader icon="settings" title="시스템 관리" onClose={closeModal} />
      {/* 열린 드롭다운(월 시작일 목록) 바깥을 누르면 닫는 막 */}
      {!!state.openDropdown && (
        <div onClick={() => setState({ openDropdown: null })} style={{ position: 'absolute', inset: 0, zIndex: 94 }} />
      )}
      {isPending && <div aria-busy style={{ ...STATUS_STYLE, color: 'var(--text-weak)' }}>불러오는 중…</div>}
      {error && (
        <div style={{ ...STATUS_STYLE, color: 'var(--down)', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
          설정을 불러오지 못했어요: {error.message}
          <button type="button" onClick={() => void refetch()} style={RETRY_BTN_STYLE}>다시 시도</button>
        </div>
      )}

      <section aria-label="화면">
        <SectionTitle icon="monitor" first>화면</SectionTitle>
        <DisplaySection />
      </section>
      <section aria-label="알림">
        <SectionTitle icon="notifications">알림</SectionTitle>
        <DdayNotifyRow />
        <NotificationSettingsSection />
      </section>
      <section aria-label="자산">
        <SectionTitle icon="payments">자산</SectionTitle>
        <AssetSection />
      </section>
      <section aria-label="가계부">
        <SectionTitle icon="menu_book">가계부</SectionTitle>
        <LedgerSection />
      </section>

      <div style={{ fontSize: 11.5, color: 'var(--text-weak)', paddingTop: 14, borderTop: '0.5px solid var(--track)', display: 'flex', gap: 5, alignItems: 'center', lineHeight: 1.5 }}>
        <Icon name="devices" size={15} ariaHidden />
        ‘이 기기에만’ 설정은 다른 컴퓨터·폰에서 따로 정해요
      </div>
    </Modal>
  )
}
