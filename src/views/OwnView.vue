<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import SwipeCard from '../components/SwipeCard.vue'
import { addOwnWord, recordGrade, removeOwnWord, state } from '../core/store'
import { pickQueue } from '../core/queue'
import type { Grade, Word } from '../core/types'

const mode = ref<'list' | 'practice'>('list')
const en = ref('')
const cn = ref('')

const queue = ref<Word[]>([])
const idx = ref(0)
const side = ref<'en' | 'zh'>('en')

const current = computed(() => queue.value[idx.value] ?? null)

function add() {
  if (!en.value.trim() || !cn.value.trim()) return
  addOwnWord(en.value, cn.value)
  en.value = ''
  cn.value = ''
}

function rollSide() {
  side.value = Math.random() < 0.5 ? 'en' : 'zh'
}

/** 保存自建词的复习进度 */
function persist() {
  state.session.own = {
    queue: queue.value.map((w) => w.id),
    idx: idx.value,
    side: side.value,
    mode: mode.value
  }
}

function restore(): boolean {
  const s = state.session.own
  if (!s || !s.queue?.length) return false
  const map = new Map(state.own.map((w) => [w.id, w]))
  const q = s.queue.map((id) => map.get(id)).filter((w): w is Word => !!w)
  if (!q.length) return false
  queue.value = q
  idx.value = Math.min(s.idx ?? 0, q.length)
  side.value = s.side ?? 'en'
  mode.value = s.mode === 'practice' && q.length > 0 ? 'practice' : 'list'
  return true
}

function startPractice() {
  // 自建词全部进入本轮（newQuota 给足），复习历史照样记在各自词条上
  queue.value = pickQueue(state.own, 60, 999)
  idx.value = 0
  rollSide()
  mode.value = 'practice'
  persist()
}

function onGrade(r: Grade) {
  if (!current.value) return
  recordGrade(current.value.id, r)
  idx.value += 1
  rollSide()
}

watch([idx, side, mode], persist)

onMounted(() => {
  // 上次正在复习就恢复进度；否则看词条列表
  if (!restore() && state.own.length === 0) mode.value = 'list'
})
</script>

<template>
  <div class="view-head">
    <div class="view-title">
      <b>个人单词本</b>
      <span>{{ state.own.length }} 个自建词</span>
    </div>
    <div class="seg">
      <button type="button" :class="{ on: mode === 'list' }" @click="mode = 'list'">词条管理</button>
      <button type="button" :class="{ on: mode === 'practice' }" @click="startPractice">开始复习</button>
    </div>
  </div>

  <template v-if="mode === 'list'">
    <div class="add-box">
      <input v-model="en" placeholder="英文单词" autocapitalize="off" spellcheck="false" />
      <input v-model="cn" placeholder="中文释义" @keyup.enter="add" />
      <button class="btn" type="button" style="padding: 10px 14px" @click="add">加</button>
    </div>

    <div class="list panel-own">
      <div v-for="w in state.own" :key="w.id" class="row">
        <div class="inner">
          <div class="cn">{{ w.cn }}</div>
          <div class="en">{{ w.w }}</div>
          <button class="icon-btn" type="button" @click="removeOwnWord(w.id)">×</button>
        </div>
      </div>
      <div v-if="state.own.length === 0" class="empty">
        <b>还没有自己的单词</b>
        在上面输入英文和中文，加进来就能像首页一样滑动复习
      </div>
    </div>
  </template>

  <template v-else>
    <div class="stage">
      <div v-if="current" class="stack">
        <div class="ghost g2" />
        <div class="ghost g1" />
        <SwipeCard :key="current.id + '#' + idx" :word="current" :side="side" @grade="onGrade" />
      </div>
      <div v-else class="empty">
        <b>这一组复习完了</b>
        这些词会按记忆曲线过几天再出现
        <div style="margin-top: 16px">
          <button class="btn" type="button" @click="startPractice">再复习一轮</button>
        </div>
      </div>
    </div>

    <div class="hint-row">
      <span class="side"><i class="dot yes" /> 左滑 · 认识</span>
      <span class="side"><i class="dot no" /> 右滑 · 不认识</span>
    </div>
  </template>
</template>
