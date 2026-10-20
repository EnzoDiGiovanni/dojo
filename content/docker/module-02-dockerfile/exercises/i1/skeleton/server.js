const http = require('node:http')
const dayjs = require('dayjs')

const port = Number(process.env.PORT ?? 3000)

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.end(`dojo-m2-i1 (${process.env.NODE_ENV ?? 'development'}) — ${dayjs().format('DD/MM/YYYY HH:mm')}\n`)
})

server.listen(port, () => console.log(`Écoute sur le port ${port}`))

process.on('SIGTERM', () => server.close(() => process.exit(0)))
