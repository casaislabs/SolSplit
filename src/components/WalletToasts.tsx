import { useEffect, useRef } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { toast } from 'sonner'

export function WalletToasts() {
  const { connected, wallet, publicKey } = useWallet()
  const prevConnected = useRef<boolean>(connected)

  useEffect(() => {
    if (prevConnected.current !== connected) {
      const name = wallet?.adapter?.name ?? 'Wallet'
      if (connected) {
        const addr = publicKey?.toBase58()
        const short = addr ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : undefined
        toast.success(short ? `${name} connected (${short})` : `${name} connected`)
      } else {
        toast.info(`${name} disconnected`)
      }
      prevConnected.current = connected
    }
  }, [connected, wallet, publicKey])

  return null
}

export default WalletToasts