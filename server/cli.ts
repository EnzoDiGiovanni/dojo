// Commands for the Claude Code coach, which must not edit progression.md by hand.
import { HttpError } from './errors.ts'
import { progressionFile } from './paths.ts'
import { addCoachNote, recordExplanation } from './service.ts'

const usage = `Usage :
  npm run dojo -- explain <sujet> <module> ok|ko ["note"]   verdict sur les justifications d'une validation
  npm run dojo -- note <sujet> "texte"                       ajoute une entrée coach au journal`

async function main(args: string[]): Promise<string> {
  const [command, subject, ...rest] = args
  if (command === 'explain' && subject) {
    const [module, verdict, ...note] = rest
    if (!/^\d+$/.test(module ?? '') || (verdict !== 'ok' && verdict !== 'ko')) throw new Error(usage)
    return recordExplanation(subject, Number(module), verdict, note.join(' '))
  }
  if (command === 'note' && subject && rest.length) {
    await addCoachNote(subject, rest.join(' '))
    return 'Note ajoutée au journal.'
  }
  throw new Error(usage)
}

main(process.argv.slice(2)).then(
  (message) => {
    console.log(`${message}\nProgression : ${progressionFile(process.argv[3])}`)
  },
  (error: unknown) => {
    console.error(error instanceof HttpError || error instanceof Error ? error.message : error)
    process.exit(1)
  },
)
