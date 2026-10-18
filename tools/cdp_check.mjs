// 用 Edge 的 DevTools 协议做一次真实手势验证：左滑 → 翻面 → 飞走 → 进错题本
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

await send('Runtime.enable')
await sleep(1200)

const readState = () =>
  evalJs(`(() => { const raw = localStorage.getItem('englishl:state:v2'); if (!raw) return 'none';
    const s = JSON.parse(raw); return JSON.stringify({ coals: s.rank.coals, wrong: Object.keys(s.wrong).length, seen: Object.keys(s.srs).length,
      today: Object.values(s.rank.days).map(d => d.count) }); })()`)

console.log('swipe 前:', await readState())
const beforeWord = await evalJs(`document.querySelector('.face.front .word')?.textContent.trim()`)
console.log('当前卡片:', beforeWord)

await drag(340, 520, 90, 540)
await sleep(200)
await send('Page.captureScreenshot', { format: 'png' }).then(async (r) => {
  const fs = await import('node:fs')
  fs.writeFileSync(process.env.SHOT || 'D:/EnglishL/research/shot-reveal.png', Buffer.from(r.data, 'base64'))
})
console.log('翻面截图已保存')

await sleep(2200)
const afterWord = await evalJs(`document.querySelector('.face.front .word')?.textContent.trim()`)
console.log('swipe 后:', await readState())
console.log('下一张卡片:', afterWord)

const shot = await send('Page.captureScreenshot', { format: 'png' })
const fs = await import('node:fs')
fs.writeFileSync(process.env.SHOT2 || 'D:/EnglishL/research/shot-next.png', Buffer.from(shot.data, 'base64'))
console.log('下一张截图已保存')

ws.close()
