import { useWallet } from '@solana/wallet-adapter-react'
import { Separator } from '@/components/ui/separator'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { SiteHeader } from '@/components/SiteHeader'
import { ConnectWalletButton } from './components/ConnectWalletButton'
import TransferForm from '@/components/TransferForm'

const faucetUrl = 'https://faucet.solana.com/'

export default function App() {
  const { connected } = useWallet()
  // Connection/disconnection toasts are displayed from WalletToasts
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B1220] via-[#0B1220] to-[#0A0F1F] text-foreground">
      <SiteHeader />

      {connected ? (
        null
      ) : (
        <section className="mx-auto max-w-7xl px-4 pt-10 pb-8">
          <div className="mt-6 max-w-xl mx-auto rounded-xl p-[1px] bg-brand-gradient">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="text-base text-brand-gradient">Connect your wallet to get started</CardTitle>
                <CardDescription>
                  Use Phantom, Solflare, or Ledger to authenticate and continue. Your actions run on Devnet.
                  <span className="ml-1">
                    <a
                      href={faucetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Request Devnet SOL from Solana Faucet"
                      className="underline decoration-dashed text-muted-foreground hover:text-foreground"
                    >
                      Request Devnet SOL here
                    </a>
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Separator className="my-3" />
                <ul className="mt-1 text-sm text-muted-foreground list-disc list-inside">
                  <li>Your private key never leaves your wallet.</li>
                  <li>You can switch wallets or disconnect anytime.</li>
                </ul>
                <div className="mt-6">
                  <ConnectWalletButton className="w-full justify-center" />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {connected && (
        <main className="mx-auto max-w-7xl px-4 pt-6 pb-12 grid min-h-[calc(100vh-140px)] place-items-center">
          <div className="mx-auto w-full max-w-2xl">
            <TransferForm />
          </div>
        </main>
      )}

      {/* Remove connected-only footer on the send page */}
    </div>
  )
}
