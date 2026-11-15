import type { Criterion } from '#check'
import { fail, onVps, pass } from '../../../helpers.ts'

const VPS = 'dojo-linux-m3-a1'

export default [
  {
    id: 'hog',
    label: 'Le processus qui consommait tout le processeur est arrêté',
    run: onVps(VPS, async (vps) => {
      const pids = await vps.out("pgrep -f '[/]opt/stats/calcul-stats'")
      return pids ? fail(`Encore en cours : ${pids.split('\n').length} processus /opt/stats/calcul-stats.`) : pass()
    }),
  },
  {
    id: 'export',
    label: 'L\'export de Lea tourne toujours, sans avoir été relancé, avec une priorité nice de 15',
    run: onVps(VPS, async (vps) => {
      const original = await vps.out('cat /root/.dojo/export.pid')
      const pids = (await vps.out("pgrep -f '[/]opt/export/export-nuit'")).split('\n').filter(Boolean)
      if (!pids.length) return fail('Aucun processus /opt/export/export-nuit.')
      if (!pids.includes(original)) return fail(`L'export tourne sous le PID ${pids.join(', ')}, ce n'est plus le processus d'origine (${original}).`)
      const nice = await vps.out(`ps -o ni= -p ${original}`)
      return nice === '15' ? pass() : fail(`Priorité nice de l'export : ${nice}.`)
    }),
  },
  {
    id: 'port',
    label: 'Plus rien n\'écoute sur le port 9000',
    run: onVps(VPS, async (vps) => {
      const listening = await vps.out(`ss -ltnpH 'sport = :9000'`)
      return listening ? fail(`En écoute : ${listening.split(/\s+/).slice(3).join(' ')}.`) : pass()
    }),
  },
  {
    id: 'api',
    label: 'L\'API interne répond toujours sur le port 8081 du serveur',
    run: onVps(VPS, async (vps) => {
      const body = await vps.out('curl -s --max-time 3 http://127.0.0.1:8081/')
      return body.includes('api interne : ok') ? pass() : fail(`Réponse sur le port 8081 : ${body ? `« ${body.slice(0, 60)} »` : 'aucune'}.`)
    }),
  },
] satisfies Criterion[]
