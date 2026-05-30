/**
 * Shared server-only logic: send worksheet images to Claude vision and get back
 * structured vocabulary (word, part-of-speech, definition, kid-friendly
 * example sentence). Imported by both the Netlify function and the Vite dev
 * middleware so local dev and production run identical code.
 *
 * This module is server-only (it holds the Anthropic SDK + API key usage) and
 * is never imported by client code, so it stays out of the browser bundle.
 */

import Anthropic from '@anthropic-ai/sdk'

// Defaulting to Haiku to keep cost low — it handles this extraction well.
// Override with ANTHROPIC_MODEL=claude-opus-4-8 for hard-to-read images.
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

export interface ImageInput {
  data: string
  mediaType?: string
}

export async function extractVocab(opts: {
  images: ImageInput[]
  apiKey: string
  model?: string
}): Promise<any> {
  const client = new Anthropic({ apiKey: opts.apiKey })
  const model = opts.model || process.env.ANTHROPIC_MODEL || MODEL_DEFAULT

  const content: any[] = opts.images.map((img) => ({
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

  const message = await client.messages.create({
    model,
    max_tokens: 8000,
    // Instructions are stable across requests, so cache them; only the image varies.
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
  if (!textBlock) throw new Error('Model returned no usable output.')
  return JSON.parse(textBlock.text)
}
