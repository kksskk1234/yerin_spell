import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// In production the Netlify function (netlify/functions/recognize.mts) serves
// /api/recognize. In dev we run the same shared core (lib/extractVocab.ts)
// through a Vite middleware so `pnpm dev` works end-to-end with the API key
// read from .env.local.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  return {
    plugins: [
      vue(),
      {
        name: 'recognize-api-dev',
        configureServer(server) {
          // In-memory stand-in for Netlify Blobs during local dev.
          let devWords: unknown = null
          server.middlewares.use('/api/words', async (req: any, res: any) => {
            const send = (status: number, payload: unknown) => {
              res.statusCode = status
              res.setHeader('content-type', 'application/json')
              res.end(JSON.stringify(payload))
            }
            if (req.method === 'GET') return send(200, devWords)
            if (req.method === 'PUT' || req.method === 'POST') {
              let raw = ''
              await new Promise<void>((resolve) => {
                req.on('data', (chunk: any) => (raw += chunk))
                req.on('end', () => resolve())
              })
              try {
                devWords = raw ? JSON.parse(raw) : null
              } catch {
                return send(400, { error: 'Invalid JSON body.' })
              }
              return send(200, { ok: true })
            }
            if (req.method === 'DELETE') {
              devWords = null
              return send(200, { ok: true })
            }
            return send(405, { error: 'Method not allowed.' })
          })

          server.middlewares.use('/api/recognize', async (req: any, res: any) => {
            const send = (status: number, payload: unknown) => {
              res.statusCode = status
              res.setHeader('content-type', 'application/json')
              res.end(JSON.stringify(payload))
            }
            try {
              if (req.method !== 'POST') return send(405, { error: 'Method not allowed.' })
              if (!env.ANTHROPIC_API_KEY)
                return send(500, { error: 'ANTHROPIC_API_KEY is not set in .env.local.' })

              let raw = ''
              await new Promise<void>((resolve) => {
                req.on('data', (chunk: any) => (raw += chunk))
                req.on('end', () => resolve())
              })
              const body = raw ? JSON.parse(raw) : {}
              const images = Array.isArray(body.images) ? body.images : []
              if (images.length === 0) return send(400, { error: 'No images provided.' })

              const { extractVocab } = await server.ssrLoadModule('/lib/extractVocab.ts')
              const data = await extractVocab({
                images,
                apiKey: env.ANTHROPIC_API_KEY,
                model: env.ANTHROPIC_MODEL,
              })
              send(200, data)
            } catch (err: any) {
              send(typeof err?.status === 'number' ? err.status : 500, {
                error: err?.message || 'Recognition failed.',
              })
            }
          })
        },
      },
    ],
  }
})
