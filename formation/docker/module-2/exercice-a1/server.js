const http = require('node:http')

const port = Number(process.env.PORT ?? 3000)

const server = http.createServer((req, res) => {
  if (req.url === '/health') return res.end('ok\n')
  res.end('Bonjour depuis dojo-m2\n')
})

server.listen(port, () => console.log(`Écoute sur le port ${port}`))

process.on('SIGTERM', () => server.close(() => process.exit(0)))
