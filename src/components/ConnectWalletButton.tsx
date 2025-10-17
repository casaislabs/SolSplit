import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { Button } from '@/components/ui/button'
import { Loader2Icon, WalletIcon, CopyIcon, LogOutIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'

export function ConnectWalletButton({ className }: { className?: string }) {
  const { connected, connecting, publicKey, disconnect } = useWallet()
  const { setVisible } = useWalletModal()

  const shortAddress = publicKey?.toBase58()
    ? `${publicKey.toBase58().slice(0, 4)}…${publicKey.toBase58().slice(-4)}`
    : null

  if (connecting) {
    return (
      <Button variant="default" size="lg" disabled className={cn('btn-wallet-brand font-semibold rounded-full px-6', className)}>
        <Loader2Icon className="size-4 animate-spin" />
        Connecting…
      </Button>
    )
  }

  if (!connected) {
    return (
      <Button
        variant="default"
        size="lg"
        onClick={() => setVisible(true)}
        className={cn('btn-wallet-brand font-semibold rounded-full px-6', className)}
        aria-label={'Connect wallet'}
        title={'Connect wallet'}
      >
        <WalletIcon className="size-4" />
        Connect Wallet
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('btn-wallet-ghost text-brand-gradient font-semibold rounded-full', className)}
          aria-label={'Open wallet menu'}
          title={publicKey?.toBase58() ?? 'Wallet connected'}
        >
          <WalletIcon className="size-4 text-white" />
          {shortAddress}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Wallet</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={async () => {
            try {
              const addr = publicKey?.toBase58()
              if (!addr) return
              await navigator.clipboard.writeText(addr)
              toast.success('Address copied')
            } catch {
              toast.error('Failed to copy')
            }
          }}
        >
          <CopyIcon className="mr-2 size-4" /> Copy address
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            disconnect().catch(() => {})
          }}
        >
          <LogOutIcon className="mr-2 size-4" /> Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default ConnectWalletButton