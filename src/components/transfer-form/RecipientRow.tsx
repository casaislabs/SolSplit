import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { WalletIcon, PercentIcon, XIcon } from 'lucide-react'

export function RecipientRow(props: {
  idx: number,
  value: string,
  onChange: (next: string) => void,
  splitMode: 'equal' | 'custom',
  percentValue?: string,
  onPercentChange?: (next: string) => void,
  base58Pattern: RegExp,
  isFormatValid: boolean,
  disabled: boolean,
  onRemove?: () => void,
  showRemove: boolean,
}) {
  const { idx, value, onChange, splitMode, percentValue, onPercentChange, base58Pattern, isFormatValid, disabled, onRemove, showRemove } = props
  return (
    <div className="flex items-center gap-2">
      <div className="relative grow">
        <WalletIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          id={`recipient-${idx}`}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter Solana address #${idx + 1}`}
          autoComplete="off"
          spellCheck={false}
          inputMode="text"
          pattern={base58Pattern.source}
          maxLength={44}
          aria-invalid={value.trim().length > 0 && !isFormatValid}
          className="pl-9"
          disabled={disabled}
        />
      </div>
      {splitMode === 'custom' && (
        <div className="relative w-24">
          <Input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={percentValue || ''}
            onChange={(e) => onPercentChange && onPercentChange(e.target.value)}
            placeholder="%"
            className="pr-6"
            disabled={disabled}
          />
          <PercentIcon className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
        </div>
      )}
      {showRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          disabled={disabled}
          aria-label={`Remove address ${idx + 1}`}
        >
          <XIcon className="size-4" />
        </Button>
      )}
    </div>
  )
}