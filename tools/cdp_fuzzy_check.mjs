// 验证长按 = 模糊
const BASE = process.env.CDP || 'http://127.0.0.1:9222'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const targets = await (await fetch(`${BASE}/json`)).json()
const page = targets.find((t) => t.type === 'page')
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
const DAY = 86400000

await send('Runtime.enable')
await sleep(1500)

const word = await evalJs(`document.querySelector('.face.front .word')?.textContent || ''`)
console.log('当前卡片:', word)

// 长按 700ms
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 260, y: 500, button: 'left', clickCount: 1 })
await sleep(700)
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 260, y: 500, button: 'left', clickCount: 1 })
await sleep(600)

console.log('长按后 | 模糊印章:', await evalJs(`!!document.querySelector('.stamp.fuzzy')`),
  '| 翻面:', await evalJs(`!!document.querySelector('.card.flipped')`))

// 点击结算
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 260, y: 500, button: 'left', clickCount: 1 })
await sleep(40)
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 260, y: 500, button: 'left', clickCount: 1 })
await sleep(1200)

const rec = await evalJs(`(() => { const s = JSON.parse(localStorage.getItem('englishl:state:v2')||'{}');
  const id = ${JSON.stringify('')} || Object.keys(s.srs||{})[0];
  const v = s.srs?.[id];
  return JSON.stringify({ id, intervalDays: v ? +(v.interval/${DAY}).toFixed(2) : null, mistakes: v?.mistakes,
    wrong: Object.keys(s.wrong||{}).length, today: Object.values(s.rank?.days||{}).map(d=>d.count) }); })()`)
console.log('结算后:', rec)

ws.close()
