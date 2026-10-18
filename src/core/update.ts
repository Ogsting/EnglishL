import { WORD_BASE } from '../config'
import { applyUpdate, state } from './store'
import type { Word } from './types'

const TIMEOUT = 6000

async function getJson<T>(url: string): Promise<T> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT)
  try {
    // 加时间戳绕过 CDN / 浏览器缓存，保证拿到最新版本号
    const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}_=${Date.now()}`, {
      cache: 'no-store',
      signal: ctrl.signal
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (await res.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

export interface Patch {
  version: number
  added?: Word[]
  updated?: Word[]
  removed?: string[]
}

export interface UpdateResult {
  from: number
  to: number
  added: number
  updated: number
  removed: number
}

/**
 * 启动时静默检查一次：断网、404、超时全部吞掉，绝不影响打不开 App。
 * 服务端只需要放两个东西：version.json 和 patch-<n>.json。
 */
export async function checkForUpdates(): Promise<UpdateResult | null> {
  if (!WORD_BASE) return null
  try {
    const meta = await getJson<{ latest?: number }>(`${WORD_BASE}/version.json`)
    const latest = Number(meta?.latest ?? 0)
    const current = state.wordsVersion
    if (!Number.isFinite(latest) || latest <= current) return null

    let added = 0
    let updated = 0
    let removed = 0
    for (let v = current + 1; v <= latest; v++) {
      const patch = await getJson<Patch>(`${WORD_BASE}/patch-${v}.json`)
      if (!patch || typeof patch !== 'object') continue
      const r = applyUpdate(patch)
      added += r.added
      updated += r.updated
      removed += r.removed
    }
    return { from: current, to: latest, added, updated, removed }
  } catch {
    return null
  }
}
