export const STORAGE_KEY = 'solsplit:lastAlt'

export type LastAltRecord = { address: string; walletPubkey?: string; deactivationSlot?: number }

export const readLastAlt = (): LastAltRecord | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const obj = JSON.parse(raw)
    const address = obj?.address ? String(obj.address) : null
    const walletPubkey = obj?.walletPubkey ? String(obj.walletPubkey) : undefined
    const slot = obj?.deactivationSlot
    if (!address) return null
    const deactivationSlot = Number(slot)
    return { address, walletPubkey, deactivationSlot: Number.isFinite(deactivationSlot) ? deactivationSlot : undefined }
  } catch {
    return null
  }
}

export const writeLastAlt = (rec: LastAltRecord) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(rec)) } catch {
    console.debug('Failed to persist ALT record (ignored)')
  }
}

export const clearLastAlt = () => {
  try { localStorage.removeItem(STORAGE_KEY) } catch {
    console.debug('Failed to clear ALT record (ignored)')
  }
}