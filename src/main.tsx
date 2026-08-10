import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

interface ErrorBoundaryState {
  hasError: boolean
}

/** 予期しない描画エラーでも空白画面にせず、復旧方法を案内する。 */
class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('アプリの描画中にエラーが発生しました。', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="startup-error" role="alert">
          <h1>画面を表示できませんでした</h1>
          <p>ページを再読み込みしてください。解決しない場合は、開発者ツールのコンソールを確認してください。</p>
          <button type="button" className="primary" onClick={() => window.location.reload()}>
            ページを再読み込み
          </button>
        </main>
      )
    }

    return this.props.children
  }
}

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('アプリの描画先 #root が見つかりません。')
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
