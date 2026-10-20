import type { CheckContext, Criterion } from '#check'
import { fail, pass } from '../../../helpers.ts'

const IMAGE = 'dojo/m2-a3:1.0'

async function prints(ctx: CheckContext, args: string[], expected: string) {
  if (!(await ctx.inspectImage(IMAGE))) return fail('Aucune image dojo/m2-a3:1.0 sur ta machine.')
  const r = await ctx.runOnce(IMAGE, args)
  const out = (r.stdout + r.stderr).trim()
  if (out === expected) return pass()
  const lines = out.split('\n')
  const telling = lines.find((l) => /error|usage|not found/i.test(l)) ?? lines[0]
  return fail(`Sortie obtenue (code ${r.code}) : « ${telling.trim().slice(0, 100)} ».`)
}

export default [
  {
    id: 'default',
    label: 'Sans argument, l\'image affiche `Bonjour, monde !`',
    run: (ctx) => prints(ctx, [], 'Bonjour, monde !'),
  },
  {
    id: 'name',
    label: 'Avec l\'argument `Alice`, l\'image affiche `Bonjour, Alice !`',
    run: (ctx) => prints(ctx, ['Alice'], 'Bonjour, Alice !'),
  },
  {
    id: 'shout',
    label: 'Avec les arguments `--shout Alice`, l\'image affiche `BONJOUR, ALICE !`',
    run: (ctx) => prints(ctx, ['--shout', 'Alice'], 'BONJOUR, ALICE !'),
  },
] satisfies Criterion[]
