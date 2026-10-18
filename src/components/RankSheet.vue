<script setup lang="ts">
import { computed } from 'vue'
import { breakdown, breakdownText } from '../core/rank'
import { state, theme, todayCount } from '../core/store'
import PixelIcon from './PixelIcon.vue'

const emit = defineEmits<{ (e: 'close'): void }>()

const parts = computed(() => breakdown(state.rank.coals, theme.value.materials, 4))
const text = computed(() => breakdownText(state.rank.coals, theme.value.materials, 4))
const nextInfo = computed(() => {
  const n = Math.max(0, state.rank.coals)
  const power = n <= 0 ? 0 : Math.floor(Math.log10(n))
  const target = 10 ** (power + 1)
  const material = theme.value.materials[Math.min(power + 1, theme.value.materials.length - 1)]
  return { material, remaining: target - n, target }
})
</script>

<template>
  <div class="mask" @click.self="emit('close')">
    <div class="sheet">
      <h3>段位</h3>

      <div class="rank-line" style="gap: 14px">
        <template v-for="(p, i) in parts" :key="p.power">
          <span style="display: inline-flex; align-items: center; gap: 6px">
            <PixelIcon
              :shape="p.material.shape"
              :color="p.material.color"
              :size="i === 0 ? 44 : 26"
            />
            <b v-if="i === 0" style="font-size: 22px; color: var(--text)">{{ p.count }}</b>
            <span v-else style="font-size: 14px; color: var(--sub)">{{ p.count }}</span>
            <span style="font-size: 12px; color: var(--sub)">{{ p.material.name }}</span>
          </span>
        </template>
      </div>

      <div class="rules">
        <div>累计 <b>{{ state.rank.coals }}</b> 煤 → {{ text }}</div>
        <div>今日已认识 <b>{{ todayCount }}</b> / {{ state.goal }} 个单词</div>
        <div style="margin-top: 8px">
          每天达标 +1 煤；<b>10 煤 = 1 铜，10 铜 = 1 铁</b>，上一级材料满 10 个就进位成下一级。
        </div>
        <div>某天没达标（包括整天没打开）→ −1 煤，不够就向下借位。</div>
        <div>
          再累计 <b>{{ nextInfo.remaining }}</b> 煤进位成 <b>{{ nextInfo.material.name }}</b>
        </div>
      </div>

      <div style="margin-top: 16px; text-align: right">
        <button class="btn ghost" type="button" @click="emit('close')">关闭</button>
      </div>
    </div>
  </div>
</template>
