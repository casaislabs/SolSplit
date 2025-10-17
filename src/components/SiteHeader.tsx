import logoUrl from '@/assets/logo.svg'
import { useWallet } from '@solana/wallet-adapter-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { BalanceDisplay } from '@/components/BalanceDisplay'
import { ConnectWalletButton } from '@/components/ConnectWalletButton'

export function SiteHeader() {
  const { connected } = useWallet()

  return (
    <>
      <div className="brand-hr" />
      <header className="sticky top-0 z-30 glass-header">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="SolSplit" className="h-10 md:h-12" />
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Separator orientation="vertical" className="h-6" />
            <Badge variant="secondary">Devnet</Badge>
            {connected && <BalanceDisplay />}
            {connected && <ConnectWalletButton />}
          </div>
        </div>
      </header>
    </>
  )
}

export default SiteHeader