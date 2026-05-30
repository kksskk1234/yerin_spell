/**
 * Netlify serverless function (v2, Web Request/Response API).
 * Mapped to /api/recognize via the `config.path` export below.
 *
 * The ANTHROPIC_API_KEY must be set in Netlify:
 *   Site settings → Environment variables → ANTHROPIC_API_KEY
 * (.env.local is local-only; it is gitignored and never deployed.)
 */

import { extractVocab } from '../../lib/extractVocab'

const JSON_HEADERS = { 'content-type': 'application/json' }

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed.' }), {
      status: 405,
      headers: JSON_HEADERS,
    })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured on the server.' }),
      { status: 500, headers: JSON_HEADERS },
    )
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), {
      status: 400,
      headers: JSON_HEADERS,
    })
  }

  const images = Array.isArray(body.images)
    ? body.images
    : body.image
      ? [{ data: body.image, mediaType: body.mediaType }]
      : []
  if (images.length === 0) {
    return new Response(JSON.stringify({ error: 'No images provided.' }), {
      status: 400,
      headers: JSON_HEADERS,
    })
  }

  try {
    const data = await extractVocab({ images, apiKey })
    return new Response(JSON.stringify(data), { status: 200, headers: JSON_HEADERS })
  } catch (err: any) {
    const status = typeof err?.status === 'number' ? err.status : 500
    return new Response(JSON.stringify({ error: err?.message || 'Recognition failed.' }), {
      status,
      headers: JSON_HEADERS,
    })
  }
}

// Netlify v2: route this function directly at /api/recognize.
export const config = { path: '/api/recognize' }
