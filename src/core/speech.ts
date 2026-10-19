import { reactive } from 'vue'

/**
 * 单词发音：用浏览器自带的 Web Speech API，不下载任何音频文件。
 *
 * 注意：Android WebView（Capacitor 打包后的 APK）不实现 speechSynthesis，
 * 到那一步需要换成 @capacitor-community/text-to-speech，本文件的调用接口不用改。
 */

let cachedVoice: SpeechSynthesisVoice | null = null

/** 诊断信息：设置面板里会显示，用来判断为什么没声音 */
export const speechDiag = reactive({
  supported: false,
  voices: 0,
  voiceName: '',
  lastError: '',
  lastAt: 0
})

export function speechSupported(): boolean {
  const ok = typeof window !== 'undefined' && 'speechSynthesis' in window
  speechDiag.supported = ok
  return ok
}

function pickVoice() {
  if (!speechSupported()) return
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

/** 页面启动时调用一次，把语音列表预热好 */
export function primeSpeech() {
  if (!speechSupported()) return
  pickVoice()
  window.speechSynthesis.onvoiceschanged = pickVoice
  // Android Chrome 上首次可能返回空列表，延迟再取一次
  setTimeout(pickVoice, 600)
}

export function speak(text: string, rate = 0.9) {
  if (!speechSupported() || !text) return
  try {
    const synth = window.speechSynthesis
    synth.cancel()
    // Android Chrome 有时会卡在 paused，先 resume 再读
    synth.resume?.()

    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    u.rate = Math.min(1.5, Math.max(0.5, rate))
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

    // 有些机型在 cancel 后需要再 resume 一次才会真正出声
    setTimeout(() => synth.resume?.(), 50)
  } catch (err) {
    speechDiag.lastError = String(err)
  }
}

export function stopSpeaking() {
  if (speechSupported()) window.speechSynthesis.cancel()
}
