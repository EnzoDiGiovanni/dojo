import type { Criterion } from '#check'
import { containerRunning, fail, httpAnswers, pass } from '../../../helpers.ts'

export default [
  {
    id: 'site',
    label: 'http://127.0.0.1:47110 sert la page de la boulangerie (contient « Boulangerie Dojo »)',
    run: (ctx) => httpAnswers(ctx, 'http://127.0.0.1:47110', { contains: 'Boulangerie Dojo' }),
  },
  {
    id: 'api',
    label: 'http://127.0.0.1:47111 répond et affiche `Name: api`',
    run: (ctx) => httpAnswers(ctx, 'http://127.0.0.1:47111', { contains: 'Name: api' }),
  },
  {
    id: 'running',
    label: 'Les conteneurs `dojo-m1-d1-web` et `dojo-m1-d1-api` sont tous les deux en cours d\'exécution',
    async run(ctx) {
      for (const name of ['dojo-m1-d1-web', 'dojo-m1-d1-api']) {
        const outcome = await containerRunning(ctx, name)
        if (!outcome.ok) return fail(`${name} : ${outcome.observed}`)
      }
      return pass()
    },
  },
  {
    id: 'idempotent',
    label: 'Relancer `sh run.sh` alors que la stack tourne se termine sans erreur, et les deux services répondent ensuite',
    async run(ctx) {
      if (!(await ctx.readFile('run.sh'))) return fail('run.sh introuvable dans le dossier de l\'exercice.')
      const r = await ctx.exec('sh', ['run.sh'], { cwd: ctx.dir, timeoutMs: 120_000 })
      if (r.code !== 0) {
        const lines = r.stderr.trim().split('\n')
        return fail(`Le script s'est terminé avec le code ${r.code} : ${lines.find((l) => /error/i.test(l)) ?? lines[0] ?? ''}`)
      }
      const site = await ctx.waitForHttp('http://127.0.0.1:47110')
      const api = await ctx.waitForHttp('http://127.0.0.1:47111')
      if (!site?.body.includes('Boulangerie Dojo')) return fail('Après la relance, le site ne sert pas la page de la boulangerie.')
      if (!api?.body.includes('Name: api')) return fail('Après la relance, l\'API ne répond pas avec `Name: api`.')
      return pass()
    },
  },
] satisfies Criterion[]
