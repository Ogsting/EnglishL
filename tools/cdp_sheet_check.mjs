// 复现：打开设置弹层后是否卡死 / 控制台是否报错
const BASE = process.env.CDP || 'http://127.0.0.1:9222'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const targets = await (await fetch(`${BASE}/json`)).json()
const page = targets.find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
let id = 0
const waiters = new Map()
const logs = []
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data)
  if (m.method === 'Runtime.consoleAPICalled') {
    logs.push('console.' + m.params.type + ': ' + m.params.args.map((a) => a.value ?? a.description).join(' '))
  }
  if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails
    logs.push('EXCEPTION: ' + (d.exception?.description || d.text))
  }
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
const click = async (x, y) => {
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 })
  await sleep(50)
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 })
}

await send('Runtime.enable')
await send('Page.enable')
await sleep(2000)

// 点齿轮
await click(468, 32)
await sleep(800)

console.log('弹层存在:', await evalJs(`!!document.querySelector('.sheet')`))
console.log('history.state:', await evalJs(`JSON.stringify(history.state)`))

// 点发音开关（应该能切换）
const before = await evalJs(`JSON.parse(localStorage.getItem('englishl:state:v2')||'{}').speak?.enabled`)
await click(430, 210)
await sleep(600)
const after = await evalJs(`JSON.parse(localStorage.getItem('englishl:state:v2')||'{}').speak?.enabled`)
console.log('开关:', before, '->', after, '| 弹层还在:', await evalJs(`!!document.querySelector('.sheet')`))

// 再来一次：这次用返回（模拟安卓返回键）
await evalJs(`history.back()`)
await sleep(600)
console.log('history.back 后弹层存在:', await evalJs(`!!document.querySelector('.sheet')`))

console.log('--- 日志 ---')
console.log(logs.slice(-12).join('\n') || '(无)')
ws.close()
