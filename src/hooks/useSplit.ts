import { useMemo } from 'react'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { toast } from 'sonner'

export function useSplit(params: {
  recipients: string[],
  percentages: string[],
  amount: string,
  splitMode: 'equal' | 'custom',
  setPercentages: (updater: (prev: string[]) => string[]) => void,
}) {
  const { recipients, percentages, amount, splitMode, setPercentages } = params

  const base58Pattern = useMemo(() => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
    [])

  const recipientFormatsValid = useMemo(
    () => recipients.map(r => base58Pattern.test(r.trim())),
    [recipients, base58Pattern]
  )

  const includedRecipients = useMemo(
    () => recipients.map(r => r.trim()).filter(r => r.length > 0),
    [recipients]
  )

  const recipientCount = includedRecipients.length

  const isValidAmount = useMemo(() => {
    const n = Number(amount)
    return !Number.isNaN(n) && n > 0
  }, [amount])

  const totalLamportsPreview = useMemo(
    () => Math.round((Number(amount) || 0) * LAMPORTS_PER_SOL),
    [amount]
  )

  const perRecipientLamportsPreview = recipientCount > 0
    ? Math.floor(totalLamportsPreview / recipientCount)
    : 0

  const remainderPreview = recipientCount > 0
    ? totalLamportsPreview - perRecipientLamportsPreview * recipientCount
    : 0

  const includedIndices = useMemo(
    () => recipients.map((r, i) => (r.trim().length > 0 ? i : -1)).filter((i) => i !== -1),
    [recipients]
  )

  const percentValues = useMemo(
    () => includedIndices.map((i) => parseFloat(percentages[i] || '')),
    [includedIndices, percentages]
  )

  const percentFilled = useMemo(
    () => percentValues.length === recipientCount && percentValues.every((v) => Number.isFinite(v)),
    [percentValues, recipientCount]
  )

  const percentRangeValid = useMemo(
    () => percentValues.every((v) => v >= 0 && v <= 100),
    [percentValues]
  )

  const percentTotal = useMemo(
    () => percentValues.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0),
    [percentValues]
  )

  const percentsValid = splitMode === 'equal'
    ? true
    : (percentFilled && percentRangeValid && Math.abs(percentTotal - 100) < 1e-4)

  const autoFillMissingPercents = () => {
    const indices = recipients.map((r, i) => (r.trim().length > 0 ? i : -1)).filter((i) => i !== -1)
    const numeric = indices.map((i) => parseFloat(percentages[i] || ''))
    const blanks = indices.filter((_, idx) => !Number.isFinite(numeric[idx]))
    const fixedSum = numeric.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0)
    const remaining = 100 - fixedSum

    if (blanks.length === 0) {
      toast.info('Nothing to auto-fill')
      return
    }
    if (remaining < 0) {
      toast.error('Manual percentages exceed 100%')
      return
    }

    const cents = Math.round(remaining * 100)
    const base = Math.floor(cents / blanks.length)
    const extra = cents - base * blanks.length

    setPercentages((prev) => {
      const next = [...prev]
      blanks.forEach((i, idx) => {
        const shareCents = base + (idx < extra ? 1 : 0)
        next[i] = (shareCents / 100).toFixed(2)
      })
      return next
    })
  }

  return {
    // validation & parsing
    base58Pattern,
    recipientFormatsValid,
    includedRecipients,
    recipientCount,
    isValidAmount,
    // previews
    totalLamportsPreview,
    perRecipientLamportsPreview,
    remainderPreview,
    // percentages
    includedIndices,
    percentValues,
    percentFilled,
    percentRangeValid,
    percentTotal,
    percentsValid,
    autoFillMissingPercents,
  }
}