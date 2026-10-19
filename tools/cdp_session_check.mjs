// 验证：切 Tab / 刷新（模拟重启）后卡片不变
const BASE = process.env.CDP || 'http://127.0.0.1:9222'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const list = await (await fetch(`${BASE}/json`)).json()
const page = list.find((t) => t.type === 'page')
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
  return r.result?.value
}
const word = () => evalJs(`document.querySelector('.face.front .word')?.textContent || '(无)'`)
const tab = (i) => evalJs(`document.querySelectorAll('.tabbar .tab')[${i}]?.click()`)

await send('Runtime.enable')
await send('Page.enable')
await sleep(2000)

const w0 = await word()
console.log('① 初始卡片:', w0)

await tab(2) // 错题本
await sleep(600)
await tab(0) // 回首页
await sleep(600)
const w1 = await word()
console.log('② 去错题本再回来:', w1, '| 相同:', w0 === w1)

await send('Page.reload')
await sleep(2500)
const w2 = await word()
console.log('③ 刷新页面（模拟重启）:', w2, '| 相同:', w0 === w2)

const sess = await evalJs(`(() => { const s = JSON.parse(localStorage.getItem('englishl:state:v2')||'{}');
  const h = s.session?.home; return JSON.stringify({ len: h?.queue?.length, idx: h?.idx, side: h?.side }); })()`)
console.log('④ 会话已持久化:', sess)

ws.close()
