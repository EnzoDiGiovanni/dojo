import type { Criterion } from '#check'
import { fail, lines, onVps, pass, q, writeAccessLog, type Vps } from '../../../helpers.ts'

const VPS = 'dojo-linux-m1-a3'
const SCRIPT = '/home/ubuntu/outils/top-ips.sh'

const reference = async (vps: Vps, log: string) =>
  lines(await vps.out(`awk '{print $1}' ${q(log)} | sort | uniq -c | sort -nr | head -n 5`))

async function compare(vps: Vps, log: string): Promise<{ ok: boolean; observed: string }> {
  if (!(await vps.test(`test -f ${SCRIPT}`))) return { ok: false, observed: `${SCRIPT} n'existe pas.` }
  const r = await vps.as('ubuntu', `bash ${SCRIPT} ${q(log)}`)
  const got = lines(r.stdout)
  const expected = await reference(vps, log)
  if (r.code !== 0 && got.length === 0) return { ok: false, observed: `Le script s'arrête avec le code ${r.code} : ${r.stderr.trim().split('\n')[0] ?? ''}` }
  if (got.join('\n') === expected.join('\n')) return { ok: true, observed: '' }
  if (got.length !== 5) return { ok: false, observed: `Le script affiche ${got.length} ligne(s) au lieu de 5${got[0] ? `, la première : « ${got[0].slice(0, 60)} »` : ''}.` }
  const first = got.findIndex((l, i) => l !== expected[i])
  return { ok: false, observed: `Ligne ${first + 1} affichée : « ${got[first].slice(0, 60)} ».` }
}

export default [
  {
    id: 'provided',
    label: 'Sur `/var/log/vitrine/access.log`, le script affiche les 5 adresses les plus actives au format `<nombre> <adresse>`, dans l\'ordre',
    run: onVps(VPS, async (vps) => {
      const r = await compare(vps, '/var/log/vitrine/access.log')
      return r.ok ? pass() : fail(r.observed)
    }),
  },
  {
    id: 'other-log',
    label: 'Le script donne le bon résultat sur un autre journal que celui fourni',
    run: onVps(VPS, async (vps) => {
      const log = '/tmp/dojo-check/acces-semaine.log'
      await writeAccessLog(vps, log, Date.now() % 100_000)
      const r = await compare(vps, log)
      await vps.sh('rm -rf /tmp/dojo-check')
      return r.ok ? pass() : fail(r.observed)
    }),
  },
  {
    id: 'spaces',
    label: 'Le script fonctionne avec un chemin de journal qui contient des espaces',
    run: onVps(VPS, async (vps) => {
      const log = '/tmp/dojo check/journal du lundi.log'
      await writeAccessLog(vps, log, 4242)
      const r = await compare(vps, log)
      await vps.sh(`rm -rf ${q('/tmp/dojo check')}`)
      return r.ok ? pass() : fail(r.observed)
    }),
  },
] satisfies Criterion[]
