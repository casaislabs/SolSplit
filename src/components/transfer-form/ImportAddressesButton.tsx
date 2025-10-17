import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export function ImportAddressesButton(props: {
  setRecipients: (updater: (prev: string[]) => string[]) => void
  base58Pattern: RegExp
  sending: boolean
  className?: string
}) {
  const { setRecipients, base58Pattern, sending, className } = props
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'paste' | 'file'>('paste')
  const [replaceMode, setReplaceMode] = useState<'append' | 'replace'>('append')
  const [text, setText] = useState('')
  const [fileContent, setFileContent] = useState<string>('')
  const [readingFile, setReadingFile] = useState(false)

  const onOpen = () => setOpen(true)
  const onClose = () => setOpen(false)

  const readFile = async (file: File | null) => {
    if (!file) return
    setReadingFile(true)
    const reader = new FileReader()
    reader.onload = () => {
      setFileContent(String(reader.result || ''))
      setReadingFile(false)
    }
    reader.onerror = () => {
      setReadingFile(false)
      toast.error('Failed to read file')
    }
    reader.readAsText(file)
  }

  // Automatic tokenization across any separators: extract base58-like chunks
  const tokenizePotentialAddresses = (raw: string) => {
    const normalized = raw.replace(/\r/g, '\n')
    return normalized
      .split(/[^1-9A-HJ-NP-Za-km-z]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
  }


  const parseAddresses = (raw: string) => {
    const tokens = tokenizePotentialAddresses(raw)
    const seen = new Set<string>()
    const valid: string[] = []
    let validCandidateCount = 0
    let invalidCount = 0
    for (const tok of tokens) {
      if (base58Pattern.test(tok)) {
        validCandidateCount++
        if (!seen.has(tok)) { seen.add(tok); valid.push(tok) }
      } else {
        invalidCount++
      }
    }
    const duplicateCount = validCandidateCount - valid.length
    return { valid, invalidCount, duplicateCount }
  }

  const onImport = () => {
    const raw = mode === 'paste' ? text : fileContent
    if (!raw || raw.trim().length === 0) {
      toast.info('Enter text or select a file first')
      return
    }
    const { valid, invalidCount, duplicateCount } = parseAddresses(raw)
    if (valid.length === 0) {
      toast.warning('No valid addresses found')
      return
    }

    setRecipients((prev) => {
      const existing = prev.filter((r) => r.trim().length > 0)
      const base = replaceMode === 'replace' ? [] : existing
      const mergedSet = new Set(base)
      for (const addr of valid) mergedSet.add(addr)
      const result = Array.from(mergedSet)
      if (result.length === 0) return ['']
      return result
    })

    const summary: string[] = []
    summary.push(`Imported ${valid.length} addresses`)
    if (invalidCount > 0) summary.push(`${invalidCount} invalid`)
    if (duplicateCount > 0) summary.push(`${duplicateCount} duplicates`) 
    toast.success(summary.join(' · '))

    setText('')
    setFileContent('')
    setOpen(false)
  }

  const contentEmpty = (mode === 'paste' ? text.trim().length === 0 : fileContent.trim().length === 0)
  const importDisabled = sending || readingFile || contentEmpty

  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={onOpen} disabled={sending} className={className}>
        Import addresses
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Import addresses</DialogTitle>
            <DialogDescription>Paste manually or upload a .txt file</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>Input mode</Label>
              <RadioGroup value={mode} onValueChange={(v) => setMode(v as 'paste' | 'file')} className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="paste" id="mode-paste" />
                  <Label htmlFor="mode-paste">Paste text</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="file" id="mode-file" />
                  <Label htmlFor="mode-file">Upload file</Label>
                </div>
              </RadioGroup>
            </div>

            {mode === 'paste' ? (
              <div className="space-y-2">
                <Label htmlFor="addresses">Addresses</Label>
                <Textarea
                  id="addresses"
                  placeholder="Paste addresses here"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full resize-y min-h-28 max-h-[40vh] overflow-auto"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="file">File (.txt)</Label>
                <Input
                  id="file"
                  type="file"
                  disabled={readingFile}
                  onChange={(e) => readFile(e.target.files?.[0] ?? null)}
                  accept=".txt,text/plain,.csv"
                />
              </div>
            )}

            {/* Automatic separator handling; no manual controls needed */}

            <div className="space-y-2">
              <Label>Import mode</Label>
              <RadioGroup
                value={replaceMode}
                onValueChange={(v) => setReplaceMode(v as 'append' | 'replace')}
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="append" id="mode-append" />
                  <Label htmlFor="mode-append">Append to existing</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="replace" id="mode-replace" />
                  <Label htmlFor="mode-replace">Replace existing</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="button" onClick={onImport} disabled={importDisabled}>
                Import
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default ImportAddressesButton