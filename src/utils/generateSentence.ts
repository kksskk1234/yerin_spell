/**
 * Best-effort example-sentence generation for a word, with no API key or cost.
 *
 * Strategy:
 *  1. Ask the free dictionary API (dictionaryapi.dev) for a real example.
 *  2. If none exists, fall back to a simple, always-grammatical template so the
 *     row is never left empty.
 *
 * Either way the user can edit the result in the import preview, so we err on
 * the side of returning *something* over returning nothing.
 */

interface DictDefinition {
  definition: string
  example?: string
}
interface DictMeaning {
  partOfSpeech?: string
  definitions: DictDefinition[]
}
interface DictEntry {
  word: string
  meanings: DictMeaning[]
}

/** A safe, kid-friendly sentence that reads correctly for any part of speech. */
export function templateSentence(word: string): string {
  return `I learned the word "${word}" today.`
}

/**
 * Fetch a real example sentence for `word` from the free dictionary API.
 * Returns null when the word is unknown, has no example, or the request fails.
 */
async function fetchExample(word: string): Promise<string | null> {
  const term = word.trim().toLowerCase()
  if (!term) return null
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(term)}`,
    )
    if (!res.ok) return null
    const entries = (await res.json()) as DictEntry[]
    if (!Array.isArray(entries)) return null
    for (const entry of entries) {
      for (const meaning of entry.meanings ?? []) {
        for (const def of meaning.definitions ?? []) {
          const ex = def.example?.trim()
          if (ex) {
            // Capitalize and end with a period so it reads like the built-in data.
            const sentence = ex.charAt(0).toUpperCase() + ex.slice(1)
            return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`
          }
        }
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Generate an example sentence for `word`, preferring a real dictionary example
 * and falling back to a template. Always resolves to a non-empty string.
 */
export async function generateSentence(word: string): Promise<string> {
  const real = await fetchExample(word)
  return real ?? templateSentence(word)
}
