const http = require('node:http')
const ms = require('ms')

const startedAt = Date.now()

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.end(`dojo-m2-a2 — en ligne depuis ${ms(Date.now() - startedAt, { long: true })}\n`)
})

server.listen(3000, () => console.log('Écoute sur le port 3000'))

process.on('SIGTERM', () => server.close(() => process.exit(0)))
