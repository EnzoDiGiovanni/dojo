// Usage : node server.js --motd <message>
const http = require('node:http')

const motdIndex = process.argv.indexOf('--motd')
const motd = motdIndex === -1 ? undefined : process.argv[motdIndex + 1]
if (!motd) {
  console.error('usage : node server.js --motd <message>')
  process.exit(1)
}

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  if (req.url === '/version') return res.end(`${process.env.APP_VERSION ?? ''}\n`)
  res.end(`${motd}\n`)
})

server.listen(3000, () => console.log('Écoute sur le port 3000'))

process.on('SIGTERM', () => {
  console.log('arrêt propre')
  server.close(() => process.exit(0))
})
