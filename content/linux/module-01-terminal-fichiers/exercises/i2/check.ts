import type { Criterion } from '#check'
import { fail, onVps, pass, q, writeAccessLog, type Vps } from '../../../helpers.ts'

const VPS = 'dojo-linux-m1-i2'
const SCRIPT = '/home/ubuntu/outils/rapport.sh'
const PROVIDED = '/var/log/vitrine/access.log'

interface Report { requetes?: string; erreurs_5xx?: string; url_5xx?: string }

async function expected(vps: Vps, log: string): Promise<Report> {
  const out = await vps.out(`
    awk 'NF { n++ } $9 ~ /^5[0-9][0-9]$/ { e++; split($7, p, "?"); c[p[1]]++ }
         END { best = ""; for (u in c) if (c[u] > c[best]) best = u; printf "%d %d %s", n, e, best }' ${q(log)}`)
  const [requetes, erreurs_5xx, url_5xx] = out.split(' ')
  return { requetes, erreurs_5xx, url_5xx }
}

async function report(vps: Vps, log: string): Promise<{ report: Report | null; observed: string }> {
  if (!(await vps.test(`test -f ${SCRIPT}`))) return { report: null, observed: `${SCRIPT} n'existe pas.` }
  const r = await vps.as('ubuntu', `bash ${SCRIPT} ${q(log)}`)
  const parsed: Report = {}
  for (const line of r.stdout.split('\n')) {
    const m = line.match(/^\s*(requetes|erreurs_5xx|url_5xx)\s*:\s*(\S*)\s*$/)
    if (m) parsed[m[1] as keyof Report] = m[2]
  }
  if (!Object.keys(parsed).length) {
    const first = (r.stdout.trim() || r.stderr.trim()).split('\n')[0] ?? ''
    return { report: null, observed: `Aucune ligne au format attendu dans la sortie (code ${r.code})${first ? ` : « ${first.slice(0, 80)} »` : ''}.` }
  }
  return { report: parsed, observed: '' }
}

const shown = (r: Report, k: keyof Report) => (r[k] === undefined ? `${k} absent` : `${k}: ${r[k]}`)

function compare(got: Report, want: Report, keys: (keyof Report)[]) {
  const wrong = keys.filter((k) => got[k] !== want[k])
  return wrong.length ? fail(`Le rapport affiche ${wrong.map((k) => shown(got, k)).join(', ')}.`) : pass()
}

export default [
  {
    id: 'counts',
    label: 'Sur le journal fourni, le rapport compte exactement les requêtes et les erreurs 5xx',
    run: onVps(VPS, async (vps) => {
      const { report: got, observed } = await report(vps, PROVIDED)
      return got ? compare(got, await expected(vps, PROVIDED), ['requetes', 'erreurs_5xx']) : fail(observed)
    }),
  },
  {
    id: 'url',
    label: 'Sur le journal fourni, le rapport indique le chemin le plus touché par les erreurs 5xx, sans paramètres',
    run: onVps(VPS, async (vps) => {
      const { report: got, observed } = await report(vps, PROVIDED)
      return got ? compare(got, await expected(vps, PROVIDED), ['url_5xx']) : fail(observed)
    }),
  },
  {
    id: 'other-log',
    label: 'Le rapport est exact sur un autre journal, quel que soit son chemin',
    run: onVps(VPS, async (vps) => {
      const log = '/tmp/dojo check/incident du 12.log'
      await writeAccessLog(vps, log, Date.now() % 100_000)
      const { report: got, observed } = await report(vps, log)
      const outcome = got ? compare(got, await expected(vps, log), ['requetes', 'erreurs_5xx', 'url_5xx']) : fail(observed)
      await vps.sh(`rm -rf ${q('/tmp/dojo check')}`)
      return outcome
    }),
  },
] satisfies Criterion[]
