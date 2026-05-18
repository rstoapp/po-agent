import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const token = env.VITE_NOTION_TOKEN
  console.log('[notion proxy] token loaded:', token ? `${token.slice(0, 12)}...` : 'MISSING')

  // Absolute path for the allowed output directory (security: no path traversal outside this)
  const ALLOWED_OUTPUT_DIR = path.resolve(
    '/Users/daniellebennett/Desktop/6. Projects/RSTO/03 Product & Technology/03 Repositories/rsto-context/docs/10-generated-requirements'
  )

  return {
    plugins: [
      react(),
      {
        name: 'save-doc-middleware',
        configureServer(server) {
          server.middlewares.use('/api/save-doc', (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405
              res.end(JSON.stringify({ error: 'Method not allowed' }))
              return
            }
            let body = ''
            req.on('data', chunk => { body += chunk })
            req.on('end', () => {
              try {
                const { path: filePath, content } = JSON.parse(body)
                if (!filePath || !content) throw new Error('Missing path or content')

                // Security: resolve and verify path stays inside the allowed directory
                const resolved = path.resolve(filePath)
                if (!resolved.startsWith(ALLOWED_OUTPUT_DIR)) {
                  res.statusCode = 403
                  res.end(JSON.stringify({ error: 'Path outside allowed directory' }))
                  return
                }

                fs.mkdirSync(path.dirname(resolved), { recursive: true })
                fs.writeFileSync(resolved, content, 'utf-8')
                console.log(`[save-doc] Written: ${resolved}`)
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ ok: true, path: resolved }))
              } catch (e) {
                res.statusCode = 500
                res.end(JSON.stringify({ error: e.message }))
              }
            })
          })
        },
      },
    ],
    server: {
      proxy: {
        '/api/notion': {
          target: 'https://api.notion.com/v1',
          changeOrigin: true,
          rewrite: p => p.replace(/^\/api\/notion/, ''),
          headers: {
            'Authorization': `Bearer ${token}`,
            'Notion-Version': '2022-06-28',
          },
        },
      },
    },
  }
})
