import { useState } from 'react'
import type { Connection, PublicKey, TransactionInstruction, AddressLookupTableAccount } from '@solana/web3.js'
import { VersionedTransaction, TransactionMessage } from '@solana/web3.js'
import type { SendTransactionOptions } from '@solana/wallet-adapter-base'

type SendTransactionFn = (
  tx: VersionedTransaction,
  connection: Connection,
  options?: SendTransactionOptions
) => Promise<string>

export function useTxnDialog(
  params: {
    connection: Connection,
    publicKey: PublicKey | null,
    connected: boolean,
    sendTransaction: SendTransactionFn,
  }
) {
  const { connection, publicKey, connected, sendTransaction } = params

  const [txDialogOpen, setTxDialogOpen] = useState(false)
  const [txDialogTitle, setTxDialogTitle] = useState('')
  const [txDialogDesc, setTxDialogDesc] = useState<string | null>(null)

  const sendAndConfirmInstructions = async (
    instructions: TransactionInstruction[],
    lookups?: AddressLookupTableAccount[],
    commitment: 'confirmed' | 'finalized' = 'confirmed',
  ) => {
    if (!connected || !publicKey) throw new Error('Wallet not connected')
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
    const message = new TransactionMessage({ payerKey: publicKey, recentBlockhash: blockhash, instructions }).compileToV0Message(lookups)
    const tx = new VersionedTransaction(message)
    const sig = await sendTransaction(tx, connection)
    await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, commitment)
    return sig
  }

  const sendAndConfirmWithDialog = async (
    instructions: TransactionInstruction[],
    lookups: AddressLookupTableAccount[] | undefined,
    title: string,
    description?: string,
    commitment: 'confirmed' | 'finalized' = 'confirmed',
  ) => {
    setTxDialogTitle(title)
    setTxDialogDesc(description ?? null)
    setTxDialogOpen(true)
    try {
      const sig = await sendAndConfirmInstructions(instructions, lookups, commitment)
      setTxDialogOpen(false)
      return sig
    } catch (err) {
      setTxDialogOpen(false)
      throw err
    }
  }

  return {
    txDialogOpen,
    txDialogTitle,
    txDialogDesc,
    setTxDialogOpen,
    setTxDialogTitle,
    setTxDialogDesc,
    sendAndConfirmInstructions,
    sendAndConfirmWithDialog,
  }
}