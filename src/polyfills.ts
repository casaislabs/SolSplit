import { Buffer as BufferPolyfill } from 'buffer'
import processPolyfill from 'process'

type MutableGlobal = typeof globalThis & {
  Buffer?: typeof BufferPolyfill
  process?: unknown
}

const g = globalThis as MutableGlobal

// Provide globals expected by Node-targeted packages without redeclaring types
if (!g.Buffer) {
  g.Buffer = BufferPolyfill
}

if (!g.process) {
  g.process = processPolyfill
}