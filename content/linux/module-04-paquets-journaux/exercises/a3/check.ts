import type { Criterion } from '#check'
import { fail, onVps, pass } from '../../../helpers.ts'

const VPS = 'dojo-linux-m4-a3'
const RULE = '/etc/logrotate.d/vitrine'
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export default [
  {
    id: 'valid',
    label: 'La règle `/etc/logrotate.d/vitrine` est valide et s\'applique à tous les journaux de `/var/log/vitrine`',
    run: onVps(VPS, async (vps) => {
      if (!(await vps.test(`test -f ${RULE}`))) return fail(`${RULE} n'existe pas.`)
      const r = await vps.sh(`logrotate -d -s /tmp/dojo-logrotate.state ${RULE} 2>&1`)
      const error = r.stdout.split('\n').find((l) => /^error/i.test(l.trim()))
      if (r.code !== 0 || error) return fail(`logrotate -d : ${error ?? `code ${r.code}`}`)
      const missing = ['app.log', 'acces.log'].filter((f) => !r.stdout.includes(`considering log /var/log/vitrine/${f}`))
      return missing.length ? fail(`La règle ne concerne pas : ${missing.join(', ')}.`) : pass()
    }),
  },
  {
    id: 'policy',
    label: 'Les journaux tournent chaque jour, 14 anciens journaux sont gardés, compressés',
    run: onVps(VPS, async (vps) => {
      const debug = await vps.out(`logrotate -d -s /tmp/dojo-logrotate.state ${RULE} 2>&1`)
      const policy = debug.match(/after (\d+) days \((\d+) rotations\)/)
      if (!policy) return fail('Aucune fréquence quotidienne trouvée dans la simulation de logrotate.')
      if (policy[1] !== '1' || policy[2] !== '14') return fail(`Simulation : rotation après ${policy[1]} jour(s), ${policy[2]} ancien(s) journaux gardés.`)
      const rule = (await vps.readFile(RULE)) ?? ''
      if (/^\s*copytruncate\b/m.test(rule)) return fail('La règle utilise copytruncate.')
      return /^\s*compress\b/m.test(rule) ? pass() : fail('La règle ne compresse pas les anciens journaux.')
    }),
  },
  {
    id: 'reopen',
    label: 'Après une rotation, l\'application écrit dans des fichiers neufs, et les anciens ne grossissent plus',
    run: onVps(VPS, async (vps) => {
      if ((await vps.out('systemctl is-active vitrine-app')) !== 'active') return fail('vitrine-app n\'est pas actif.')
      const r = await vps.sh(`logrotate -f -s /tmp/dojo-logrotate.state ${RULE} 2>&1`)
      if (r.code !== 0) return fail(`La rotation forcée échoue : ${r.stdout.trim().split('\n').pop()}`)
      await sleep(1500)
      const size = (f: string) => vps.out(`stat -c %s /var/log/vitrine/${f} 2>/dev/null || echo absent`)
      const before = { acces: await size('acces.log'), old: await size('acces.log.1') }
      await sleep(3000)
      const after = { acces: await size('acces.log'), old: await size('acces.log.1') }
      if (before.acces === 'absent') return fail('Après la rotation, acces.log n\'existe plus.')
      if (Number(after.acces) <= Number(before.acces)) return fail(`Après la rotation, acces.log ne grossit pas (${after.acces} octets).`)
      if (before.old !== 'absent' && after.old !== before.old) return fail('Après la rotation, acces.log.1 continue de grossir.')
      return pass(`acces.log : ${before.acces} → ${after.acces} octets en 3 s.`)
    }),
  },
] satisfies Criterion[]
