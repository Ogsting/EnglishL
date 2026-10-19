<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import SwipeCard from '../components/SwipeCard.vue'
import { pool, recordGrade, state, stats, todayCount } from '../core/store'
import { pickQueue } from '../core/queue'
import type { Grade, Word } from '../core/types'

const queue = ref<Word[]>([])
const idx = ref(0)
const side = ref<'en' | 'zh'>('en')

const current = computed(() => queue.value[idx.value] ?? null)
const pct = computed(() => Math.min(100, Math.round((todayCount.value / state.goal) * 100)))

function rollSide() {
  side.value = Math.random() < 0.5 ? 'en' : 'zh'
}

/** 把当前进度写进 store，切 Tab / 重启后能回到同一张卡 */
function persist() {
  state.session.home = {
    queue: queue.value.map((w) => w.id),
    idx: idx.value,
    side: side.value
  }
}

/** 从 store 恢复上一张卡；没有或词已不存在则返回 false */
function restore(): boolean {
  const s = state.session.home
  if (!s || !s.queue?.length) return false
  const map = new Map(pool.value.map((w) => [w.id, w]))
  const q = s.queue.map((id) => map.get(id)).filter((w): w is Word => !!w)
  if (!q.length) return false
  queue.value = q
  idx.value = Math.min(s.idx ?? 0, q.length)
  side.value = s.side ?? 'en'
  return true
}

function reload(extra = 0) {
  queue.value = pickQueue(pool.value, 60, state.newPerDay + extra)
  idx.value = 0
  rollSide()
  persist()
}

onMounted(() => {
  // 有上次的进度就接着看，不重新抽词
  if (!restore()) reload()
})

watch([idx, side], persist)

function onGrade(r: Grade) {
  if (!current.value) return
  recordGrade(current.value.id, r)
  idx.value += 1
  rollSide()
}
</script>

<template>
  <div class="view-head">
    <div class="view-title">
      <b>今日复习 <i>{{ todayCount }}</i>/{{ state.goal }}</b>
      <span>待复习 {{ stats.dueToday }} · 已学 {{ stats.learned }}</span>
    </div>
    <div class="bar"><i :style="{ width: pct + '%' }" /></div>
  </div>

  <div class="stage">
    <div v-if="current" class="stack">
      <div class="ghost g2" />
      <div class="ghost g1" />
      <SwipeCard :key="current.id + '#' + idx" :word="current" :side="side" @grade="onGrade" />
    </div>

    <div v-else class="empty">
      <b>今天的卡片刷完了</b>
      达标线是 {{ state.goal }} 个，已达 {{ todayCount }} 个<br />
      想继续练就再来一组新词
      <div style="margin-top: 16px">
        <button class="btn" type="button" @click="reload(10)">再来 10 个新词</button>
      </div>
    </div>
  </div>

  <div class="hint-row">
    <span class="side"><i class="dot yes" /> 左滑 · 认识</span>
    <span class="side"><i class="dot no" /> 右滑 · 不认识（进错题本）</span>
  </div>
</template>
