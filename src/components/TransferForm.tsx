import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL, TransactionInstruction, AddressLookupTableProgram, AddressLookupTableAccount } from '@solana/web3.js'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import TxDialog from '@/components/transfer-form/TxDialog'
import { writeLastAlt } from '@/lib/altStorage'
import { estimateFeeLamports, assertBalanceOrToast } from '@/lib/fees'
import { Loader2Icon, SendIcon } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useTxnDialog } from '@/hooks/useTxnDialog'
import { useSplit } from '@/hooks/useSplit'
import { useAltLifecycle } from '@/hooks/useAltLifecycle'
import { AmountInput } from '@/components/transfer-form/AmountInput'
import { RecipientsSection } from '@/components/transfer-form/RecipientsSection'
import { AltClosePanel } from '@/components/transfer-form/AltClosePanel'

export function TransferForm({ className }: { className?: string }) {
  const { connection } = useConnection()
  const { publicKey, connected, sendTransaction } = useWallet()
  const [recipients, setRecipients] = useState<string[]>([''])
  const [percentages, setPercentages] = useState<string[]>([''])
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal')
  const [amount, setAmount] = useState('')
  const [sending, setSending] = useState(false)
  const {
    txDialogOpen,
    txDialogTitle,
    txDialogDesc,
    sendAndConfirmWithDialog,
  } = useTxnDialog({ connection, publicKey, connected, sendTransaction })
  const {
    base58Pattern,
    recipientFormatsValid,
    recipientCount,
    isValidAmount,
    perRecipientLamportsPreview,
    remainderPreview,
    percentTotal,
    percentsValid,
    autoFillMissingPercents,
  } = useSplit({ recipients, percentages, amount, splitMode, setPercentages })
  const {
    pendingAlt,
    altClosable,
    altRemainingSlots,
    closingAlt,
    enterCloseMode,
    closeAltNow,
  } = useAltLifecycle({ connection, publicKey, connected, sendAndConfirmWithDialog })




  // Fee helpers are imported from '@/lib/fees'

  // Tx 1: Create a fresh (empty) ALT — no extend
  const createTempALT = async (): Promise<PublicKey> => {
    if (!connected || !publicKey) throw new Error('Connect your wallet first')
    const slot = await connection.getSlot()
    const [createIx, lookupTable] = AddressLookupTableProgram.createLookupTable({
      authority: publicKey,
      payer: publicKey,
      recentSlot: slot,
    })
    await sendAndConfirmWithDialog([createIx], undefined, 'Confirm transaction to create ALT', 'A temporary ALT will be created to optimize the send.')
    toast.success(`ALT created: ${lookupTable.toBase58().slice(0,6)}…`)
    return lookupTable
  }

  // No separate extend UI: we extend when creating the temporary ALT per send

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!connected || !publicKey) {
      toast.error('Connect your wallet first')
      return
    }

    const trimmedRecipients = recipients.map((r) => r.trim()).filter((r) => r.length > 0)
    if (trimmedRecipients.length === 0) {
      toast.error('Enter at least one recipient address')
      return
    }

    // Prevent sending to own address
    const ownAddress = publicKey.toBase58()
    if (trimmedRecipients.includes(ownAddress)) {
      toast.error("You can't send to your own address")
      return
    }

    // Detect duplicates
    const uniqueCount = new Set(trimmedRecipients).size
    if (uniqueCount !== trimmedRecipients.length) {
      toast.error('Duplicate recipient addresses are not allowed')
      return
    }

    let toPks: PublicKey[] = []
    try {
      toPks = trimmedRecipients.map((r) => new PublicKey(r))
    } catch {
      toast.error('One or more recipient addresses are invalid')
      return
    }

    if (!isValidAmount) {
      toast.error('Enter a valid amount')
      return
    }

    const totalLamports = Math.round(Number(amount) * LAMPORTS_PER_SOL)
    if (totalLamports <= 0) {
      toast.error('Amount must be greater than 0')
      return
    }

    let lamportsPerRecipient: number[] = []
    if (splitMode === 'equal') {
      const perRecipient = Math.floor(totalLamports / toPks.length)
      const remainder = totalLamports - perRecipient * toPks.length
      if (perRecipient <= 0) {
        toast.error('Amount too small to split between recipients')
        return
      }
      lamportsPerRecipient = toPks.map((_, idx) => perRecipient + (idx < remainder ? 1 : 0))
    } else {
      const indices = recipients.map((r, i) => (r.trim().length > 0 ? i : -1)).filter((i) => i !== -1)
      const percents = indices.map((i) => parseFloat(percentages[i] || ''))
      const filled = percents.every((v) => Number.isFinite(v))
      const rangeOk = percents.every((v) => v >= 0 && v <= 100)
      const totalPct = percents.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0)
      if (!(filled && rangeOk && Math.abs(totalPct - 100) < 1e-4)) {
        toast.error('Enter a valid percentage for each recipient; total must be 100%')
        return
      }
      const reals = percents.map((p) => totalLamports * (p / 100))
      const floors = reals.map((a) => Math.floor(a))
      const sumFloors = floors.reduce((a, b) => a + b, 0)
      const remainder = totalLamports - sumFloors
      const order = reals
        .map((a, idx) => ({ idx, frac: a - Math.floor(a) }))
        .sort((a, b) => b.frac - a.frac)
      for (let i = 0; i < remainder; i++) {
        floors[order[i].idx] += 1
      }
      lamportsPerRecipient = floors
    }

    try {
      setSending(true)
      // Precompute unique recipient keys before ALT ops
      const uniqueRecipientKeys = Array.from(new Set(toPks.map((pk) => pk.toBase58())))
        .map((s) => new PublicKey(s))
        .filter((pk) => pk.toBase58() !== publicKey!.toBase58())
      const CHUNK_SIZE = 30
      const totalChunks = Math.ceil(uniqueRecipientKeys.length / CHUNK_SIZE)
      const TRANSFER_CHUNK_SIZE = 55

      // Aggregated preflight: estimate fees for all planned transactions
      // (ALT create, ALT extend chunks, transfer, ALT deactivate)
      try {
        // Preview ALT address for fee estimation (does not submit)
        const previewSlot = await connection.getSlot()
        const [createIx, previewAltAddress] = AddressLookupTableProgram.createLookupTable({
          authority: publicKey!,
          payer: publicKey!,
          recentSlot: previewSlot,
        })
        const createFee = await estimateFeeLamports(connection, publicKey!, [createIx])

        // Extend fees (sum across chunks)
        let extendFees = 0
        for (let i = 0; i < uniqueRecipientKeys.length; i += CHUNK_SIZE) {
          const chunk = uniqueRecipientKeys.slice(i, i + CHUNK_SIZE)
          if (chunk.length === 0) continue
          const extendIx = AddressLookupTableProgram.extendLookupTable({
            authority: publicKey!,
            payer: publicKey!,
            lookupTable: previewAltAddress,
            addresses: chunk,
          })
          extendFees += await estimateFeeLamports(connection, publicKey!, [extendIx])
        }

        // Transfer fees (sum across chunks to avoid oversized messages)
        let transferFees = 0
        for (let i = 0; i < toPks.length; i += TRANSFER_CHUNK_SIZE) {
          const chunkIxs: TransactionInstruction[] = []
          for (let j = i; j < Math.min(i + TRANSFER_CHUNK_SIZE, toPks.length); j++) {
            const lamports = lamportsPerRecipient[j]
            if (lamports > 0) {
              chunkIxs.push(
                SystemProgram.transfer({ fromPubkey: publicKey!, toPubkey: toPks[j], lamports })
              )
            }
          }
          if (chunkIxs.length > 0) {
            transferFees += await estimateFeeLamports(connection, publicKey!, chunkIxs)
          }
        }

        // Deactivate fee
        const deactivateIx = AddressLookupTableProgram.deactivateLookupTable({ authority: publicKey!, lookupTable: previewAltAddress })
        const deactivateFee = await estimateFeeLamports(connection, publicKey!, [deactivateIx])

        const totalFees = createFee + extendFees + transferFees + deactivateFee
        const ok = await assertBalanceOrToast(connection, publicKey!, totalLamports, totalFees, 'for full flow')
        if (!ok) { setSending(false); return }
      } catch (e) {
        console.warn('Aggregated fee estimation failed, proceeding with best-effort checks:', e)
      }
      // 1) Create a fresh ALT (first signature)
      const altAddress = await createTempALT()
      // 1.5) Extend ALT with recipient addresses (may require multiple chunks)
      for (let i = 0; i < uniqueRecipientKeys.length; i += CHUNK_SIZE) {
        const chunk = uniqueRecipientKeys.slice(i, i + CHUNK_SIZE)
        if (chunk.length === 0) continue
        const extendIx = AddressLookupTableProgram.extendLookupTable({
          authority: publicKey!,
          payer: publicKey!,
          lookupTable: altAddress,
          addresses: chunk,
        })

        // Chunk preflight: estimate only the extend fee to avoid oversize
        try {
          const chunkFee = await estimateFeeLamports(connection, publicKey!, [extendIx])
          const ok = await assertBalanceOrToast(connection, publicKey!, 0, chunkFee, `for ALT extension chunk (${Math.floor(i / CHUNK_SIZE) + 1}/${totalChunks})`)
          if (!ok) { setSending(false); return }
        } catch (e) {
          console.warn('Chunk preflight fee estimation failed; continuing to signing:', e)
        }

        await sendAndConfirmWithDialog(
          [extendIx],
          undefined,
          `Confirm transaction to extend ALT (${Math.floor(i / CHUNK_SIZE) + 1}/${totalChunks})`,
          `Adding ${chunk.length} addresses to ALT`,
        )
      }
      if (uniqueRecipientKeys.length > 0) {
        toast.success(`ALT extended with ${uniqueRecipientKeys.length} addresses`)
      }
      // Prepare ALT account for lookups
      // Look up the ALT for compile
      let lookupAccounts: AddressLookupTableAccount[] | undefined
      {
        const { value: altAccount } = await connection.getAddressLookupTable(altAddress)
        if (altAccount) lookupAccounts = [altAccount]
      }
      // Preflight: estimate fees for remaining steps (chunked transfers + deactivate)
      try {
        let feeLamports = 0
        for (let i = 0; i < toPks.length; i += TRANSFER_CHUNK_SIZE) {
          const chunkIxs: TransactionInstruction[] = []
          for (let j = i; j < Math.min(i + TRANSFER_CHUNK_SIZE, toPks.length); j++) {
            const lamports = lamportsPerRecipient[j]
            if (lamports > 0) {
              chunkIxs.push(
                SystemProgram.transfer({ fromPubkey: publicKey!, toPubkey: toPks[j], lamports })
              )
            }
          }
          if (chunkIxs.length > 0) {
            feeLamports += await estimateFeeLamports(connection, publicKey!, chunkIxs, lookupAccounts)
          }
        }
        const deactivateIx = AddressLookupTableProgram.deactivateLookupTable({ authority: publicKey!, lookupTable: altAddress })
        const deactivateFee = await estimateFeeLamports(connection, publicKey!, [deactivateIx], lookupAccounts)
        const ok = await assertBalanceOrToast(connection, publicKey!, totalLamports, feeLamports + deactivateFee, 'for transfer + deactivate')
        if (!ok) { setSending(false); return }
      } catch (e) {
        console.warn('Fee estimation failed, proceeding without preflight check:', e)
      }
      // 2) Transfers using the ALT (multiple signatures; chunked)
      const shortCount = lamportsPerRecipient.filter((l) => l > 0).length
      const totalTransferChunks = Math.ceil(toPks.length / TRANSFER_CHUNK_SIZE)
      for (let i = 0; i < toPks.length; i += TRANSFER_CHUNK_SIZE) {
        const chunkIxs: TransactionInstruction[] = []
        let chunkRecipientCount = 0
        for (let j = i; j < Math.min(i + TRANSFER_CHUNK_SIZE, toPks.length); j++) {
          const lamports = lamportsPerRecipient[j]
          if (lamports > 0) {
            chunkIxs.push(
              SystemProgram.transfer({ fromPubkey: publicKey!, toPubkey: toPks[j], lamports })
            )
            chunkRecipientCount++
          }
        }
        if (chunkIxs.length === 0) continue
        await sendAndConfirmWithDialog(
          chunkIxs,
          lookupAccounts,
          `Confirm transaction to send SOL (${Math.floor(i / TRANSFER_CHUNK_SIZE) + 1}/${totalTransferChunks})`,
          `Sending to ${chunkRecipientCount} recipients`,
          'finalized',
        )
      }
      toast.success(`Sent ${amount} SOL split across ${shortCount} recipients in ${Math.ceil(toPks.length / TRANSFER_CHUNK_SIZE)} transactions`)
      // 3) Deactivate ALT (third signature)
      await sendAndConfirmWithDialog([
        AddressLookupTableProgram.deactivateLookupTable({ authority: publicKey!, lookupTable: altAddress })
      ], undefined, 'Confirm transaction to deactivate ALT', 'The temporary ALT will be deactivated.', 'confirmed')
      toast.success('ALT deactivated. You can close it after the cool-down.')
      // Persist ALT immediately after deactivation to support reloads
      try {
        const { value: altAccAfterDeact } = await connection.getAddressLookupTable(altAddress)
        const deactSlotBigInt = altAccAfterDeact?.state?.deactivationSlot
        const deactivationSlot = typeof deactSlotBigInt === 'bigint' ? Number(deactSlotBigInt) : 0
        writeLastAlt({ address: altAddress.toBase58(), walletPubkey: publicKey!.toBase58(), deactivationSlot: Number.isFinite(deactivationSlot) && deactivationSlot > 0 ? deactivationSlot : undefined })
      } catch {
        console.debug('Persisting ALT deactivation slot failed (ignored)')
      }
      // Enter manual close mode: hide form and show ALT close button
      enterCloseMode(altAddress)
      setSending(false)
      setAmount('')
      setRecipients([''])
      setPercentages([''])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err ?? '')
      let code: number | undefined
      let name: string | undefined
      if (typeof err === 'object' && err !== null) {
        const rec = err as Record<string, unknown>
        if (typeof rec.code === 'number') code = rec.code
        if (typeof rec.name === 'string') name = rec.name
      }
      const isUserRejected = /user\s*rejected/i.test(msg) || /rejected\s*by\s*user/i.test(msg) || code === 4001 || name === 'WalletSignTransactionError'
      if (isUserRejected) {
        console.info('User rejected signing')
      } else {
        console.error('Transfer failed:', err)
        toast.error(msg || 'Transfer failed')
      }
    } finally {
      setSending(false)
    }
  }

  // ALT lifecycle (restore, monitor, close) is handled by useAltLifecycle

  if (pendingAlt) {
    // ALT close view: hide form and show button until success
    return (
      <>
        <TxDialog open={txDialogOpen} title={txDialogTitle} desc={txDialogDesc} />
        <AltClosePanel
          pendingAlt={pendingAlt}
          altClosable={altClosable}
          altRemainingSlots={altRemainingSlots}
          closingAlt={closingAlt}
          onClose={closeAltNow}
          className={className}
        />
      </>
    )
  }

  return (
    <>
      <TxDialog open={txDialogOpen} title={txDialogTitle} desc={txDialogDesc} />
      <form onSubmit={onSubmit} className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Devnet</Badge>
          <span className="text-xs text-muted-foreground">Use for testing only</span>
        </div>
      </div>

      <div className="space-y-4">
        <AmountInput
          amount={amount}
          onChange={setAmount}
          sending={sending}
          isValidAmount={isValidAmount}
        />
        <RecipientsSection
          recipients={recipients}
          setRecipients={(updater) => setRecipients(updater)}
          percentages={percentages}
          setPercentages={(updater) => setPercentages(updater)}
          splitMode={splitMode}
          setSplitMode={setSplitMode}
          autoFillMissingPercents={autoFillMissingPercents}
          sending={sending}
          base58Pattern={base58Pattern}
          recipientFormatsValid={recipientFormatsValid}
          percentTotal={percentTotal}
          recipientCount={recipientCount}
          perRecipientLamportsPreview={perRecipientLamportsPreview}
          remainderPreview={remainderPreview}
          amount={amount}
        />
      </div>

      <div className="flex items-center justify-end">
        <Button
          type="submit"
          variant="default"
          className={cn('btn-wallet-brand rounded-full px-8 h-11')}
          disabled={!connected || sending || (splitMode === 'custom' && !percentsValid)}
        >
          {sending ? (
            <>
              <Loader2Icon className="size-4 animate-spin" /> Sending…
            </>
          ) : (
            <>
              <SendIcon className="size-4" /> Send SOL
            </>
          )}
        </Button>
      </div>

      {/* Explorer link removed per request */}
      </form>
    </>
  )
}

export default TransferForm
