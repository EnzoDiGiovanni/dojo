import type { Criterion } from '#check'
import { fail, onVps, pass, type Vps } from '../../../helpers.ts'

const VPS = 'dojo-linux-m3-a3'
const mainPid = (vps: Vps) => vps.out('systemctl show meteo -p MainPID --value')
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export default [
  {
    id: 'active',
    label: '`meteo` est actif, et activé au démarrage du serveur',
    run: onVps(VPS, async (vps) => {
      if (!(await vps.test('systemctl cat meteo >/dev/null 2>&1'))) return fail('Aucune unit meteo.service.')
      const active = await vps.out('systemctl is-active meteo')
      const enabled = await vps.out('systemctl is-enabled meteo 2>/dev/null')
      return active === 'active' && enabled === 'enabled' ? pass() : fail(`meteo : ${active}, ${enabled || 'non activable'}.`)
    }),
  },
  {
    id: 'user',
    label: 'Le service tourne avec le compte `meteo`',
    run: onVps(VPS, async (vps) => {
      const pid = await mainPid(vps)
      if (!pid || pid === '0') return fail('Le service n\'a pas de processus en cours.')
      const user = await vps.out(`ps -o user= -p ${pid}`)
      return user === 'meteo' ? pass() : fail(`Le processus principal (PID ${pid}) tourne avec le compte ${user}.`)
    }),
  },
  {
    id: 'http',
    label: 'Sur le serveur, http://127.0.0.1:8090/ répond avec la ville « Lyon »',
    run: onVps(VPS, async (vps) => {
      const body = await vps.out('curl -s --max-time 3 http://127.0.0.1:8090/')
      if (!body) return fail('Rien ne répond sur le port 8090.')
      return body.includes('"Lyon"') ? pass() : fail(`Réponse : « ${body.slice(0, 80)} ».`)
    }),
  },
  {
    id: 'restart',
    label: 'Si le processus est tué brutalement, systemd le relance en moins de 5 secondes',
    run: onVps(VPS, async (vps) => {
      const before = await mainPid(vps)
      if (!before || before === '0') return fail('Le service n\'a pas de processus en cours.')
      await vps.sh(`kill -9 ${before}`)
      for (let i = 0; i < 10; i++) {
        await sleep(500)
        const now = await mainPid(vps)
        if (now && now !== '0' && now !== before && (await vps.out('systemctl is-active meteo')) === 'active') return pass(`Relancé sous le PID ${now}.`)
      }
      return fail(`5 secondes après le kill, meteo est ${await vps.out('systemctl is-active meteo')}.`)
    }),
  },
] satisfies Criterion[]
