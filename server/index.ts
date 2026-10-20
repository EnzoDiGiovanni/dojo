import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { api } from './api.ts'
import { ROOT } from './paths.ts'

const PORT = Number(process.env.DOJO_PORT ?? 4317)
// Loopback only: this server runs docker commands on the learner's machine.
const HOST = '127.0.0.1'

const app = new Hono().route('/api', api)

if (process.env.NODE_ENV === 'production') {
  const dist = path.join(ROOT, 'dist')
  app.use('/*', serveStatic({ root: path.relative(process.cwd(), dist) }))
  app.get('*', async (c) => c.html(await readFile(path.join(dist, 'index.html'), 'utf8')))
}

serve({ fetch: app.fetch, port: PORT, hostname: HOST }, () => {
  const url = process.env.NODE_ENV === 'production' ? `http://${HOST}:${PORT}` : `http://${HOST}:5173`
  console.log(`Dojo prêt sur ${url}`)
})
