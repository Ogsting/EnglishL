// 直连 Android WebView 的 DevTools，检查运行时状态（需要 adb forward）
const BASE = process.env.CDP || 'http://127.0.0.1:9333'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const list = await (await fetch(`${BASE}/json`)).json()
const page = list.find((t) => t.type === 'page')
console.log('attach:', page.url)

const ws = new WebSocket(page.webSocketDebuggerUrl)
let id = 0
const waiters = new Map()
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data)
  if (m.id && waiters.has(m.id)) {
    const { resolve, reject } = waiters.get(m.id)
    waiters.delete(m.id)
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result)
  }
})
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
const send = (method, params = {}) => {
  const mid = ++id
  ws.send(JSON.stringify({ id: mid, method, params }))
  return new Promise((resolve, reject) => waiters.set(mid, { resolve, reject }))
}
const evalJs = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) return 'EXC: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text)
  return r.result?.value
}

const diag = () =>
  evalJs(`JSON.stringify({
    native: window.Capacitor?.isNativePlatform?.(),
    hasApp: !!window.Capacitor?.Plugins?.App,
    hist: history.length,
    state: history.state,
    sheet: !!document.querySelector('.sheet'),
    closeBtn: !!document.querySelector('.sheet-close'),
    speech: typeof window.speechSynthesis !== 'undefined'
  })`)

console.log('初始:', await diag())

// 点齿轮
await evalJs(`document.querySelector('.icon-btn')?.click()`)
await sleep(800)
console.log('点齿轮后:', await diag())

// 点 ✕
await evalJs(`document.querySelector('.sheet-close')?.click()`)
await sleep(800)
console.log('点 ✕ 后:', await diag())

// 再开，然后模拟返回
await evalJs(`document.querySelector('.icon-btn')?.click()`)
await sleep(800)
console.log('再开后:', await diag())
await evalJs(`window.dispatchEvent(new Event('popstate'))`)

ws.close()
