import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// In production the file under api/ is deployed as a serverless function.
// In dev we run that same handler through a Vite middleware so `pnpm dev`
// works end-to-end with the API key read from .env.local.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  return {
    plugins: [
      vue(),
      {
        name: 'recognize-api-dev',
        configureServer(server) {
          server.middlewares.use('/api/recognize', async (req, res) => {
            try {
              const mod = await server.ssrLoadModule('/api/recognize.ts')
              await mod.recognize(req, res, {
                apiKey: env.ANTHROPIC_API_KEY,
                model: env.ANTHROPIC_MODEL,
              })
            } catch (err) {
              res.statusCode = 500
              res.setHeader('content-type', 'application/json')
              res.end(JSON.stringify({ error: (err as Error).message }))
            }
          })
        },
      },
    ],
  }
})
