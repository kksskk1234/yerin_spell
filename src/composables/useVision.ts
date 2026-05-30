/**
 * Sends worksheet images to the /api/recognize serverless function, which uses
 * Claude vision to extract words, definitions and kid-friendly example
 * sentences. Images are downscaled before upload to keep the request small and
 * the token cost low while staying legible.
 */

export interface VisionWord {
  word: string
  partOfSpeech: string
  definition: string
  sentence: string
}

export interface VisionSection {
  date: string
  words: VisionWord[]
}

const MAX_EDGE = 2048

async function fileToPayload(file: File): Promise<{ data: string; mediaType: string }> {
  const bitmap = await createImageBitmap(file)
  const longest = Math.max(bitmap.width, bitmap.height)
  const scale = longest > MAX_EDGE ? MAX_EDGE / longest : 1

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('이미지 변환에 실패했습니다.'))),
      'image/jpeg',
      0.9,
    ),
  )
  return { data: await blobToBase64(blob), mediaType: 'image/jpeg' }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export function useVision() {
  async function recognizeImages(files: File[]): Promise<VisionSection[]> {
    const images = await Promise.all(files.map(fileToPayload))

    const res = await fetch('/api/recognize', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ images }),
    })

    if (!res.ok) {
      let msg = `요청에 실패했습니다 (${res.status}).`
      try {
        const body = await res.json()
        if (body?.error) msg = body.error
      } catch {
        // keep the default message
      }
      throw new Error(msg)
    }

    const data = await res.json()
    return Array.isArray(data?.sections) ? (data.sections as VisionSection[]) : []
  }

  return { recognizeImages }
}
