import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    tailwindcss(),
    // Polyfill Node built-ins (Buffer, process, etc.) for browser compatibility
    nodePolyfills({
      protocolImports: true,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Ensure 'buffer' resolves to the browser polyfill
      buffer: 'buffer',
    },
  },
  // Help Vite pre-bundle the buffer polyfill to avoid dev-time warnings
  optimizeDeps: {
    include: ['buffer', 'process'],
  },
  define: {
    // Some libs check process.env; provide a minimal shim
    'process.env': {},
  },
})
