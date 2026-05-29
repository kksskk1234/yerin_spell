export interface Word {
  /** The spelling word itself, e.g. "glacier" */
  word: string
  /** Child-friendly definition shown on screen */
  def: string
  /** Optional example sentence */
  sent?: string
}

/** A day label (e.g. "Mon, June 1st") mapped to its list of words */
export type WordData = Record<string, Word[]>

/** 1 = read/listen, 2 = write in order, 3 = write shuffled */
export type Mode = 1 | 2 | 3
