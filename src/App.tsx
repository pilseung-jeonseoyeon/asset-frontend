import { useAppState } from './state/AppStateContext'
import { useApplyTheme } from './utils/theme'
import { AppShell } from './components/layout/AppShell'

function App() {
  const { state } = useAppState()
  useApplyTheme(state.theme)

  return <AppShell />
}

export default App
