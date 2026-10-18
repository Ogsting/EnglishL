import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: './',
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true,
      interval: 250,
      ignored: ['**/research/**', '**/docs/**', '**/dist/**', '**/.git/**', '**/shots/**', '**/*.tmpdir/**']
    }
  }
})
