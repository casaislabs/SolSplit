import { useEffect, useState } from 'react'
import type { Connection, TransactionInstruction, AddressLookupTableAccount } from '@solana/web3.js'
import { AddressLookupTableProgram, PublicKey } from '@solana/web3.js'
import { readLastAlt, writeLastAlt, clearLastAlt } from '@/lib/altStorage'
import { toast } from 'sonner'

export function useAltLifecycle(params: {
  connection: Connection,
  publicKey: PublicKey | null,
  connected: boolean,
  sendAndConfirmWithDialog: (
    instructions: TransactionInstruction[],
    lookups: AddressLookupTableAccount[] | undefined,
    title: string,
    description?: string,
    commitment?: 'confirmed' | 'finalized',
  ) => Promise<string>,
}) {
  const { connection, publicKey, connected, sendAndConfirmWithDialog } = params

  const [pendingAlt, setPendingAlt] = useState<PublicKey | null>(null)
  const [altClosable, setAltClosable] = useState(false)
  const [altRemainingSlots, setAltRemainingSlots] = useState<number | null>(null)
  const [closingAlt, setClosingAlt] = useState(false)

  const exitAltCloseMode = () => {
    clearLastAlt()
    setPendingAlt(null)
    setAltClosable(false)
    setAltRemainingSlots(null)
  }

  const enterCloseMode = (altAddress: PublicKey) => {
    setPendingAlt(altAddress)
  }

  // Restore ALT record when wallet changes
  useEffect(() => {
    const rec = readLastAlt()
    const currentWallet = publicKey?.toBase58()
    if (!currentWallet) {
      exitAltCloseMode()
      return
    }
    if (rec?.address && rec.walletPubkey === currentWallet) {
      try { setPendingAlt(new PublicKey(rec.address)) } catch {
        console.debug('Failed to restore saved ALT address (ignored)')
      }
    } else if (rec?.address) {
      clearLastAlt()
      exitAltCloseMode()
      toast.info('Saved ALT belongs to another wallet. Storage cleared.')
    }
  }, [publicKey])

  // Monitor pending ALT for closability and remaining slots
  useEffect(() => {
    if (!pendingAlt) return
    let cancelled = false
    const slotBuffer = 512
    const check = async () => {
      try {
        const { value: altAccount } = await connection.getAddressLookupTable(pendingAlt)
        if (!altAccount) {
          if (!cancelled) exitAltCloseMode()
          return
        }
        const deactSlotBigInt = altAccount.state?.deactivationSlot
        const deactivationSlot = typeof deactSlotBigInt === 'bigint' ? Number(deactSlotBigInt) : 0
        const currentSlot = await connection.getSlot()
        const remaining = Number.isFinite(deactivationSlot) && deactivationSlot > 0
          ? Math.max(0, slotBuffer - (currentSlot - deactivationSlot))
          : slotBuffer
        if (!cancelled) {
          setAltRemainingSlots(remaining)
          setAltClosable(remaining <= 0)
          writeLastAlt({ address: pendingAlt.toBase58(), walletPubkey: publicKey?.toBase58(), deactivationSlot })
        }
      } catch {
        if (!cancelled) setAltClosable(false)
      }
    }
    const id = setInterval(() => { void check() }, 1000)
    void check()
    return () => { cancelled = true; clearInterval(id) }
  }, [pendingAlt, connection, publicKey])

  const closeAltNow = async () => {
    if (!pendingAlt || !connected || !publicKey) return
    try {
      setClosingAlt(true)
      await sendAndConfirmWithDialog([
        AddressLookupTableProgram.closeLookupTable({ authority: publicKey!, lookupTable: pendingAlt, recipient: publicKey! }),
      ], undefined, 'Confirm transaction to close ALT', 'Close ALT and reclaim rent', 'finalized')
      toast.success('ALT closed; rent returned to your wallet')
      exitAltCloseMode()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ALT cannot be closed yet. Please try again later.'
      toast.error(msg)
    } finally {
      setClosingAlt(false)
    }
  }

  return {
    pendingAlt,
    altClosable,
    altRemainingSlots,
    closingAlt,
    enterCloseMode,
    exitAltCloseMode,
    closeAltNow,
  }
}