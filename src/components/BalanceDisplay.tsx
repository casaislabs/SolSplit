import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import type { AccountInfo } from '@solana/web3.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export function BalanceDisplay({ className }: { className?: string }) {
  const { connection } = useConnection()
  const { publicKey, connected } = useWallet()
  const [balance, setBalance] = useState<number | null>(null)
  const formatter = useMemo(
    () => new Intl.NumberFormat('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 }),
    []
  )
  const subRef = useRef<number | null>(null)

  useEffect(() => {
    if (!connection || !publicKey || !connected) {
      setBalance(null)
      // Clear any previous subscription if disconnected
      if (subRef.current !== null) {
        connection
          .removeAccountChangeListener(subRef.current)
          .catch(() => {
            console.debug('Cleanup: removeAccountChangeListener failed (ignored)')
          })
        subRef.current = null
      }
      return
    }

    let cancelled = false

    const setup = async () => {
      // Avoid double subscriptions if publicKey changes quickly
      if (subRef.current !== null) {
        try {
          await connection.removeAccountChangeListener(subRef.current)
        } catch {
          console.debug('Cleanup: removeAccountChangeListener failed (ignored)')
        }
        subRef.current = null
      }

      try {
        const lamports = await connection.getBalance(publicKey)
        if (!cancelled) setBalance(lamports / LAMPORTS_PER_SOL)

        const id = connection.onAccountChange(
          publicKey,
          (info: AccountInfo<Uint8Array>) => {
            if (!cancelled) setBalance(info.lamports / LAMPORTS_PER_SOL)
          },
          'confirmed'
        )
        subRef.current = id
      } catch (e) {
        console.error('Failed to retrieve account info:', e)
      }
    }

    setup()

    return () => {
      cancelled = true
      if (subRef.current !== null) {
        connection.removeAccountChangeListener(subRef.current).catch(() => {})
        subRef.current = null
      }
    }
  }, [connection, publicKey, connected])

  if (connected && publicKey && balance === null) {
    return <Skeleton className={className ? className : 'h-8 w-32 rounded-md'} />
  }
  if (!connected || !publicKey) return null

  return (
    <div
      className={
        className ??
        'rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground'
      }
      title={publicKey.toBase58()}
    >
      Balance: {formatter.format(balance ?? 0)} SOL
    </div>
  )
}