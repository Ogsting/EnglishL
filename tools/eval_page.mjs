// 在当前页面求值一段 JS，用于环境探测
const BASE = process.env.CDP || 'http://127.0.0.1:9230'
const EXPR = process.env.EXPR || `JSON.stringify({ secure: window.isSecureContext, hasSynth: 'speechSynthesis' in window, proto: location.protocol, host: location.host })`

const targets = await (await fetch(`${BASE}/json`)).json()
const page = targets.find((t) => t.type === 'page')
if (!page) throw new Error('no page')

const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
const res = await new Promise((resolve) => {
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id === 1) resolve(m)
  })
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: EXPR, returnByValue: true, awaitPromise: true } }))
})
console.log(JSON.stringify(res.result?.result?.value ?? res, null, 2))
ws.close()
