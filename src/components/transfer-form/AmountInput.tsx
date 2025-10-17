import { CoinsIcon } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

export function AmountInput(props: {
  amount: string,
  onChange: (v: string) => void,
  sending: boolean,
  isValidAmount: boolean,
}) {
  const { amount, onChange, sending, isValidAmount } = props
  return (
    <div className="rounded-xl p-[1px] bg-brand-gradient">
      <div className="glass-panel rounded-xl p-4 space-y-2">
        <Label htmlFor="amount" className="flex items-center gap-2">
          <CoinsIcon className="size-4 text-muted-foreground" /> Amount (SOL)
        </Label>
        <div className="relative">
          <CoinsIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            id="amount"
            type="number"
            step="0.000000001"
            min="0"
            value={amount}
            onChange={(e) => onChange(e.target.value)}
            placeholder="0.00"
            inputMode="decimal"
            aria-invalid={!isValidAmount}
            aria-describedby="amount-help"
            disabled={sending}
            className="pl-9"
          />
        </div>
        <p id="amount-help" className="text-xs text-muted-foreground">Use small amounts for testing on Devnet.</p>
      </div>
    </div>
  )
}