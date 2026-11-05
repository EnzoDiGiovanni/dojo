// Usage : node greet.js [--shout] <nom>
const args = process.argv.slice(2)
const shout = args.includes('--shout')
const name = args.find((a) => a !== '--shout')

if (!name) {
  console.error('usage : greet [--shout] <nom>')
  process.exit(1)
}

const message = `Bonjour, ${name} !`
console.log(shout ? message.toUpperCase() : message)
