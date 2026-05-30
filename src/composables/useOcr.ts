import { createWorker, PSM } from 'tesseract.js'

/**
 * Pre-process an image to give OCR the best chance on small worksheet text:
 *  - upscale small images so the letters are big enough to recognize
 *  - convert to grayscale and boost contrast so faint text stands out
 * Returns a canvas tesseract.js can read directly.
 */
async function preprocess(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file)
  const longest = Math.max(bitmap.width, bitmap.height)
  // Aim for ~1800px on the long side; never downscale.
  const scale = longest < 1800 ? Math.min(3, 1800 / longest) : 1

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const d = img.data
  const contrast = 1.5
  const intercept = 128 * (1 - contrast)
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    const v = Math.max(0, Math.min(255, gray * contrast + intercept))
    d[i] = d[i + 1] = d[i + 2] = v
  }
  ctx.putImageData(img, 0, 0)
  return canvas
}

/**
 * Runs English OCR on an image file using tesseract.js. The worker, wasm core
 * and language data are fetched from a CDN on first use (needs internet once,
 * then cached by the browser).
 *
 * Tuned for the vocabulary *tables* this app imports:
 *  - PSM.SINGLE_BLOCK reads the page as one block left-to-right, keeping each
 *    table row on a single text line. The default (AUTO) does layout analysis
 *    that often splits columns into separate blocks and reorders the cells.
 *  - preserve_interword_spaces keeps the wide gaps between columns, which the
 *    parser can use as a fallback column boundary.
 */
export function useOcr() {
  async function recognize(file: File, onProgress?: (progress: number) => void): Promise<string> {
    const worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text' && onProgress) onProgress(m.progress)
      },
    })
    try {
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
        preserve_interword_spaces: '1',
      })
      const image = await preprocess(file)
      const { data } = await worker.recognize(image)
      return data.text
    } finally {
      await worker.terminate()
    }
  }

  return { recognize }
}
