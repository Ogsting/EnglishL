// 验证「滑动后停住，等点击才继续」
const BASE = process.env.CDP || 'http://127.0.0.1:9222'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const targets = await (await fetch(`${BASE}/json`)).json()
const page = targets.find((t) => t.type === 'page')
if (!page) throw new Error('no page target')

const ws = new WebSocket(page.webSocketDebuggerUrl)
let id = 0
const pendingMsgs = new Map()
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pendingMsgs.has(msg.id)) {
    const { resolve, reject } = pendingMsgs.get(msg.id)
    pendingMsgs.delete(msg.id)
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result)
  }
})
await new Promise((r) => ws.addEventListener('open', r, { once: true }))

const send = (method, params = {}) => {
  const mid = ++id
  ws.send(JSON.stringify({ id: mid, method, params }))
  return new Promise((resolve, reject) => pendingMsgs.set(mid, { resolve, reject }))
}
const evalJs = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
  return r.result?.value
}

const state = () =>
  evalJs(`(() => { const s = JSON.parse(localStorage.getItem('englishl:state:v2')||'{}');
    return JSON.stringify({ wrong: Object.keys(s.wrong||{}).length, seen: Object.keys(s.srs||{}).length,
      today: Object.values(s.rank?.days||{}).map(d=>d.count) }); })()`)

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

async function click(x, y) {
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 })
  await sleep(40)
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 })
}

await send('Runtime.enable')
await sleep(1200)

console.log('滑动前:', await state(), '| 卡片:', await evalJs(`document.querySelector('.face.front .word')?.textContent`))

await drag(340, 500, 90, 520)

// 等 2 秒：如果还停着，说明不再自动跳
await sleep(2000)
const flipped = await evalJs(`!!document.querySelector('.card.flipped')`)
const nextHint = await evalJs(`document.querySelector('.face.back .next')?.textContent || ''`)
console.log('滑动后 2 秒:', await state(), '| 翻面:', flipped, '| 提示:', JSON.stringify(nextHint))

// 点击卡片
await click(260, 500)
await sleep(1500)
console.log('点击后:', await state(), '| 新卡片:', await evalJs(`document.querySelector('.face.front .word')?.textContent`))

ws.close()
