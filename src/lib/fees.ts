import type { Connection, AddressLookupTableAccount, TransactionInstruction, PublicKey } from '@solana/web3.js'
import { TransactionMessage } from '@solana/web3.js'
import { toast } from 'sonner'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'

export const fmtSol = (n: number) => (n / LAMPORTS_PER_SOL).toFixed(9)

export const estimateFeeLamports = async (
  connection: Connection,
  payerKey: PublicKey,
  instructions: TransactionInstruction[],
  lookups?: AddressLookupTableAccount[],
): Promise<number> => {
  try {
    const { blockhash } = await connection.getLatestBlockhash()
    const msg = new TransactionMessage({
      payerKey,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message(lookups)
    const info = await connection.getFeeForMessage(msg)
    return Number(info?.value ?? 0)
  } catch {
    console.debug('Fee estimation failed (oversized message or RPC limit). Using fallback.')
    // Robust fallback: estimate fee using a single no-op transfer to self.
    // Fees on Solana are per signature, so this provides a safe approximation
    // without constructing a large message.
    try {
      const { blockhash } = await connection.getLatestBlockhash()
      // Minimal message (no instructions) to approximate per-signature fee
      const msg = new TransactionMessage({ payerKey, recentBlockhash: blockhash, instructions: [] }).compileToV0Message()
      const info = await connection.getFeeForMessage(msg)
      return Number(info?.value ?? 0)
    } catch {
      console.debug('Fee estimation fallback failed; using conservative default.')
      return 5000
    }
  }
}

export const assertBalanceOrToast = async (
  connection: Connection,
  payerKey: PublicKey,
  amountLamports: number,
  feeLamports: number,
  contextLabel: string,
): Promise<boolean> => {
  try {
    const available = await connection.getBalance(payerKey)
    const required = amountLamports + feeLamports
    if (available < required) {
      const shortfall = required - available
      toast.error(
        `Insufficient balance ${contextLabel}. Required ${fmtSol(required)} SOL (amount ${fmtSol(amountLamports)} + fees ${fmtSol(feeLamports)}), available ${fmtSol(available)} SOL. Missing ${fmtSol(shortfall)} SOL.`
      )
      return false
    }
    return true
  } catch (e) {
    console.warn('Balance check error:', e)
    toast.info('Preflight balance check skipped due to network error; continuing.')
    return true
  }
}