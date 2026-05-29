/**
 * Thin wrapper around the Web Speech API used to read words, definitions
 * and sentences aloud in US English.
 */
export function useSpeech() {
  function stop(): void {
    window.speechSynthesis.cancel()
  }

  function speak(text: string, onEnd?: () => void): void {
    stop()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 0.8
    if (onEnd) utterance.onend = onEnd
    window.speechSynthesis.speak(utterance)
  }

  return { speak, stop }
}
