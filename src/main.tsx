import './polyfills'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import '@solana/wallet-adapter-react-ui/styles.css'
import { SolanaProvider } from './providers/SolanaProvider'
import App from './App.tsx'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import WalletToasts from '@/components/WalletToasts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider attribute="class" forcedTheme="dark">
      <SolanaProvider>
        <App />
        <Toaster position="bottom-right" richColors closeButton />
        <WalletToasts />
      </SolanaProvider>
    </ThemeProvider>
  </StrictMode>,
)
