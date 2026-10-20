const http = require('node:http')
const dayjs = require('dayjs')

const port = Number(process.env.PORT ?? 3000)

const notes = [
  { id: 1, text: 'Commander la farine de seigle', createdAt: dayjs().subtract(2, 'day') },
  { id: 2, text: 'Réviser le four n°2', createdAt: dayjs().subtract(5, 'hour') },
]

const server = http.createServer((req, res) => {
  if (req.url === '/notes') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    return res.end(JSON.stringify(notes.map((n) => ({ ...n, createdAt: n.createdAt.format('DD/MM HH:mm') }))))
  }
  res.statusCode = 404
  res.end('not found\n')
})

server.listen(port, () => console.log(`[dojo-notes] écoute sur le port ${port}`))

process.on('SIGTERM', () => {
  console.log('[dojo-notes] arrêt propre')
  server.close(() => process.exit(0))
})
