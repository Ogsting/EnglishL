<script setup lang="ts">
import { setTheme, state } from '../core/store'
import { THEMES } from '../themes/themes'

const emit = defineEmits<{ (e: 'close'): void }>()

function pick(id: string) {
  setTheme(id)
  emit('close')
}
</script>

<template>
  <div class="mask" @click.self="emit('close')">
    <div class="sheet">
      <h3>主题</h3>
      <div
        v-for="t in THEMES"
        :key="t.id"
        class="theme-item"
        :class="{ on: state.themeId === t.id }"
        @click="pick(t.id)"
      >
        <div class="swatches">
          <i :style="{ background: t.colors['--accent'] }" />
          <i :style="{ background: t.colors['--card'] }" />
          <i :style="{ background: t.materials[1].color }" />
          <i :style="{ background: t.materials[8].color }" />
        </div>
        <div class="meta">
          <b>{{ t.name }}</b>
          <small>{{ t.desc }}</small>
        </div>
        <span v-if="state.themeId === t.id" style="color: var(--accent); font-size: 12px">使用中</span>
      </div>
      <p class="rules">
        主题包同时决定：配色、字体、圆角、<b>段位材料名</b>、<b>错题材质梯度</b>。
        我的世界主题下，段位是煤炭 → 铜 → 铁 → 金 → 钻石 → 基岩的进位制。
      </p>
    </div>
  </div>
</template>
