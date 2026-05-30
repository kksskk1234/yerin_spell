/**
 * Client side of the shared word list. Talks to /api/words (Netlify Blobs) so
 * every device sees the same words. All calls fail soft — if the network or
 * server is unavailable, the app still works from its local cache.
 */

import type { WordData } from '../types'

export async function fetchSharedWords(): Promise<WordData | null> {
  try {
    const res = await fetch('/api/words')
    if (!res.ok) return null
    const data = await res.json()
    return data && typeof data === 'object' ? (data as WordData) : null
  } catch {
    return null
  }
}

export async function saveSharedWords(data: WordData): Promise<void> {
  try {
    await fetch('/api/words', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    })
  } catch {
    // Offline — local copy is kept; sync will happen next time it's saved.
  }
}

export async function clearSharedWords(): Promise<void> {
  try {
    await fetch('/api/words', { method: 'DELETE' })
  } catch {
    // ignore
  }
}
