/**
 * Thin wrapper around the Web Speech API used to read words, definitions
 * and sentences aloud in US English.
 *
 * Some in-app browsers (notably KakaoTalk's Android WebView) don't provide the
 * Web Speech API at all. We guard every call so a missing API degrades to
 * "no audio" instead of throwing — otherwise an exception here would abort
 * callers like applyWordData() and the study screen.
 */
export function useSpeech() {
  const supported =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance !== 'undefined'

  function stop(): void {
    if (!supported) return
    try {
      window.speechSynthesis.cancel()
    } catch {
      // ignore — speech not usable here
    }
  }

  function speak(text: string, onEnd?: () => void): void {
    if (!supported) {
      // No speech engine — still run the callback so chained logic continues.
      if (onEnd) onEnd()
      return
    }
    try {
      stop()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      utterance.rate = 0.8
      if (onEnd) utterance.onend = onEnd
      window.speechSynthesis.speak(utterance)
    } catch {
      if (onEnd) onEnd()
    }
  }

  return { speak, stop }
}
