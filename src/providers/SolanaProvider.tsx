import type { FC, ReactNode } from 'react'
import { useMemo } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import type { WalletAdapter, WalletError } from '@solana/wallet-adapter-base'
import { clusterApiUrl } from '@solana/web3.js'
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  LedgerWalletAdapter,
} from '@solana/wallet-adapter-wallets'
import { toast } from 'sonner'

export interface SolanaProviderProps {
  children: ReactNode
}

// Global provider for Solana connection and wallet modal
export const SolanaProvider: FC<SolanaProviderProps> = ({ children }) => {
  const network = WalletAdapterNetwork.Devnet
  const endpoint = useMemo(() => clusterApiUrl(network), [network])

  // Common wallet adapters. You can add/remove as needed later.
  const wallets = useMemo(() => {
    return [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network }),
      new LedgerWalletAdapter(),
    ] as WalletAdapter[]
  }, [network])

  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment: 'confirmed' }}>
      <WalletProvider
        wallets={wallets}
        autoConnect
        onError={(e: WalletError) => {
          const { name, message } = e
          const text = `${name ?? 'Wallet Error'}: ${message ?? ''}`.trim()
          const isUserRejected = (name === 'WalletSendTransactionError') || /reject|declin|cancel/i.test(String(message))
          if (isUserRejected) {
            // Friendlier toast for user cancellation
            toast.warning('Transaction cancelled by user')
            return
          }
          console.error(`[wallet-adapter] ${text}`)
          toast.error(text || 'Wallet error')
        }}
      >
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}