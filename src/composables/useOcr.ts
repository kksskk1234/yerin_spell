import Tesseract from 'tesseract.js'

/**
 * Runs English OCR on an image file using tesseract.js. The worker, wasm core
 * and language data are fetched from a CDN on first use (needs internet once,
 * then cached by the browser).
 */
export function useOcr() {
  async function recognize(file: File, onProgress?: (progress: number) => void): Promise<string> {
    const { data } = await Tesseract.recognize(file, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text' && onProgress) onProgress(m.progress)
      },
    })
    return data.text
  }

  return { recognize }
}
