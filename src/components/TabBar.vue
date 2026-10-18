<script setup lang="ts">
import { computed } from 'vue'
import { theme } from '../core/store'
import PixelIcon from './PixelIcon.vue'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const TABS = [
  { id: 'home', label: '首页', shape: 'home' },
  { id: 'own', label: '单词本', shape: 'book' },
  { id: 'wrong', label: '错题本', shape: 'cross' }
]

const accent = computed(() => theme.value.colors['--accent'])
const idle = computed(() => theme.value.colors['--nav-ink'])
</script>

<template>
  <nav class="tabbar">
    <button
      v-for="t in TABS"
      :key="t.id"
      class="tab"
      :class="{ active: modelValue === t.id }"
      type="button"
      @click="emit('update:modelValue', t.id)"
    >
      <PixelIcon :shape="t.shape" :color="modelValue === t.id ? accent : idle" :size="22" />
      <span>{{ t.label }}</span>
    </button>
  </nav>
</template>
