import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

createApp(App).mount('#app')

if (import.meta.env.DEV && location.search.includes('demo')) {
  import('./dev/seed').then((m) => m.seedDemo())
}

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* 离线缓存不可用时静默降级 */
    })
  })
}
