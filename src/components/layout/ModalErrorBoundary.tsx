// 모달 하나의 렌더 실패가 앱 전체를 무너뜨리지 않도록, AuthenticatedApp이 마운트하는 모달마다 개별로
// 씌우는 얇은 에러 경계.
//
// ChunkErrorBoundary와의 역할 차이: ChunkErrorBoundary(AppShell.tsx)는 AuthenticatedApp 전체를
// 감싸 원래 "lazy 청크 로드 실패"(import()의 reject)만 잡으려는 목적이지만, React 에러 경계는 원인을
// 구분하지 않고 트리 안 어떤 렌더 예외든 잡으면 그 경계 아래를 통째로 대체한다. 경계가 AuthenticatedApp
// 하나뿐이면 모달 컴포넌트 하나의 버그가 사이드바·헤더·현재 화면까지 함께 지워버린다(실제 겪은
// 장애 — EditAccountModal이 서버 응답 필드명 불일치로 던진 TypeError가 앱 전체를 "화면을 불러오지
// 못했어요"로 대체함). 그래서 AuthenticatedApp이 렌더하는 모달마다 이 경계로 각각 감싸, "모달 하나의
// 크래시"가 그 모달 자리로만 국한되게 한다. ChunkErrorBoundary는 원래 목적대로 그대로 두고, 이 경계가
// 그보다 안쪽(모달 트리)에서 먼저 잡는다.
//
// 클래스 컴포넌트인 이유: ChunkErrorBoundary와 같다 — 에러 경계는 훅으로 만들 수 없다(React가
// componentDidCatch/getDerivedStateFromError를 요구한다).
//
// 리셋 방법(무한 루프 방지): fallback의 닫기 버튼은 (1) 호출부가 넘긴 onReset으로 AppState를 "이
// 모달은 닫힘" 상태로 되돌리고, (2) 이 컴포넌트 자신의 hasError를 false로 되돌린다. React 에러
// 경계는 에러를 잡으면 서브트리를 언마운트하므로, hasError가 다시 false가 될 때 children은 완전히
// 새로 마운트된다(내부 로컬 state도 전부 초기화) — "같은 인스턴스가 유지"되는 게 아니다. 그런데도
// 크래시가 반복되지 않고 수렴하는 건, 이 컴포넌트가 감싸는 각 모달이 파생 계산보다 먼저
// `if (!isOpen) return null`을 두는 관례를 지키고 있고(AssetCategoryModal도 같은 관례를
// 따른다), onReset이 그 `isOpen`을 판단하는 AppState 필드를 꺼주기 때문이다 — 재마운트된 children이
// 첫 렌더에서 바로 null을 반환해 크래시가 재현되지 않는다.
//
// 로깅 시 주의: error.message/componentStack에는 예외 발생 지점과 컴포넌트 이름 트리만 담기고, 계좌
// 잔액 같은 실제 데이터 값은 실리지 않는다(값을 실어 던지는 커스텀 에러를 새로
// 만들지 않는 한 안전하다).
//
// 이 안전망이 잡지 못하는 것(범위 밖, 의도적으로 고치지 않음):
// - 폴백 UI 자신(아래 render의 Modal/Icon)이 렌더 중 던지면 이 경계는 자기 자신의 렌더 예외를 잡지
// 못해 위쪽 ChunkErrorBoundary까지 전파되고, 결국 앱 전체가 "화면을 불러오지 못했어요"로 대체된다.
// - 이벤트 핸들러·비동기 콜백(예: mutation의 onSuccess/onError 체인) 안에서 던지는 예외는 React
// 에러 경계가 원천적으로 잡지 못한다. 이 저장소의 여러 모달이 모달 닫기를 `mutate(...).onSuccess`
// 체인에 의존하므로, 그 안에서 던지면 이 경계는 아무 반응도 하지 않고 콘솔 에러만 남는다.

import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Icon } from '../primitives/Icon/Icon'
import { Modal } from '../primitives/Modal/Modal'

interface Props {
  children: ReactNode
  // 크래시한 모달을 "닫힘"으로 되돌리는 AppState 패치. 대부분의 모달은 `state.modalOpen`으로
  // 열림을 판단하므로 `() => setState({ modalOpen: null, openDropdown: null })`이면 충분하지만,
  // assetClassDetail/accountDetail/reportOpen처럼 전용 필드로 열림을 판단하는 모달은 호출부(AuthenticatedApp)
  // 가 그 필드를 대신 넘긴다. 어떤 필드를 닫든 openDropdown도 함께 지워야 한다 — 크래시 시점에 그
  // 모달 안의 드롭다운이 열려 있었다면(state.openDropdown !== null) AuthenticatedApp의 전역 클릭
  // 캐처(z-index 70, 화면 전체를 덮는 스크림)가 닫히지 않고 남아 앱 전체가 클릭 먹통이 된다.
  onReset: () => void
  // 이 경계가 감싸는 모달 자신이 Modal에 넘기는 실제 zIndex와 반드시 같은 값. 이 앱에는 의도된 2단
  // 모달 겹침(§7-1: z80 AssetCategoryModal 위에 z90 AddAccountModal/EditAccountModal/
  // AccountDetailModal이 뜬다)이 있어, 폴백을 아무 고정값에 띄우면 "아래층이 크래시했을
  // 때 위층에 떠 있던 멀쩡한 모달"을 가려버린다. 폴백은 항상 크래시한 그 모달이 있던 층에 뜨게 한다.
  zIndex: number
  // 사람이 읽는 모달 이름(해당 모달 헤더에 실제로 쓰이는 문구와 동일하게). "○○ 화면을 표시할 수
  // 없어요"로 노출해 어떤 창이 실패했는지 알려준다. 제목이 상태에 따라 바뀌는 모달(예: 가계부 입력/
  // 수정)은 가장 대표적인 문구 하나로 고정한다 — 크래시 시점의 정확한 하위 상태까지 재현할 필요는
  // 없다.
  title: string
}

interface State {
  hasError: boolean
}

export class ModalErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ModalErrorBoundary] 모달 렌더 실패', error, info.componentStack)
  }

  handleClose = () => {
    this.props.onReset()
    this.setState({ hasError: false })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <Modal onClose={this.handleClose} zIndex={this.props.zIndex} width={360}>
        <div role="alert" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <span
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: 'var(--down-chip)',
              color: 'var(--down)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <Icon name="warning" size={22} ariaHidden />
          </span>
          {/* fontSize 18 + marginBottom 8: AccountModal.tsx의 탈퇴 확인 패널(같은 44px down-chip
              아이콘, 같은 본문 스타일)과 동일하게 맞춘 값 — 이 저장소의 "오류/확인" 패널 참조 패턴. */}
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 8 }}>
            {this.props.title} 화면을 표시할 수 없어요
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-weak)', lineHeight: 1.7, marginBottom: 20 }}>
            일시적인 오류일 수 있어요.
            <br />
            닫은 뒤 다시 열어주세요.
          </div>
          <button
            type="button"
            onClick={this.handleClose}
            className="qbtn"
            style={{
              width: '100%',
              padding: 14,
              borderRadius: 10,
              border: 'none',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            닫기
          </button>
        </div>
      </Modal>
    )
  }
}
