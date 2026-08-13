// lazy 청크 로드 실패를 잡아 안내 화면으로 바꾸는 최소한의 에러 경계.
//
// 왜 필요한가: Vercel은 배포할 때마다 청크 파일명 해시가 바뀌고 옛 파일은 사라진다. 탭을 열어둔
// 채로 재배포가 일어난 뒤 로그인하면 AppShell의 import('./AuthenticatedApp')가 이미 없는 URL을
// 요청해 404 → Promise reject가 된다. Suspense는 "아직 안 왔다"는 처리할 뿐 reject는 못 잡으므로,
// 경계가 없으면 React가 트리 전체를 언마운트해 **흰 화면**이 된다(콘솔 에러 외 안내 없음).
//
// 클래스 컴포넌트인 이유: 에러 경계는 훅으로 만들 수 없다(React가 componentDidCatch/
// getDerivedStateFromError를 요구한다). 이 저장소에서 클래스 컴포넌트는 여기 하나뿐이다.

import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // 사용자에게는 아래 폴백만 보이지만, 원인 추적을 위해 콘솔에는 남긴다.
    console.error('[ChunkErrorBoundary] 화면 청크 로드 실패', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div
        role="alert"
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          padding: 24,
          background: 'var(--canvas)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-strong)' }}>
          화면을 불러오지 못했어요
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-mid)', lineHeight: 1.7, maxWidth: 320 }}>
          앱이 업데이트되었거나 연결이 끊겼을 수 있어요.
          <br />
          새로고침하면 대부분 해결됩니다.
        </div>
        <button
          type="button"
          className="pill-btn"
          onClick={() => window.location.reload()}
          style={{
            marginTop: 4,
            padding: '11px 22px',
            borderRadius: 10,
            border: 'none',
            background: 'var(--accent)',
            color: '#fff',
            fontSize: 13.5,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          새로고침
        </button>
      </div>
    )
  }
}
