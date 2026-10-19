import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

createApp(App).mount('#app')

if (import.meta.env.DEV && location.search.includes('demo')) {
  import('./dev/seed').then((m) => m.seedDemo())
}

// 原生壳（Capacitor）里已经自带本地文件加载，不需要 Service Worker，注册了反而容易拿到旧缓存
const isNativeShell = !!(window as any).Capacitor?.isNativePlatform?.()

if (!isNativeShell && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* 离线缓存不可用时静默降级 */
    })
  })
}
