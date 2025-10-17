import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2Icon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PublicKey } from '@solana/web3.js'

export function AltClosePanel(props: {
  pendingAlt: PublicKey,
  altClosable: boolean,
  altRemainingSlots: number | null,
  closingAlt: boolean,
  onClose: () => void,
  className?: string,
}) {
  const { pendingAlt, altClosable, altRemainingSlots, closingAlt, onClose, className } = props
  const shortAlt = pendingAlt.toBase58().slice(0, 6) + '…'
  return (
    <div className={cn('space-y-6', className)}>
      <div className="rounded-xl p-[1px] bg-brand-gradient">
        <div className="glass-panel rounded-xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant="secondary">Devnet</Badge>
            <span className="text-xs text-muted-foreground">ALT: {shortAlt}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {altClosable
              ? 'ALT is ready to be closed. Press the button to reclaim rent.'
              : `ALT in cool-down. ~${altRemainingSlots ?? '…'} slots remaining until it can be closed.`}
          </p>
          <div className="flex items-center justify-end">
            <Button
              type="button"
              variant="default"
              size="lg"
              className={cn('btn-wallet-brand rounded-full px-8 h-11')}
              disabled={!altClosable || closingAlt}
              onClick={onClose}
            >
              {closingAlt ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" /> Closing ALT…
                </>
              ) : (
                <>Close ALT</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}