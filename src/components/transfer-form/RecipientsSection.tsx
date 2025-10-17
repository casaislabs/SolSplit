import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { WalletIcon, PlusIcon } from 'lucide-react'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { RecipientRow } from './RecipientRow'
import ImportAddressesButton from '@/components/transfer-form/ImportAddressesButton'

export function RecipientsSection(props: {
  recipients: string[],
  setRecipients: (updater: (prev: string[]) => string[]) => void,
  percentages: string[],
  setPercentages: (updater: (prev: string[]) => string[]) => void,
  splitMode: 'equal' | 'custom',
  setSplitMode: (mode: 'equal' | 'custom') => void,
  autoFillMissingPercents: () => void,
  sending: boolean,
  base58Pattern: RegExp,
  recipientFormatsValid: boolean[],
  percentTotal: number,
  recipientCount: number,
  perRecipientLamportsPreview: number,
  remainderPreview: number,
  amount: string,
}) {
  const {
    recipients,
    setRecipients,
    percentages,
    setPercentages,
    splitMode,
    setSplitMode,
    autoFillMissingPercents,
    sending,
    base58Pattern,
    recipientFormatsValid,
    percentTotal,
    recipientCount,
    perRecipientLamportsPreview,
    remainderPreview,
    amount,
  } = props

  return (
    <div className="rounded-xl p-[1px] bg-brand-gradient">
      <div className="glass-panel rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="recipient-0" className="flex items-center gap-2">
            <WalletIcon className="size-4 text-muted-foreground" /> Recipient addresses
          </Label>
          <div className="flex items-center gap-1">
            <ImportAddressesButton
              setRecipients={setRecipients}
              base58Pattern={base58Pattern}
              sending={sending}
            />
            <Button
              type="button"
              size="sm"
              variant={splitMode === 'equal' ? 'default' : 'outline'}
              onClick={() => setSplitMode('equal')}
              disabled={sending}
              className="rounded-full"
            >
              Equal
            </Button>
            <Button
              type="button"
              size="sm"
              variant={splitMode === 'custom' ? 'default' : 'outline'}
              onClick={() => setSplitMode('custom')}
              disabled={sending}
              className="rounded-full"
            >
              Custom
            </Button>
            {splitMode === 'custom' && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={autoFillMissingPercents}
                disabled={sending}
                className="rounded-full"
              >
                Auto-fill
              </Button>
            )}
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => { setRecipients((prev) => [...prev, '']); setPercentages((prev) => [...prev, '']) }}
            disabled={sending}
            className="rounded-full"
          >
            <PlusIcon className="size-3 mr-1" /> Add
          </Button>
        </div>

        <div className="space-y-2">
          {recipients.map((value, idx) => (
            <RecipientRow
              key={idx}
              idx={idx}
              value={value}
              onChange={(next) => setRecipients(prev => { const n = [...prev]; n[idx] = next; return n })}
              splitMode={splitMode}
              percentValue={percentages[idx] || ''}
              onPercentChange={(next) => setPercentages(prev => { const n = [...prev]; n[idx] = next; return n })}
              base58Pattern={base58Pattern}
              isFormatValid={recipientFormatsValid[idx]}
              disabled={sending}
              onRemove={() => { setRecipients(prev => prev.filter((_, i) => i !== idx)); setPercentages(prev => prev.filter((_, i) => i !== idx)); }}
              showRemove={recipients.length > 1}
            />
          ))}
        </div>

        <div className="text-xs text-muted-foreground">
          {splitMode === 'custom' ? (
            <span>
              Percentages must sum to 100%. Current total: {Number.isFinite(percentTotal) ? percentTotal.toFixed(2) : '0'}%.
            </span>
          ) : recipientCount > 0 && perRecipientLamportsPreview > 0 ? (
            <span>
              Send {amount || '0'} SOL split between {recipientCount} addresses: {perRecipientLamportsPreview / LAMPORTS_PER_SOL} SOL per address{remainderPreview ? `, +${remainderPreview} lamports distributed` : ''}.
            </span>
          ) : (
            <span>The amount will be split equally across all valid addresses.</span>
          )}
        </div>
      </div>
    </div>
  )
}