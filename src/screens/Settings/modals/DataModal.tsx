// Source: secret/Asset Manager v14.dc.html L3251-3306 (modalData) — row markup/order transcribed
// verbatim. 4개 행 중 실제 API가 있는 건 "전체 내역 내보내기"(GET /export/excel/transactions,
// GET /export/excel/trades) 하나뿐이다 — 그 행만 눌러서 거래/매매 중 하나를 고르는 인라인 드롭다운을
// 붙였고(CustomModal.tsx의 월 시작일 드롭다운과 동일한 수동 구현 패턴), 나머지 3개(가져오기·백업/
// 복원·초기화)는 대응 API가 없어 GeneralModal.tsx의 "추후 업데이트" 배지로 왜 눌러도 반응이 없는지
// 드러낸다(예전엔 onClick 없는 장식 버튼이라 구분이 안 됐다).
// "최근 백업 2026.06.28"는 실제 백업 기능이 없는데 날짜만 하드코딩된 거짓 정보라 삭제했다.

import type { CSSProperties } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal, ModalHeader } from '../../../components/primitives/Modal/Modal'
import { useAppState } from '../../../state/AppStateContext'
import { useCloseModal } from '../../../state/selectors/modal'
import { useDownloadExportFile } from '@/services/export'
import type { ExportKind } from '@/services/export'

interface ComingSoonAction {
  icon: string
  title: string
  desc: string
  danger?: boolean
}

// "전체 내역 내보내기" 행은 배열 밖에서 별도로 렌더한다(인라인 드롭다운·로딩·에러 상태가 필요해서).
const BEFORE_EXPORT_ACTIONS: ComingSoonAction[] = [
  { icon: 'download', title: '엑셀 · CSV 가져오기', desc: '타 가계부 기록 한번에 이관' },
]
const AFTER_EXPORT_ACTIONS: ComingSoonAction[] = [
  { icon: 'cloud_sync', title: '로컬 DB 백업 · 복원', desc: '기기에 저장된 데이터를 백업 · 복원' },
  { icon: 'delete_forever', title: '데이터 초기화', desc: '모든 기록 영구 삭제', danger: true },
]

const ROW_BASE_STYLE: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 10, textAlign: 'left',
}
const ICON_SQUARE_STYLE: CSSProperties = {
  width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
}
const COMING_SOON_BADGE_STYLE: CSSProperties = {
  fontSize: 10.5, fontWeight: 700, color: 'var(--text-mid)', background: 'var(--fill-subtle)', padding: '4px 9px', borderRadius: 8, flex: 'none',
}
const EXPORT_OPTION_BTN_STYLE: CSSProperties = {
  display: 'block', width: '100%', textAlign: 'left', padding: '9px 10px', borderRadius: 8, border: 'none',
  background: 'transparent', fontSize: 12.5, fontWeight: 700, color: 'var(--text-strong)', cursor: 'pointer', fontFamily: 'inherit',
}

const EXPORT_OPTIONS: { kind: ExportKind; label: string }[] = [
  { kind: 'transactions', label: '가계부 거래 내역' },
  { kind: 'trades', label: '주식 매매 내역' },
]

function ComingSoonRow({ action }: { action: ComingSoonAction }) {
  return (
    <div
      style={{
        ...ROW_BASE_STYLE,
        border: action.danger ? '0.5px solid var(--down-chip)' : '0.5px solid var(--border)',
        background: action.danger ? 'var(--down-chip)' : 'var(--surface)',
      }}
    >
      <span
        style={{
          ...ICON_SQUARE_STYLE,
          background: action.danger ? 'var(--down-chip)' : 'var(--accent-soft)',
          color: action.danger ? 'var(--down)' : 'var(--accent)',
        }}
      >
        <Icon name={action.icon} size={18} />
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: action.danger ? 'var(--down)' : undefined }}>{action.title}</div>
        <div style={{ fontSize: 11, color: 'var(--text-weak)' }}>{action.desc}</div>
      </div>
      <span style={COMING_SOON_BADGE_STYLE} title="백엔드 준비 중이에요">추후 업데이트</span>
    </div>
  )
}

export function DataModal() {
  const { state, setState } = useAppState()
  const closeModal = useCloseModal()
  const download = useDownloadExportFile()

  const isOpen = state.modalOpen === 'data'
  const exportDropdownOpen = state.openDropdown === 'dataExportKind'

  if (!isOpen) return null

  // 이 모달도 AppShell에 항상 마운트되어 있어 닫아도 언마운트되지 않는다 — 이전 다운로드 실패
  // 메시지가 다음에 열 때 남지 않도록 닫을 때 직접 지운다.
  const closeAndReset = () => {
    download.reset()
    setState({ openDropdown: null })
    closeModal()
  }

  const toggleExportDropdown = () =>
    setState((st) => ({ openDropdown: st.openDropdown === 'dataExportKind' ? null : 'dataExportKind' }))

  const runExport = (kind: ExportKind) => {
    setState({ openDropdown: null })
    download.reset()
    download.mutate({ kind })
  }

  return (
    <Modal onClose={closeAndReset} zIndex={80} width={540} panelStyle={{ maxHeight: '86vh', overflow: 'auto' }}>
      <ModalHeader icon="database" title="데이터 관리 및 백업" onClose={closeAndReset} />
      {exportDropdownOpen && (
        <div onClick={() => setState({ openDropdown: null })} style={{ position: 'absolute', inset: 0, zIndex: 94 }} />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {BEFORE_EXPORT_ACTIONS.map((a) => (
          <ComingSoonRow key={a.title} action={a} />
        ))}

        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="qbtn"
            onClick={toggleExportDropdown}
            disabled={download.isPending}
            aria-busy={download.isPending}
            aria-expanded={exportDropdownOpen}
            style={{
              ...ROW_BASE_STYLE,
              width: '100%',
              border: '0.5px solid var(--border)',
              background: 'var(--surface)',
              cursor: download.isPending ? 'default' : 'pointer',
              opacity: download.isPending ? 0.7 : 1,
              fontFamily: 'inherit',
            }}
          >
            <span style={{ ...ICON_SQUARE_STYLE, background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              <Icon name="upload" size={18} />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>전체 내역 내보내기</div>
              <div style={{ fontSize: 11, color: 'var(--text-weak)' }}>
                {download.isPending ? '내보내는 중…' : 'XLSX · 가계부 거래 또는 주식 매매'}
              </div>
            </div>
            <Icon name="expand_more" size={18} color="var(--text-weak)" />
          </button>
          {exportDropdownOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: 'var(--surface)',
                border: '0.5px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-pop)', padding: 6,
                zIndex: 95,
              }}
            >
              {EXPORT_OPTIONS.map((opt) => (
                <button
                  key={opt.kind}
                  type="button"
                  className="mini-hov"
                  onClick={() => runExport(opt.kind)}
                  style={EXPORT_OPTION_BTN_STYLE}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
          {download.error && (
            <div role="alert" style={{ fontSize: 11.5, color: 'var(--down)', marginTop: 6, padding: '0 4px' }}>
              {download.error.message}
            </div>
          )}
        </div>

        {AFTER_EXPORT_ACTIONS.map((a) => (
          <ComingSoonRow key={a.title} action={a} />
        ))}
      </div>
    </Modal>
  )
}
