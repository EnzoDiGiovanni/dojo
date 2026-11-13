import type { Criterion } from '#check'
import { fail, lines, onVps, pass } from '../../../helpers.ts'

const VPS = 'dojo-linux-m7-a1'

export default [
  {
    id: 'usage',
    label: '`/srv/donnees` est utilisé à moins de 50 %',
    run: onVps(VPS, async (vps) => {
      const pct = Number(await vps.out(`df -P /srv/donnees | awk 'NR == 2 { sub(/%/, "", $5); print $5 }'`))
      return pct < 50 ? pass(`Utilisation : ${pct} %.`) : fail(`Utilisation de /srv/donnees : ${pct} %.`)
    }),
  },
  {
    id: 'clients',
    label: 'Les données des clients sont intactes',
    run: onVps(VPS, async (vps) => {
      const r = await vps.sh('cd /srv/donnees/clients && sha256sum --quiet -c /root/.dojo/clients.sha256 2>&1')
      return r.code === 0 ? pass() : fail(`Données clients modifiées ou absentes : ${lines(r.stdout).slice(0, 2).join(' ; ')}.`)
    }),
  },
  {
    id: 'service',
    label: 'Le service `rapport-gen` tourne',
    run: onVps(VPS, async (vps) => {
      const state = await vps.out('systemctl is-active rapport-gen')
      return state === 'active' ? pass() : fail(`rapport-gen est ${state}.`)
    }),
  },
  {
    id: 'deleted',
    label: 'Plus aucun fichier supprimé n\'occupe d\'espace sur `/srv/donnees`',
    run: onVps(VPS, async (vps) => {
      const held = lines(await vps.out(`lsof -nP +L1 2>/dev/null | awk 'NR > 1 && $0 ~ /\\/srv\\/donnees\\// { print $1 " (PID " $2 ", " $3 ") : " $10 " " $11 }'`))
      return held.length ? fail(`Encore ouvert : ${held[0]}${held.length > 1 ? ` (+${held.length - 1})` : ''}.`) : pass()
    }),
  },
] satisfies Criterion[]
