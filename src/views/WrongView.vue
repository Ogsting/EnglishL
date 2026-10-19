<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import PixelIcon from '../components/PixelIcon.vue'
import { deleteWrong, state, theme, wordIndex } from '../core/store'
import { mistakeMaterial } from '../themes/themes'

const dx = reactive<Record<string, number>>({})
const armed = reactive<Record<string, boolean>>({})
let dragId: string | null = null
let startX = 0
let startY = 0
let moved = false

const entries = computed(() =>
  Object.entries(state.wrong)
    .map(([id, rec]) => ({ id, count: rec.count, word: wordIndex.value.get(id) }))
    .filter((e) => !!e.word)
    .sort((a, b) => b.count - a.count)
)

function matFor(count: number) {
  return mistakeMaterial(theme.value, count)
}

function onDown(e: PointerEvent, id: string) {
  dragId = id
  startX = e.clientX
  startY = e.clientY
  moved = false
  dx[id] = 0
  ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
}

function onMove(e: PointerEvent, id: string) {
  if (dragId !== id) return
  const d = e.clientX - startX
  const v = e.clientY - startY
  if (Math.abs(v) > Math.abs(d) && !moved) return
  moved = true
  dx[id] = Math.min(0, d)
}

function onUp(id: string) {
  if (dragId !== id) return
  const d = dx[id] ?? 0
  dragId = null
  dx[id] = 0
  if (d < -56) {
    if (armed[id]) deleteWrong(id)
    else armed[id] = true
  } else if (d > 12) {
    armed[id] = false
  }
}

function cancel(id: string) {
  if (dragId === id) dragId = null
  dx[id] = 0
}
</script>

<template>
  <div class="view-head">
    <div class="view-title">
      <b>错题本</b>
      <span>{{ entries.length }} 个待复习</span>
    </div>
    <div style="font-size: 12px; color: var(--sub); line-height: 1.7">
      错得越多，卡片材质越稀有（{{ theme.mistakeLadder[0].name }} → {{ theme.mistakeLadder[theme.mistakeLadder.length - 1].name }}）
    </div>
  </div>

  <div class="list panel-wrong">
    <div
      v-for="e in entries"
      :key="e.id"
      class="row"
      :class="{ armed: armed[e.id] }"
      :style="{ borderColor: armed[e.id] ? 'var(--unknown)' : undefined }"
      @pointerdown="onDown($event, e.id)"
      @pointermove="onMove($event, e.id)"
      @pointerup="onUp(e.id)"
      @pointercancel="cancel(e.id)"
    >
      <div class="danger">再滑一次删除</div>
      <div
        class="inner"
        :style="
          dx[e.id]
            ? { transform: `translateX(${dx[e.id]}px)`, transition: 'none' }
            : { transition: 'transform .22s cubic-bezier(.2,.8,.2,1)' }
        "
      >
        <PixelIcon :shape="matFor(e.count).shape" :color="matFor(e.count).color" :size="18" />
        <div class="cn">{{ e.word?.cn }}</div>
        <div class="en">{{ e.word?.w }}</div>
        <span class="count">{{ e.count }}×</span>
      </div>
    </div>

    <div v-if="entries.length === 0" class="empty">
      <b>错题本是空的</b>
      首页左滑标成「不认识」的词会自动收进来<br />
      连续左滑两次可以把一条记录删掉
    </div>
  </div>
</template>
