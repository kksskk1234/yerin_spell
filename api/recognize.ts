/**
 * Serverless function: digitize a vocabulary worksheet image with Claude vision.
 *
 * Runs on Vercel (default export = Node serverless handler) and is also driven
 * by the Vite dev server (named `recognize` export, see vite.config.ts) so the
 * same code works with `pnpm dev` locally and in production.
 *
 * The API key lives only here on the server — the browser never sees it.
 *
 * Request  (POST, JSON): { images: [{ data: <base64>, mediaType?: string }] }
 * Response (JSON):       { sections: [{ date, words: [{ word, partOfSpeech, definition, sentence }] }] }
 */

import Anthropic from '@anthropic-ai/sdk'

// Defaulting to Haiku to keep cost low — it handles this worksheet extraction
// well. Override with ANTHROPIC_MODEL=claude-opus-4-8 for maximum accuracy on
// hard-to-read images.
const MODEL_DEFAULT = 'claude-haiku-4-5'

const SYSTEM_PROMPT = `You are a meticulous assistant that digitizes children's English vocabulary worksheets into structured data.

You receive one or more photos/scans of a "Vocabulary Test List". Each worksheet is a table whose columns (some may be faint, missing, or misaligned) are:
- a small checkbox column on the left — IGNORE it completely
- the vocabulary Word
- the Type of Word (part of speech: noun, verb, adjective, superlative adjective, phrase, etc.)
- the Definition

Rows are grouped under date headers like "Mon, June 1st: Subject Link" or "Tue, June 2nd: Bricks Reading".

Your job:
1. Read every row accurately. Use context to correct garbled or smudged text — if a word is unclear but its definition is obvious, infer the correct word.
2. Completely ignore the checkbox column and any stray marks (it often looks like "[", "|", or a box). Never let it leak into the word.
3. For EVERY word, write ONE short, natural example sentence appropriate for an 8–10 year old child. The sentence must use the exact word, be grammatically correct, clearly show the word's meaning, and stay under ~12 words.
4. Group words under their date. Output a clean date label: weekday abbreviation + month + ordinal day, e.g. "Mon, June 1st". Drop the trailing topic text after the colon.
5. If a cell is truly unreadable, make your best reasonable guess rather than leaving it empty.

Return only the structured data.`

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    sections: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          date: { type: 'string' },
          words: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                word: { type: 'string' },
                partOfSpeech: { type: 'string' },
                definition: { type: 'string' },
                sentence: { type: 'string' },
              },
              required: ['word', 'partOfSpeech', 'definition', 'sentence'],
            },
          },
        },
        required: ['date', 'words'],
      },
    },
  },
  required: ['sections'],
}

interface ImageInput {
  data: string
  mediaType?: string
}

function json(res: any, status: number, payload: unknown): void {
  res.statusCode = status
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify(payload))
}

async function readBody(req: any): Promise<any> {
  // Vercel pre-parses JSON bodies; the Vite dev server does not.
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string') return req.body ? JSON.parse(req.body) : {}
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? JSON.parse(raw) : {}
}

export async function recognize(
  req: any,
  res: any,
  opts: { apiKey?: string; model?: string } = {},
): Promise<void> {
  if (req.method !== 'POST') {
    json(res, 405, { error: 'Method not allowed.' })
    return
  }

  const apiKey = opts.apiKey || process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    json(res, 500, {
      error: 'ANTHROPIC_API_KEY is not configured on the server.',
    })
    return
  }

  let body: any
  try {
    body = await readBody(req)
  } catch {
    json(res, 400, { error: 'Invalid JSON body.' })
    return
  }

  const images: ImageInput[] = Array.isArray(body.images)
    ? body.images
    : body.image
      ? [{ data: body.image, mediaType: body.mediaType }]
      : []
  if (images.length === 0) {
    json(res, 400, { error: 'No images provided.' })
    return
  }

  const client = new Anthropic({ apiKey })
  const model = opts.model || process.env.ANTHROPIC_MODEL || MODEL_DEFAULT

  const content: any[] = images.map((img) => ({
    type: 'image',
    source: {
      type: 'base64',
      media_type: img.mediaType || 'image/jpeg',
      data: img.data,
    },
  }))
  content.push({
    type: 'text',
    text: 'Digitize the worksheet image(s) into the structured schema. Include a kid-friendly example sentence for every word.',
  })

  try {
    const message = await client.messages.create({
      model,
      max_tokens: 8000,
      // The instructions are stable across requests, so cache them; only the
      // image (after this block) varies.
      system: [
        { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content }],
      // Structured outputs guarantee the response matches SCHEMA exactly.
      output_config: { format: { type: 'json_schema', schema: SCHEMA } },
    } as any)

    const textBlock = message.content.find((b: any) => b.type === 'text') as
      | { text: string }
      | undefined
    if (!textBlock) {
      json(res, 502, { error: 'Model returned no usable output.' })
      return
    }
    json(res, 200, JSON.parse(textBlock.text))
  } catch (err: any) {
    const status = typeof err?.status === 'number' ? err.status : 500
    json(res, status, { error: err?.message || 'Recognition failed.' })
  }
}

export default function handler(req: any, res: any) {
  return recognize(req, res)
}
