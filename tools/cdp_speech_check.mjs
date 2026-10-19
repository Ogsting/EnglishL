// 验证发音触发点：英文面出现读一次 / 翻面再读一次 / 点喇叭再读
const BASE = process.env.CDP || 'http://127.0.0.1:9222'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const targets = await (await fetch(`${BASE}/json`)).json()
const page = targets.find((t) => t.type === 'page')
if (!page) throw new Error('no page target')

const ws = new WebSocket(page.webSocketDebuggerUrl)
let id = 0
const waiters = new Map()
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && waiters.has(msg.id)) {
    const { resolve, reject } = waiters.get(msg.id)
    waiters.delete(msg.id)
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result)
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

await send('Page.enable')
await send('Page.addScriptToEvaluateOnNewDocument', {
  source: `
    (() => {
      window.__spoken = []
      if (!('speechSynthesis' in window)) {
        Object.defineProperty(window, 'speechSynthesis', { value: {}, configurable: true })
      }
      const s = window.speechSynthesis
      s.speak = (u) => window.__spoken.push(u.text)
      s.cancel = () => {}
      s.getVoices = () => []
    })()
  `
})

const spoken = () => evalJs('JSON.stringify(window.__spoken || [])')
const side = () => evalJs(`document.querySelector('.face.front .tag')?.textContent || ''`)
const frontWord = () => evalJs(`document.querySelector('.face.front .word')?.textContent || ''`)

// 反复刷新，直到抽到「英文面」的卡片
for (let i = 0; i < 8; i++) {
  await send('Page.reload')
  await sleep(1800)
  if ((await side()).startsWith('EN')) break
}
console.log('英文面 |', await side(), '| 正面:', await frontWord(), '| 加载时已读:', await spoken())

async function drag(fromX, fromY, toX, toY, steps = 12) {
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: fromX, y: fromY, button: 'left', clickCount: 1 })
  for (let i = 1; i <= steps; i++) {
    await send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: fromX + ((toX - fromX) * i) / steps,
      y: fromY + ((toY - fromY) * i) / steps,
      button: 'left',
      buttons: 1
    })
    await sleep(16)
  }
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: toX, y: toY, button: 'left', clickCount: 1 })
}
async function clickAt(pt) {
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pt.x, y: pt.y, button: 'left', clickCount: 1 })
  await sleep(40)
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pt.x, y: pt.y, button: 'left', clickCount: 1 })
}

await drag(340, 500, 90, 520)
await sleep(1200)
console.log('左滑翻面后 | 已读:', await spoken())

const btn = JSON.parse(
  (await evalJs(`(() => { const b = document.querySelector('.speak-btn'); if (!b) return 'null';
    const r = b.getBoundingClientRect(); return JSON.stringify({ x: r.x + r.width / 2, y: r.y + r.height / 2 }); })()`)) || 'null'
)
if (btn) {
  await clickAt(btn)
  await sleep(600)
  console.log('点喇叭后 | 已读:', await spoken())
} else {
  console.log('没找到喇叭按钮')
}

ws.close()
