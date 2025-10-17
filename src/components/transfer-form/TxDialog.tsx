import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'

export function TxDialog({ open, title, desc }: { open: boolean; title: string; desc?: string | null }) {
  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Spinner className="size-5" />
            <span>{title}</span>
          </DialogTitle>
          {desc ? <DialogDescription>{desc}</DialogDescription> : null}
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}

export default TxDialog