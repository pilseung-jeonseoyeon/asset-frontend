// 데이터 관리 및 백업 모달. 4개 행 중 실제 기능이 붙은 건 두 개다.
// - '엑셀로 가져오기': 모닛 양식 엑셀을 올려 거래를 일괄 등록한다(GET/POST
// /import/excel/transactions). 행을 누르면 바로 아래에 인라인 패널이 펼쳐진다(양식 내려받기 ·
// 파일 올리기 · 결과 요약). 서버는 한 행이라도 틀리면 아무것도 등록하지 않으므로 결과는
// 'N건 등록' 또는 '틀린 행 목록 + 고쳐서 다시 올리기' 둘 중 하나다 — 계약은 docs/excel-import.md.
// - '전체 내역 내보내기'(GET /export/excel/transactions, GET /export/excel/trades): 눌러서 거래/매매
// 중 하나를 고르는 인라인 드롭다운(CustomModal.tsx의 월 시작일 드롭다운과 같은 수동 구현 패턴).
// 나머지 2개(백업/복원·초기화)는 대응 API가 없어 '추후 업데이트' 배지로 왜 눌러도 반응이 없는지
// 드러낸다 — 배지 없는 장식 버튼으로 두면 고장으로 읽힌다.
//
// 가져오기 패널의 파일 선택은 숨긴 <input type="file">을 버튼으로 여는 방식이다 — 기본 파일 input은
// 디자인 토큰으로 스타일할 수 없어서다. 같은 파일을 연달아 다시 고를 수 있도록(한 번 실패한 파일을
// 고쳐서 같은 이름으로 다시 올리는 흔한 흐름) onChange 뒤에 input.value를 비운다 — 안 비우면 같은
// 경로를 다시 골랐을 때 change 이벤트가 나지 않는다.

import { Fragment, useRef, useState } from 'react'
import type { CSSProperties, ChangeEvent } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal, ModalHeader } from '../../../components/primitives/Modal/Modal'
import { useAppState } from '../../../state/AppStateContext'
import { useCloseModal } from '../../../state/selectors/modal'
import { useDownloadExportFile } from '@/services/export'
import type { ExportKind } from '@/services/export'
import { useDownloadImportTemplate, useUploadImportFile } from '@/services/import'
import { ConnectionsSection } from './ConnectionsSection'

interface ComingSoonAction {
  icon: string
  title: string
  desc: string
  danger?: boolean
}

const COMING_SOON_ACTIONS: ComingSoonAction[] = [
  { icon: 'cloud_sync', title: '로컬 DB 백업 · 복원', desc: '기기에 저장된 데이터를 백업 · 복원' },
  { icon: 'delete_forever', title: '데이터 초기화', desc: '모든 기록 영구 삭제', danger: true },
]

const ROW_BASE_STYLE: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 10, textAlign: 'left',
}
const ACTION_ROW_BTN_STYLE: CSSProperties = {
  ...ROW_BASE_STYLE,
  width: '100%',
  border: '0.5px solid var(--border)',
  background: 'var(--surface)',
  fontFamily: 'inherit',
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
const ERROR_TEXT_STYLE: CSSProperties = { fontSize: 11.5, color: 'var(--down)', marginTop: 6, padding: '0 4px' }
// 가져오기 패널 안의 두 버튼 — 양식은 보조 톤, 올리기는 액센트 소프트(화면 안 "+ 환전 추가" 같은 보조 CTA 톤).
const PANEL_BTN_BASE_STYLE: CSSProperties = {
  flex: 1, minHeight: 40, padding: '10px 12px', borderRadius: 10, fontSize: 12.5, fontWeight: 700,
  fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
}

const EXPORT_OPTIONS: { kind: ExportKind; label: string }[] = [
  { kind: 'transactions', label: '가계부 거래 내역' },
  { kind: 'trades', label: '주식 매매 내역' },
]

// 양식 1번 시트의 A~I 열 순서(서버 IMPORT_TRANSACTION_HEADERS, docs/excel-import.md) — 양식을 내려받기 전에도
// 무엇을 채워야 하는지 알 수 있게 적어둔다. 이름은 양식 2번 시트("등록된 이름")에 있는 것과 같아야 한다.
const IMPORT_COLUMNS = '날짜 · 계좌 · 대분류 · 소분류 · 내용 · 금액 · 구분 · 메모 · 상대계좌'
const IMPORT_REFERENCE_SHEET = '등록된 이름'

/** 엑셀 양식의 계좌 두 칸(B열 '계좌' / I열 '상대계좌')이 각각 무엇인지. docs/excel-import.md와 같은 내용. */
const IMPORT_ACCOUNT_GUIDE: { kind: string; account: string; counterparty: string }[] = [
  { kind: '수입', account: '입금 계좌 (들어온 곳)', counterparty: '비움' },
  { kind: '지출', account: '출금 계좌 (나간 곳)', counterparty: '비움' },
  { kind: '저축', account: '출금 계좌', counterparty: '입금 계좌 (쌓이는 곳)' },
  { kind: '이체', account: '출금 계좌', counterparty: '입금 계좌 (받는 곳)' },
]

const IMPORT_TABLE_HEAD_STYLE = { fontSize: 10.5, fontWeight: 700, color: 'var(--text-weak)' } as const

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
  const template = useDownloadImportTemplate()
  const upload = useUploadImportFile()
  const [importOpen, setImportOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isOpen = state.modalOpen === 'data'
  const exportDropdownOpen = state.openDropdown === 'dataExportKind'

  if (!isOpen) return null

  // 이 모달도 AppShell에 항상 마운트되어 있어 닫아도 언마운트되지 않는다 — 이전 다운로드 실패
  // 메시지·가져오기 결과가 다음에 열 때 남지 않도록 닫을 때 직접 지운다.
  const closeAndReset = () => {
    download.reset()
    template.reset()
    upload.reset()
    setImportOpen(false)
    setState({ openDropdown: null })
    closeModal()
  }

  const toggleExportDropdown = () =>
    setState((prev) => ({ openDropdown: prev.openDropdown === 'dataExportKind' ? null : 'dataExportKind' }))

  const runExport = (kind: ExportKind) => {
    setState({ openDropdown: null })
    download.reset()
    download.mutate({ kind })
  }

  const handleFilePicked = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // 같은 파일을 다시 고를 수 있게 항상 비운다(파일 상단 주석 참고).
    e.target.value = ''
    if (!file) return
    template.reset()
    upload.reset()
    upload.mutate({ kind: 'transactions', file })
  }

  const importBusy = template.isPending || upload.isPending
  const result = upload.data

  return (
    <Modal onClose={closeAndReset} zIndex={80} width={540} panelStyle={{ maxHeight: '86vh', overflow: 'auto' }}>
      <ModalHeader icon="database" title="데이터 관리 및 백업" onClose={closeAndReset} />
      {exportDropdownOpen && (
        <div onClick={() => setState({ openDropdown: null })} style={{ position: 'absolute', inset: 0, zIndex: 94 }} />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <button
            type="button"
            className="qbtn"
            onClick={() => setImportOpen((v) => !v)}
            aria-expanded={importOpen}
            style={{ ...ACTION_ROW_BTN_STYLE, cursor: 'pointer' }}
          >
            <span style={{ ...ICON_SQUARE_STYLE, background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              <Icon name="download" size={18} />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>엑셀로 가져오기</div>
              <div style={{ fontSize: 11, color: 'var(--text-weak)' }}>XLSX · 모닛 양식으로 가계부 거래 일괄 등록</div>
            </div>
            <Icon name={importOpen ? 'expand_less' : 'expand_more'} size={18} color="var(--text-weak)" />
          </button>
          {importOpen && (
            <div
              style={{
                marginTop: 8, padding: 14, borderRadius: 10, background: 'var(--fill-subtle)',
                display: 'flex', flexDirection: 'column', gap: 10,
              }}
            >
              <div style={{ fontSize: 11.5, color: 'var(--text-mid)', lineHeight: 1.6 }}>
                양식을 내려받아 A열부터 <b style={{ color: 'var(--text-strong)' }}>{IMPORT_COLUMNS}</b> 순서로 채운 뒤 올려주세요.
                계좌·분류는 양식의 &lsquo;{IMPORT_REFERENCE_SHEET}&rsquo; 시트에 있는 이름과 같아야 해요.
                한 줄이라도 틀리면 전체가 등록되지 않으니 알려드리는 줄을 고쳐 다시 올려주세요.
              </div>
              {/* 계좌 칸이 두 개(B열 '계좌', I열 '상대계좌')라 어느 쪽이 나가는 돈이고 어느 쪽이 들어오는
                  돈인지 매번 헷갈린다는 지적이 있었다. 표로 못박아 둔다 — 특히 수입만 예외라
                  들어온 돈을 '상대계좌'가 아니라 '계좌'에 적는다는 점이 핵심이다(docs/excel-import.md). */}
              <div style={{ fontSize: 11.5, color: 'var(--text-mid)', lineHeight: 1.6 }}>
                <b style={{ color: 'var(--text-strong)' }}>&lsquo;상대계좌&rsquo;는 곧 입금 계좌예요</b> — 돈이 들어가는 쪽.
                &lsquo;계좌&rsquo;는 돈이 나가는 쪽(출금)이고요.
                <b style={{ color: 'var(--text-strong)' }}> 수입만 예외</b>로, 들어온 돈이 담기는 계좌를
                &lsquo;상대계좌&rsquo;가 아니라 &lsquo;계좌&rsquo; 칸에 적습니다.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: '6px 10px', fontSize: 11, lineHeight: 1.5 }}>
                <span style={IMPORT_TABLE_HEAD_STYLE}>구분</span>
                <span style={IMPORT_TABLE_HEAD_STYLE}>계좌</span>
                <span style={IMPORT_TABLE_HEAD_STYLE}>상대계좌</span>
                {IMPORT_ACCOUNT_GUIDE.map((r) => (
                  <Fragment key={r.kind}>
                    <span style={{ fontWeight: 700, color: 'var(--text-strong)' }}>{r.kind}</span>
                    <span style={{ color: 'var(--text-mid)' }}>{r.account}</span>
                    <span style={{ color: r.counterparty === '비움' ? 'var(--text-weak)' : 'var(--text-mid)' }}>{r.counterparty}</span>
                  </Fragment>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="qbtn"
                  onClick={() => {
                    upload.reset()
                    template.reset()
                    template.mutate('transactions')
                  }}
                  disabled={importBusy}
                  aria-busy={template.isPending}
                  style={{
                    ...PANEL_BTN_BASE_STYLE,
                    border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-strong)',
                    cursor: importBusy ? 'default' : 'pointer', opacity: importBusy ? 0.7 : 1,
                  }}
                >
                  <Icon name="description" size={16} color="var(--text-mid)" />
                  {template.isPending ? '양식 준비 중…' : '양식 내려받기'}
                </button>
                <button
                  type="button"
                  className="qbtn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importBusy}
                  aria-busy={upload.isPending}
                  style={{
                    ...PANEL_BTN_BASE_STYLE,
                    border: 'none', background: 'var(--accent-soft)', color: 'var(--accent)',
                    cursor: importBusy ? 'default' : 'pointer', opacity: importBusy ? 0.7 : 1,
                  }}
                >
                  <Icon name="upload_file" size={16} color="var(--accent)" />
                  {upload.isPending ? '올리는 중…' : '엑셀 파일 올리기'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={handleFilePicked}
                  style={{ display: 'none' }}
                  aria-hidden
                  tabIndex={-1}
                />
              </div>
              {template.error && <div role="alert" style={ERROR_TEXT_STYLE}>{template.error.message}</div>}
              {upload.error && <div role="alert" style={ERROR_TEXT_STYLE}>{upload.error.message}</div>}
              {result && result.errors.length === 0 && (
                <div role="status" style={{ fontSize: 12, color: 'var(--text-mid)', lineHeight: 1.6 }}>
                  <b style={{ color: 'var(--text-strong)' }}>{result.importedCount.toLocaleString('ko-KR')}건</b> 등록했어요
                </div>
              )}
              {result && result.errors.length > 0 && (
                // 서버가 전체 롤백했다 — 한 건도 등록되지 않았음을 먼저 말하고, 고칠 행을 번호로 알려준다.
                <div role="alert" style={{ fontSize: 12, color: 'var(--text-mid)', lineHeight: 1.6 }}>
                  <div>
                    <b style={{ color: 'var(--down)' }}>{result.errors.length.toLocaleString('ko-KR')}줄</b>에 문제가 있어 등록하지 않았어요.
                    아래 줄을 고친 뒤 다시 올려주세요.
                  </div>
                  {/* 실패 행이 많을 수 있어 목록만 안에서 스크롤한다 — 모달 본문이 끝없이 길어지지 않게. */}
                  <ul style={{ listStyle: 'none', margin: '6px 0 0', padding: 0, maxHeight: 160, overflowY: 'auto', fontSize: 11.5 }}>
                    {result.errors.map((f) => (
                      <li key={`${f.rowNumber}-${f.code}`} style={{ display: 'flex', gap: 8, padding: '3px 0' }}>
                        <span style={{ color: 'var(--text-weak)', flex: 'none', minWidth: 36 }}>{f.rowNumber}행</span>
                        <span style={{ color: 'var(--text-strong)' }}>{f.message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 증권사·거래소 연동 관리. 엑셀 가져오기 바로 아래 — 둘 다 "외부에서 데이터를
            끌어오는 수단"이라 같은 묶음으로 읽힌다. 새 연동 등록은 여기가 아니라 계좌 추가 모달에
            있다(등록의 결과물이 계좌라서). 여기는 목록·재동기화·해제 전용이다. */}
        <ConnectionsSection />

        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="qbtn"
            onClick={toggleExportDropdown}
            disabled={download.isPending}
            aria-busy={download.isPending}
            aria-expanded={exportDropdownOpen}
            style={{
              ...ACTION_ROW_BTN_STYLE,
              cursor: download.isPending ? 'default' : 'pointer',
              opacity: download.isPending ? 0.7 : 1,
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
            <div role="alert" style={ERROR_TEXT_STYLE}>
              {download.error.message}
            </div>
          )}
        </div>

        {COMING_SOON_ACTIONS.map((a) => (
          <ComingSoonRow key={a.title} action={a} />
        ))}
      </div>
    </Modal>
  )
}
