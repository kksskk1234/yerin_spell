import type { Word, WordData } from '../types'

/**
 * Best-effort parser that turns OCR text from a "Vocabulary Test List" image
 * into structured word data grouped by date.
 *
 * The source images are tables of  Word | Type of Word | Definition  rows,
 * grouped under date headers like "Mon, June 1st: Subject Link". OCR output is
 * messy, so this errs on the side of capturing something for every row and
 * relies on the user editing the preview afterwards.
 */

const WEEKDAYS = '(?:Mon|Tue|Tues|Wed|Wednes|Thu|Thur|Thurs|Fri|Sat|Sun)[a-z]*'
const MONTHS =
  '(?:January|February|March|April|May|June|July|August|September|October|November|December)'

// Word-type keywords used as the delimiter between the word and its definition.
// "superlative"/"comparative" are listed alone too because OCR often splits
// "Superlative adjective" across two lines.
const TYPE_WORDS = [
  'superlative adjective',
  'comparative adjective',
  'superlative',
  'comparative',
  'noun',
  'verb',
  'adjective',
  'adverb',
  'phrase',
  'pronoun',
  'preposition',
  'conjunction',
  'interjection',
  'article',
]

const dateHeaderRe = new RegExp(
  `(${WEEKDAYS})\\s*,?\\s*(${MONTHS})\\s+(\\d{1,2})(?:st|nd|rd|th)?`,
  'i',
)

const rowRe = new RegExp(`^(.+?)\\s+(${TYPE_WORDS.join('|')})\\b\\s*(.*)$`, 'i')

function shortWeekday(w: string): string {
  const k = w.toLowerCase()
  if (k.startsWith('mon')) return 'Mon'
  if (k.startsWith('tue')) return 'Tue'
  if (k.startsWith('wed')) return 'Wed'
  if (k.startsWith('thu')) return 'Thu'
  if (k.startsWith('fri')) return 'Fri'
  if (k.startsWith('sat')) return 'Sat'
  if (k.startsWith('sun')) return 'Sun'
  return w
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

function ordinal(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0])
}

export function parseVocabText(text: string): WordData {
  const lines = text.split(/\r?\n/)
  const data: WordData = {}
  let currentDate: string | null = null
  let lastWord: Word | null = null

  for (const raw of lines) {
    const line = raw.replace(/[|]/g, ' ').replace(/\s+/g, ' ').trim()
    if (!line) continue

    // Date header → start (or resume) a date group.
    const dm = line.match(dateHeaderRe)
    if (dm && line.toLowerCase().indexOf(dm[0].toLowerCase()) <= 4) {
      const label = `${shortWeekday(dm[1])}, ${capitalize(dm[2])} ${ordinal(Number(dm[3]))}`
      currentDate = label
      if (!data[label]) data[label] = []
      lastWord = null
      continue
    }

    if (!currentDate) continue

    // Skip the column-header row of each table.
    if (line.toLowerCase().includes('type of word')) continue

    const rm = line.match(rowRe)
    if (rm) {
      const word = rm[1].trim()
      const def = rm[3].trim()
      if (word && def) {
        const entry: Word = { word, def }
        data[currentDate].push(entry)
        lastWord = entry
        continue
      }
    }

    // No type keyword on this line: treat it as a wrapped continuation of the
    // previous definition (e.g. "country, etc." spilling onto a new line).
    if (lastWord) {
      lastWord.def = `${lastWord.def} ${line}`.trim()
    }
  }

  // Drop any date groups that ended up empty.
  for (const key of Object.keys(data)) {
    if (data[key].length === 0) delete data[key]
  }
  return data
}
