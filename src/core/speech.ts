import { Capacitor } from '@capacitor/core'
import { TextToSpeech } from '@capacitor-community/text-to-speech'
import { reactive } from 'vue'

/**
 * 单词发音，两条实现：
 * - APK（Capacitor 原生壳）：@capacitor-community/text-to-speech，走系统 TTS 引擎
 * - 浏览器 / PWA：Web Speech API（speechSynthesis）
 *
 * 对上层只暴露 speak() / speechSupported()，组件不用关心跑在哪。
 */

const isNative = Capacitor.isNativePlatform()

export const speechDiag = reactive({
  engine: isNative ? 'native' : 'web',
  supported: false,
  voices: 0,
  voiceName: '',
  lastError: '',
  lastAt: 0
})

let cachedVoice: SpeechSynthesisVoice | null = null
let primed = false

export function speechSupported(): boolean {
  if (isNative) {
    speechDiag.supported = true
    return true
  }
  const ok = typeof window !== 'undefined' && 'speechSynthesis' in window
  speechDiag.supported = ok
  return ok
}

function pickVoice() {
  if (isNative || !speechSupported()) return
  const voices = window.speechSynthesis.getVoices()
  speechDiag.voices = voices.length
  if (!voices.length) return
  cachedVoice =
    voices.find((v) => /^en[-_]US/i.test(v.lang) && /google|samantha|microsoft|natural/i.test(v.name)) ??
    voices.find((v) => /^en[-_]US/i.test(v.lang)) ??
    voices.find((v) => /^en/i.test(v.lang)) ??
    null
  speechDiag.voiceName = cachedVoice ? `${cachedVoice.name} (${cachedVoice.lang})` : ''
}

/** 页面启动时调用一次，把语音列表 / 原生引擎预热好 */
export function primeSpeech() {
  if (isNative) {
    speechSupported()
    // 原生侧顺便探一次语言，顺便触发 TTS 引擎初始化
    TextToSpeech.getSupportedLanguages()
      .then((r) => {
        speechDiag.voices = r.languages?.length ?? 0
      })
      .catch(() => {})
    return
  }
  if (!speechSupported()) return
  pickVoice()
  window.speechSynthesis.onvoiceschanged = pickVoice
  setTimeout(pickVoice, 600)

  // 浏览器要求先有用户手势，第一次点击时解锁一次空朗读
  if (!primed) {
    primed = true
    const unlock = () => {
      try {
        const u = new SpeechSynthesisUtterance(' ')
        u.volume = 0
        window.speechSynthesis.speak(u)
      } catch {
        /* ignore */
      }
      window.removeEventListener('pointerdown', unlock)
    }
    window.addEventListener('pointerdown', unlock, { once: true })
  }
}

export async function speak(text: string, rate = 0.9) {
  if (!text) return
  const r = Math.min(1.5, Math.max(0.5, rate))

  if (isNative) {
    try {
      await TextToSpeech.stop()
      await TextToSpeech.speak({
        text,
        lang: 'en-US',
        rate: r,
        pitch: 1,
        volume: 1,
        category: 'ambient'
      })
      speechDiag.lastAt = Date.now()
      speechDiag.lastError = ''
    } catch (err) {
      speechDiag.lastError = String((err as Error)?.message ?? err)
    }
    return
  }

  if (!speechSupported()) return
  try {
    const synth = window.speechSynthesis
    synth.cancel()
    synth.resume?.()

    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    u.rate = r
    u.volume = 1
    if (cachedVoice) u.voice = cachedVoice
    u.onstart = () => {
      speechDiag.lastAt = Date.now()
      speechDiag.lastError = ''
    }
    u.onerror = (e) => {
      speechDiag.lastError = String((e as SpeechSynthesisErrorEvent).error ?? 'error')
    }
    synth.speak(u)
    setTimeout(() => synth.resume?.(), 50)
  } catch (err) {
    speechDiag.lastError = String(err)
  }
}

export function stopSpeaking() {
  if (isNative) {
    TextToSpeech.stop().catch(() => {})
    return
  }
  if (speechSupported()) window.speechSynthesis.cancel()
}
