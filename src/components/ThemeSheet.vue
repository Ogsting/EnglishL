<script setup lang="ts">
import { setTheme, state } from '../core/store'
import { THEMES } from '../themes/themes'
import { speak, speechSupported } from '../core/speech'

const emit = defineEmits<{ (e: 'close'): void }>()

function pick(id: string) {
  setTheme(id)
  emit('close')
}

function trySpeak() {
  speak('abandon', state.speak.rate)
}
</script>

<template>
  <div class="mask" @click.self="emit('close')">
    <div class="sheet">
      <div class="sheet-head">
        <h3>设置</h3>
        <button class="sheet-close" type="button" aria-label="关闭" @click="emit('close')">✕</button>
      </div>

      <!-- 发音 -->
      <div class="setting-row">
        <div class="meta">
          <b>单词发音</b>
          <small>
            {{
              speechSupported()
                ? '英文面出现时读一次，翻到答案再读一次'
                : '当前环境不支持语音（Android WebView 需要原生 TTS 插件）'
            }}
          </small>
        </div>
        <button
          class="switch"
          type="button"
          :class="{ on: state.speak.enabled }"
          :disabled="!speechSupported()"
          @click="state.speak.enabled = !state.speak.enabled"
        >
          <i />
        </button>
      </div>

      <div class="setting-row">
        <div class="meta">
          <b>语速</b>
          <small>{{ state.speak.rate.toFixed(1) }}×</small>
        </div>
        <input
          class="rate"
          type="range"
          min="0.6"
          max="1.2"
          step="0.05"
          v-model.number="state.speak.rate"
          :disabled="!state.speak.enabled || !speechSupported()"
        />
      </div>

      <div class="setting-row">
        <div class="meta">
          <b>试听</b>
          <small>点一下听听这台机器的发音效果</small>
        </div>
        <button class="btn mini" type="button" :disabled="!speechSupported()" @click="trySpeak">
          试听
        </button>
      </div>

      <h3 style="margin-top: 18px">主题</h3>
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
        <b>手势</b>：左滑 = 认识 · 右滑 = 不认识（进错题本）· 轻点 = 看答案 · <b>长按 = 模糊</b><br />
        <b>模糊</b>：有点印象但说不准，间隔只推进 1.2 倍（比答对保守、比答错宽松），不计入今日达标、不进错题本。
      </p>

      <p class="rules">
        主题包同时决定：配色、字体、圆角、<b>段位材料名</b>、<b>错题材质梯度</b>、<b>背景与装饰图</b>。
        我的世界主题下，段位是煤炭 → 铜 → 铁 → 金 → 钻石 → 基岩的进位制。
      </p>

      <button class="btn sheet-ok" type="button" @click="emit('close')">关闭</button>
    </div>
  </div>
</template>
