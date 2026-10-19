import { computed, reactive, watch } from 'vue'
import { dateKey, shiftDate } from './rank'
import { DAY, grade as srsGrade, isDue, priority } from './srs'
import { getTheme } from '../themes/themes'
import type { Grade, RankDay, SrsState, Word } from './types'
import { CET_WORDS } from '../data/words'

const KEY = 'englishl:state:v2'

interface Persisted {
  themeId: string
  srs: Record<string, SrsState>
  own: Word[]
  wrong: Record<string, { count: number; last: number }>
  rank: { coals: number; days: Record<string, RankDay> }
  goal: number
  newPerDay: number
  lastOpen: string
  newSeenDate: string
  newSeen: number
  /** 已应用到的词库补丁版本 */
  wordsVersion: number
  /** 联网增量更新留下的补丁结果（很小，可以放 localStorage） */
  wordOverrides: { added: Word[]; updated: Record<string, Word>; removed: string[] }
  /** 发音 */
  speak: { enabled: boolean; rate: number }
}

function defaults(): Persisted {
  return {
    themeId: 'minecraft',
    srs: {},
    own: [],
    wrong: {},
    rank: { coals: 0, days: {} },
    goal: 50,
    newPerDay: 12,
    lastOpen: '',
    newSeenDate: '',
    newSeen: 0,
    wordsVersion: 0,
    wordOverrides: { added: [], updated: {}, removed: [] },
    speak: { enabled: true, rate: 0.9 }
  }
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaults()
    const parsed = JSON.parse(raw) as Partial<Persisted>
    const base = defaults()
    return {
      ...base,
      ...parsed,
      rank: { ...base.rank, ...(parsed.rank ?? {}) },
      wordOverrides: { ...base.wordOverrides, ...(parsed.wordOverrides ?? {}) },
      speak: { ...base.speak, ...(parsed.speak ?? {}) }
    }
  } catch {
    return defaults()
  }
}

export const state = reactive<Persisted>(load())

let saveTimer: number | undefined
watch(
  state,
  () => {
    window.clearTimeout(saveTimer)
    saveTimer = window.setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(state))
      } catch {
        /* 存储满时忽略 */
      }
    }, 250)
  },
  { deep: true }
)

export const theme = computed(() => getTheme(state.themeId))

export function setTheme(id: string) {
  state.themeId = id
}

/* ------------------------------------------------------------------ */
/* 词库                                                                */
/* ------------------------------------------------------------------ */

export const ownIndex = computed(() => new Map(state.own.map((w) => [w.id, w])))

/** 内置词库 + 联网增量补丁后的最终词表 */
export const pool = computed<Word[]>(() => {
  const { added, updated, removed } = state.wordOverrides
  const gone = new Set(removed)
  const out: Word[] = []
  for (const w of CET_WORDS) {
    if (gone.has(w.id)) continue
    out.push(updated[w.id] ?? w)
  }
  for (const w of added) {
    if (!gone.has(w.id)) out.push(w)
  }
  return out
})

export const wordIndex = computed(() => {
  const m = new Map<string, Word>()
  for (const w of pool.value) m.set(w.id, w)
  for (const w of state.own) m.set(w.id, w)
  return m
})

/** 应用一个增量补丁：added 新增 / updated 覆盖 / removed 删除 */
export function applyUpdate(patch: {
  version?: number
  added?: Word[]
  updated?: Word[]
  removed?: string[]
}) {
  const o = state.wordOverrides
  let nAdded = 0
  let nUpdated = 0
  let nRemoved = 0

  for (const w of patch.added ?? []) {
    if (!w?.id || !w.w || !w.cn) continue
    o.removed = o.removed.filter((id) => id !== w.id)
    const i = o.added.findIndex((x) => x.id === w.id)
    if (i >= 0) o.added[i] = w
    else o.added.push(w)
    delete o.updated[w.id]
    nAdded++
  }

  for (const w of patch.updated ?? []) {
    if (!w?.id) continue
    o.updated[w.id] = w
    const i = o.added.findIndex((x) => x.id === w.id)
    if (i >= 0) o.added[i] = w
    nUpdated++
  }

  for (const id of patch.removed ?? []) {
    if (!id || o.removed.includes(id)) continue
    o.removed.push(id)
    o.added = o.added.filter((x) => x.id !== id)
    nRemoved++
  }

  if (typeof patch.version === 'number') state.wordsVersion = patch.version
  return { added: nAdded, updated: nUpdated, removed: nRemoved }
}

export function addOwnWord(en: string, cn: string, ph = '') {
  const w = en.trim().toLowerCase()
  if (!w || !cn.trim()) return null
  const id = `own:${w}`
  const existed = state.own.find((x) => x.id === id)
  if (existed) {
    existed.cn = cn.trim()
    existed.ph = ph.trim() || existed.ph
    return existed
  }
  const word: Word = { id, w: en.trim(), cn: cn.trim(), ph: ph.trim(), tag: 'own' }
  state.own.push(word)
  return word
}

export function removeOwnWord(id: string) {
  state.own = state.own.filter((w) => w.id !== id)
}

/* ------------------------------------------------------------------ */
/* 段位：进位制（1 煤 = 1 天达标；10 煤 = 1 铜；10 铜 = 1 铁 …）          */
/* ------------------------------------------------------------------ */

const today = () => dateKey()

function settle(day: RankDay) {
  if (day.settled) return
  if (day.count >= state.goal) state.rank.coals += 1
  else state.rank.coals = Math.max(0, state.rank.coals - 1)
  day.settled = true
}

/** 打开 App 时结算：补上错过的天数（每天 −1 煤），并建立今天的记录 */
export function ensureToday() {
  const t = today()
  const days = state.rank.days

  if (!days[t]) days[t] = { count: 0, settled: false }

  const anchor = state.lastOpen || t
  const start = shiftDate(anchor, 1)
  let cursor = start
  let guard = 0
  while (cursor < t && guard++ < 400) {
    if (!days[cursor]) days[cursor] = { count: 0, settled: false }
    if (!days[cursor].settled) settle(days[cursor])
    cursor = shiftDate(cursor, 1)
  }

  for (const key of Object.keys(days)) {
    if (key < t && !days[key].settled) settle(days[key])
    if (key < shiftDate(t, -60)) delete days[key]
  }

  if (state.newSeenDate !== t) {
    state.newSeenDate = t
    state.newSeen = 0
  }
  state.lastOpen = t
}

export const todayCount = computed(() => state.rank.days[today()]?.count ?? 0)

/** 今日是否已达成（达标即 +1 煤，当场生效） */
export function recordGrade(wordId: string, result: Grade) {
  ensureToday()
  const before = state.srs[wordId]
  const wasNew = !before || before.seen === 0
  const s = srsGrade(before, wordId, result)
  state.srs[wordId] = s

  if (wasNew) state.newSeen += 1

  if (result === 'unknown') {
    const prev = state.wrong[wordId]?.count ?? 0
    state.wrong[wordId] = { count: prev + 1, last: Date.now() }
  } else if (result === 'know') {
    const day = state.rank.days[today()]
    if (day) {
      day.count += 1
      if (day.count >= state.goal && !day.settled) {
        state.rank.coals += 1
        day.settled = true
      }
    }
  }
  // 'fuzzy'（模糊）：不计入今日达标，也不进错题本
}

export function deleteWrong(id: string) {
  delete state.wrong[id]
}

/* ------------------------------------------------------------------ */
/* 学习队列：见 core/queue.ts（加权随机）                                */
/* ------------------------------------------------------------------ */

export const stats = computed(() => {
  let dueToday = 0
  let learned = 0
  const now = Date.now()
  for (const id of Object.keys(state.srs)) {
    const s = state.srs[id]
    if (s.seen > 0) learned++
    if (s.due <= now) dueToday++
  }
  return { dueToday, learned, total: pool.value.length, own: state.own.length, wrong: Object.keys(state.wrong).length }
})

export { DAY }
