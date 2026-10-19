<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { Grade, Word } from '../core/types'
import { speak, speechSupported } from '../core/speech'
import { state } from '../core/store'

const props = defineProps<{ word: Word; side: 'en' | 'zh' }>()
const emit = defineEmits<{ (e: 'grade', r: Grade): void }>()

function say() {
  if (state.speak.enabled) speak(props.word.w, state.speak.rate)
}

/** 正面只显示第一个义项的前半段，避免中文长释义把卡片撑爆 */
const promptCn = computed(() => {
  const first = props.word.cn.split('；')[0]
  if (first.length <= 16) return first
  const cut = first.slice(0, 16)
  const i = cut.lastIndexOf('，')
  return (i > 4 ? cut.slice(0, i) : cut) + '…'
})

const THRESHOLD = 92
const LONG_PRESS = 450 // 长按多久算「模糊」
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

const dx = ref(0)
const dy = ref(0)
const dragging = ref(false)
const flipped = ref(false)
const leaving = ref<'' | 'left' | 'right' | 'up'>('')
/** 已判定、翻面等待用户点击的挂起结果 */
const pending = ref<'' | Grade>('')
/** 长按是否已触发（避免松手时又被当成点击） */
const longFired = ref(false)

let startX = 0
let startY = 0
let pressTimer: number | undefined

// 英文面出现时读一次（中文面不能读，否则等于把答案念出来）
onMounted(() => {
  if (props.side === 'en') say()
})

// 翻到最终单词时再读一次
watch(flipped, (v) => {
  if (v) say()
})

const shellStyle = computed(() => {
  if (leaving.value) {
    if (leaving.value === 'up') {
      return {
        transform: 'translate3d(0, -130%, 0) scale(0.94)',
        opacity: 0,
        transition: 'transform .3s ease-in, opacity .28s ease-in'
      }
    }
    const x = leaving.value === 'right' ? 135 : -135
    const rot = leaving.value === 'right' ? 16 : -16
    return {
      transform: `translate3d(${x}%, 20px, 0) rotate(${rot}deg)`,
      opacity: 0,
      transition: 'transform .3s ease-in, opacity .28s ease-in'
    }
  }
  return {
    transform: `translate3d(${dx.value}px, ${dy.value * 0.32}px, 0) rotate(${dx.value / 22}deg)`,
    transition: dragging.value ? 'none' : 'transform .26s cubic-bezier(.2,.8,.2,1)'
  }
})

// 左滑 = 认识（绿色印章在右），右滑 = 不认识（红色印章在左）
const knowStamp = computed(() => Math.max(0, Math.min(1, (-dx.value - 26) / 70)))
const unknownStamp = computed(() => Math.max(0, Math.min(1, (dx.value - 26) / 70)))

function clearPress() {
  if (pressTimer) {
    window.clearTimeout(pressTimer)
    pressTimer = undefined
  }
}

function onDown(e: PointerEvent) {
  if (leaving.value) return
  dragging.value = true
  longFired.value = false
  startX = e.clientX
  startY = e.clientY
  ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)

  clearPress()
  pressTimer = window.setTimeout(() => {
    // 还在原地、也没翻面 → 判定为「模糊」
    if (dragging.value && Math.abs(dx.value) < 12 && !pending.value && !flipped.value) {
      longFired.value = true
      commit('fuzzy')
    }
  }, LONG_PRESS)
}

function onMove(e: PointerEvent) {
  if (!dragging.value || pending.value) return
  dx.value = e.clientX - startX
  dy.value = e.clientY - startY
  if (Math.abs(dx.value) > 12) clearPress()
}

/** 滑过阈值 / 长按：回弹 + 翻面展示释义，然后停住等点击 */
function commit(kind: 'left' | 'right' | 'fuzzy') {
  clearPress()
  dragging.value = false
  dx.value = 0
  dy.value = 0
  flipped.value = true
  pending.value = kind === 'fuzzy' ? 'fuzzy' : kind === 'left' ? 'know' : 'unknown'
}

/** 用户点击后才真正飞出并结算 */
async function finish() {
  const g = pending.value
  if (!g) return
  pending.value = ''
  leaving.value = g === 'know' ? 'left' : g === 'unknown' ? 'right' : 'up'
  await wait(320)
  emit('grade', g)
}

function onUp() {
  if (!dragging.value) return
  dragging.value = false
  clearPress()
  const d = dx.value
  const tap = Math.abs(d) < 8 && Math.abs(dy.value) < 10

  if (longFired.value) {
    longFired.value = false
    dx.value = 0
    dy.value = 0
    return
  }

  // 已翻面等确认：点一下才继续
  if (pending.value) {
    dx.value = 0
    dy.value = 0
    if (tap) finish()
    return
  }

  if (Math.abs(d) > THRESHOLD) {
    commit(d > 0 ? 'right' : 'left')
    return
  }
  if (tap) flipped.value = !flipped.value
  dx.value = 0
  dy.value = 0
}

function onCancel() {
  clearPress()
  if (!dragging.value) return
  dragging.value = false
  dx.value = 0
  dy.value = 0
}
</script>

<template>
  <div
    class="card-shell"
    :style="shellStyle"
    @pointerdown="onDown"
    @pointermove="onMove"
    @pointerup="onUp"
    @pointercancel="onCancel"
    @pointerleave="onCancel"
  >
    <div class="card" :class="{ flipped }">
      <div class="face front">
        <span class="tag">{{ side === 'en' ? 'EN → 中文' : '中文 → EN' }}</span>
        <div class="body">
          <div v-if="side === 'en'" class="word">{{ word.w }}</div>
          <div v-else class="word zh">{{ promptCn }}</div>
          <div class="hint">{{ side === 'en' ? '这个单词是什么意思？' : '对应的英文单词是？' }}</div>
        </div>
        <div class="foot">
          <span>轻点看答案</span>
          <span>← 认识 · 不认识 →</span>
        </div>
      </div>

      <div class="face back">
        <span class="tag">释义</span>
        <div class="body">
          <div class="word sm">{{ word.w }}</div>
          <div class="phonetic">{{ word.ph }}</div>
          <div class="meaning">
            <span v-if="word.pos" class="pos">{{ word.pos }}</span>{{ word.cn }}
          </div>
        </div>
        <div class="foot">
          <span>{{ word.tag === 'cet6' ? '六级' : word.tag === 'own' ? '自建词' : '四级' }}</span>
          <span v-if="pending" class="next">点击卡片继续 ›</span>
          <span v-else>{{
            leaving === 'left' ? '已记录' : leaving === 'right' ? '已加入错题本' : leaving === 'up' ? '已标记模糊' : ''
          }}</span>
        </div>
      </div>
    </div>

    <div class="stamp know" :style="{ opacity: knowStamp }">认识</div>
    <div class="stamp unknown" :style="{ opacity: unknownStamp }">不认识</div>
    <div v-if="pending === 'fuzzy'" class="stamp fuzzy">模糊</div>

    <button
      v-if="speechSupported() && state.speak.enabled"
      class="speak-btn"
      type="button"
      aria-label="再读一次"
      @pointerdown.stop
      @click.stop="say"
    >
      🔊
    </button>
  </div>
</template>
