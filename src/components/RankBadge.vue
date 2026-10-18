<script setup lang="ts">
import { computed } from 'vue'
import { breakdown } from '../core/rank'
import { theme } from '../core/store'
import PixelIcon from './PixelIcon.vue'

const props = defineProps<{ coals: number }>()
const emit = defineEmits<{ (e: 'open'): void }>()

const parts = computed(() => breakdown(props.coals, theme.value.materials, 3))
</script>

<template>
  <button class="badge" type="button" @click="emit('open')" :title="`累计 ${coals} 煤`">
    <span v-for="(p, i) in parts" :key="p.power" class="chip" :class="{ sub: i > 0 }">
      <PixelIcon :shape="p.material.shape" :color="p.material.color" :size="p.size" />
      <span class="num" :style="{ fontSize: Math.round(p.size * 0.5) + 'px' }">{{ p.count }}</span>
    </span>
  </button>
</template>
