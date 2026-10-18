// 验证词库增量更新：?wordbase=/mock → 拉 version.json → patch-1.json → 合并进本地
const BASE = process.env.CDP || 'http://127.0.0.1:9222'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const targets = await (await fetch(`${BASE}/json`)).json()
const page = targets.find((t) => t.type === 'page')
if (!page) throw new Error('no page target')

const ws = new WebSocket(page.webSocketDebuggerUrl)
let id = 0
const pending = new Map()
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id)
    pending.delete(msg.id)
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result)
  }
})
await new Promise((r) => ws.addEventListener('open', r, { once: true }))

function send(method, params = {}) {
  const mid = ++id
  ws.send(JSON.stringify({ id: mid, method, params }))
  return new Promise((resolve, reject) => pending.set(mid, { resolve, reject }))
}
const evalJs = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
  return r.result?.value
}

await send('Runtime.enable')
await sleep(2500)

const before = await evalJs(`(() => { const s = JSON.parse(localStorage.getItem('englishl:state:v2')||'{}');
  return JSON.stringify({ version: s.wordsVersion ?? 'none' }); })()`)
console.log('更新前:', before)

// 触发一次：直接导航到带 wordbase 的地址，重新加载 App
await send('Page.enable')
await send('Page.navigate', { url: 'http://127.0.0.1:5173/?wordbase=/mock' })
await sleep(4000)

const after = await evalJs(`(() => { const s = JSON.parse(localStorage.getItem('englishl:state:v2')||'{}');
  const o = s.wordOverrides || {};
  return JSON.stringify({
    version: s.wordsVersion,
    added: (o.added||[]).map(w=>w.id),
    removed: o.removed||[],
    abandonCn: (o.updated||{}).abandon?.cn ?? null
  }); })()`)
console.log('更新后:', after)

const inPool = await evalJs(`(() => {
  const cards = [...document.querySelectorAll('.face.front .word, .face.back .word')].map(e=>e.textContent.trim());
  return JSON.stringify(cards);
})()`)
console.log('当前卡片:', inPool)

ws.close()
