import type { Criterion } from '#check'

export default [
  {
    id: 'file',
    label: 'Le fichier ok.txt existe',
    run: async (ctx) => ((await ctx.readFile('ok.txt')) === null ? { ok: false, observed: 'absent' } : { ok: true }),
  },
] satisfies Criterion[]
