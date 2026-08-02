import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { AppStateProvider } from './state/AppStateContext.tsx'
import { queryClient } from './services/queryClient.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppStateProvider>
        <App />
      </AppStateProvider>
    </QueryClientProvider>
  </StrictMode>,
)
