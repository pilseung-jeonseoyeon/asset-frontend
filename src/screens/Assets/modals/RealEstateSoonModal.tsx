// 자산 화면 '부동산' 칸의 안내 모달(2026-08-27 추가). dc.html 원본에 대응 블록이 없는 새 모달이다.
//
// 왜 모달인가: 부동산은 **서버에 자산군 자체가 없다**(2026-08-27 라이브 OpenAPI 대조 — AssetClass는
// STOCK/DEPOSIT/CRYPTO/CASH/ETC 5종뿐이고 REAL_ESTATE 문자열이 문서 전체에 0건). 등록도 조회도 되지
// 않으므로 자산군 카드처럼 계좌 목록(AssetCategoryModal)을 열면 영원히 비어 있는 화면이 된다. 대신
// "아직 준비 중"이라는 사실만 분명히 알린다 — 이 저장소는 서버에 없는 값을 있는 것처럼 그리지 않는다.
//
// 카드 자체(Assets.tsx)에도 "준비 중" 배지가 붙어 있어 누르기 전에 이미 알 수 있다. 이 모달은 그래도
// 눌러본 사용자에게 "언젠가 되는 기능"임을 알려주는 자리다 — 눌리지 않는 카드로 두면 고장으로 읽힌다.
//
// 서버에 부동산 자산군이 생기면 이 파일과 Assets.tsx의 카드를 지우고, AssetClass 유니언에 값을 더해
// 다른 5개 자산군과 똑같이(카드 + AssetCategoryModal + 계좌 등록 폼) 처리하면 된다.

import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal, ModalHeader } from '../../../components/primitives/Modal/Modal'
import { useAppState } from '../../../state/AppStateContext'

export function RealEstateSoonModal() {
  const { state, setState } = useAppState()
  const isOpen = state.modalOpen === 'realEstateSoon'

  // 다른 모달과 같은 관례로 openDropdown도 함께 지운다(AuthenticatedApp 주석 참고).
  const close = () => setState({ modalOpen: null, openDropdown: null })

  if (!isOpen) return null

  return (
    // 자산군 카드에서 바로 열리므로 1단 모달(z-index 80)이다 — AssetCategoryModal과 같은 단.
    <Modal onClose={close} zIndex={80} width={420}>
      <ModalHeader icon="home" title="부동산" onClose={close} />

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          background: 'var(--fill-subtle)',
          borderRadius: 10,
          padding: 16,
          marginBottom: 20,
        }}
      >
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: 10,
            background: 'var(--surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 'none',
          }}
        >
          <Icon name="schedule" size={17} color="var(--text-mid)" />
        </span>
        <div style={{ fontSize: 12.5, color: 'var(--text-mid)', lineHeight: 1.7 }}>
          부동산 자산 등록은 아직 준비 중이에요.
          <br />
          집·전세보증금처럼 금액이 큰 자산도 곧 총자산에 함께 넣어 관리할 수 있도록 만들고 있어요.
        </div>
      </div>

      <button
        className="qbtn"
        onClick={close}
        style={{
          width: '100%',
          minHeight: 48,
          borderRadius: 10,
          border: 'none',
          background: 'var(--accent)',
          color: '#fff',
          fontSize: 13.5,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'transform .12s',
        }}
      >
        확인
      </button>
    </Modal>
  )
}
