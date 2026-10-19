<script setup lang="ts">
import { computed } from 'vue'
import { breakdown } from '../core/rank'
import { theme } from '../core/store'
import { USE_THEME_IMAGES } from '../config'
import PixelIcon from './PixelIcon.vue'

const props = defineProps<{ coals: number }>()
const emit = defineEmits<{ (e: 'open'): void }>()

const parts = computed(() => breakdown(props.coals, theme.value.materials, 3))

/** 4.4 段位图片：主题里给了就用图片，没给就继续用内置像素图标 */
function iconFor(name: string): string | undefined {
  if (!USE_THEME_IMAGES) return undefined
  return theme.value.images?.rankIcons?.[name]
}
</script>

<template>
  <button class="badge" type="button" @click="emit('open')" :title="`累计 ${coals} 煤`">
    <span v-for="(p, i) in parts" :key="p.power" class="chip" :class="{ sub: i > 0 }">
      <img
        v-if="iconFor(p.material.name)"
        class="chip-img"
        :src="iconFor(p.material.name)"
        :style="{ width: p.size + 'px', height: p.size + 'px' }"
        alt=""
      />
      <PixelIcon v-else :shape="p.material.shape" :color="p.material.color" :size="p.size" />
      <span class="num" :style="{ fontSize: Math.round(p.size * 0.5) + 'px' }">{{ p.count }}</span>
    </span>
  </button>
</template>
