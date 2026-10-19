// 检查/操作 WebView：node cdp_webview_state.mjs [open|ok]
const BASE = process.env.CDP || 'http://127.0.0.1:9333'
const action = process.argv[2]
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const list = await (await fetch(`${BASE}/json`)).json()
const page = list.find((t) => t.type === 'page')
if (!page) {
  console.log('no page')
  process.exit(1)
}
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0
const send = (expr) =>
  new Promise((resolve) => {
    const mid = ++id
    const handler = (ev) => {
      const m = JSON.parse(ev.data)
      if (m.id === mid) {
        ws.removeEventListener('message', handler)
        resolve(m.result?.result?.value)
      }
    }
    ws.addEventListener('message', handler)
    ws.send(
      JSON.stringify({
        id: mid,
        method: 'Runtime.evaluate',
        params: { expression: expr, returnByValue: true }
      })
    )
  })

const state = () =>
  send(
    'JSON.stringify({ sheet: !!document.querySelector(".sheet"), hist: history.length, state: history.state })'
  )

if (action === 'open') {
  await send(`document.querySelector('.icon-btn')?.click()`)
  await sleep(700)
}
console.log(await state())
ws.close()
