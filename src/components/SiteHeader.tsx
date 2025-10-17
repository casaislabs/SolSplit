import logoUrl from '@/assets/logo.svg'
import { useWallet } from '@solana/wallet-adapter-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { BalanceDisplay } from '@/components/BalanceDisplay'
import { ConnectWalletButton } from '@/components/ConnectWalletButton'

const faucetUrl = 'https://faucet.solana.com/'

export function SiteHeader() {
  const { connected } = useWallet()

  return (
    <>
      <div className="brand-hr" />
      <header className="sticky top-0 z-30 glass-header">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="SolSplit" className="h-10 md:h-12" />
            {/* Mobile-only faucet link for visibility */}
            <a
              href={faucetUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Request Devnet SOL from Solana Faucet"
              className="md:hidden text-xs text-muted-foreground underline decoration-dashed hover:text-foreground"
            >
              Request Devnet SOL
            </a>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Separator orientation="vertical" className="h-6" />
            <Badge variant="secondary">Devnet</Badge>
            <a
              href={faucetUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Request Devnet SOL from Solana Devnet Faucet"
              className="text-xs text-muted-foreground underline decoration-dashed hover:text-foreground"
            >
              Request Devnet SOL
            </a>
            {connected && <BalanceDisplay />}
            {connected && <ConnectWalletButton />}
          </div>
        </div>
      </header>
    </>
  )
}

export default SiteHeader