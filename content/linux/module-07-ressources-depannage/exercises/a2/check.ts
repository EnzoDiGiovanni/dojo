import type { Criterion } from '#check'
import { fail, lines, onVps, pass, type Vps } from '../../../helpers.ts'

const VPS = 'dojo-linux-m7-a2'
const DIR = '/var/spool/sessions'

const recentMissing = async (vps: Vps) => lines(await vps.out(`while read -r f; do [ -f ${DIR}/$f ] || echo $f; done < /root/.dojo/sessions-recentes.txt`))

export default [
  {
    id: 'writable',
    label: 'La boutique peut de nouveau créer des sessions',
    run: onVps(VPS, async (vps) => {
      if ((await vps.out('systemctl is-active boutique-sessions')) !== 'active') return fail('Le service boutique-sessions ne tourne pas.')
      const probe = `${DIR}/sess_dojo-sonde-${Date.now().toString(36)}`
      const r = await vps.sh(`setpriv --reuid=www-data --regid=www-data --init-groups sh -c 'echo {} > ${probe}' 2>&1; s=$?; rm -f ${probe}; exit $s`)
      return r.code === 0 ? pass() : fail(`Création d'une session en tant que www-data : ${r.stdout.trim().split('\n')[0]}`)
    }),
  },
  {
    id: 'inodes',
    label: 'Moins de la moitié des inodes de `/var/spool/sessions` sont utilisés',
    run: onVps(VPS, async (vps) => {
      const [used, total] = (await vps.out(`df -Pi ${DIR} | awk 'NR == 2 { print $3, $2 }'`)).split(' ').map(Number)
      return used / total < 0.5 ? pass(`${used} inodes utilisés sur ${total}.`) : fail(`${used} inodes utilisés sur ${total}.`)
    }),
  },
  {
    id: 'recent',
    label: 'Les sessions de moins d\'un jour sont toujours là',
    run: onVps(VPS, async (vps) => {
      const missing = await recentMissing(vps)
      return missing.length ? fail(`${missing.length} session(s) récente(s) supprimée(s), dont ${missing[0]}.`) : pass()
    }),
  },
  {
    id: 'tmpfiles',
    label: 'Une règle systemd-tmpfiles nettoie les sessions de plus d\'un jour, sans toucher aux sessions récentes',
    run: onVps(VPS, async (vps) => {
      const rule = lines(await vps.out(`systemd-tmpfiles --cat-config 2>/dev/null | grep -E '^\\s*[dDeqQv]!?\\s+${DIR}/?\\s'`))[0]
      if (!rule) return fail(`Aucune règle systemd-tmpfiles pour ${DIR}.`)
      const age = rule.split(' ')[6]
      if (!age || age === '-') return fail(`La règle « ${rule} » ne donne pas d'âge de nettoyage.`)
      const usec = Number(await vps.out(`systemd-analyze timespan '${age.replace(/^~/, '').replace(/^[aAbBcCmM]+:/, '')}' 2>/dev/null | sed -n 's/.*μs: //p'`))
      if (!usec || usec > 86_400e6) return fail(`Âge de nettoyage de la règle : ${age}.`)
      const r = await vps.sh('systemd-tmpfiles --clean 2>&1')
      if (r.code !== 0) return fail(`systemd-tmpfiles --clean : ${r.stdout.trim().split('\n')[0]}`)
      const missing = await recentMissing(vps)
      return missing.length ? fail(`Après systemd-tmpfiles --clean, ${missing.length} session(s) récente(s) ont disparu.`) : pass(`Règle : ${rule}`)
    }),
  },
] satisfies Criterion[]
