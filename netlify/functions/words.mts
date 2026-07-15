/**
 * Netlify function: shared word-list storage backed by Netlify Blobs.
 * Mapped to /api/words. Lets every device read/write the SAME word list, so a
 * sheet uploaded on one phone shows up on all the others.
 *
 *   GET    /api/words → the stored word data (or null if none yet)
 *   PUT    /api/words → save word data (request body = the data)
 *   DELETE /api/words → clear it (back to the built-in default everywhere)
 *
 * Netlify Blobs needs no setup or keys — it's provisioned automatically.
 */

import { getStore } from '@netlify/blobs'

const STORE = 'word-data'
const KEY = 'shared'
// no-store: the word list must never be served from a browser/CDN cache, or a
// device keeps showing the previous list (or the default) after someone uploads
// a new sheet on another device.
const JSON_HEADERS = { 'content-type': 'application/json', 'cache-control': 'no-store' }

export default async (req: Request): Promise<Response> => {
  const store = getStore(STORE)

  if (req.method === 'GET') {
    const data = await store.get(KEY, { type: 'json' })
    return new Response(JSON.stringify(data ?? null), { status: 200, headers: JSON_HEADERS })
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    let body: any
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), {
        status: 400,
        headers: JSON_HEADERS,
      })
    }
    await store.setJSON(KEY, body)
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: JSON_HEADERS })
  }

  if (req.method === 'DELETE') {
    await store.delete(KEY)
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: JSON_HEADERS })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed.' }), {
    status: 405,
    headers: JSON_HEADERS,
  })
}

export const config = { path: '/api/words' }
