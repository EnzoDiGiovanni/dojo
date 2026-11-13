import type { Criterion } from '#check'
import { access, expectAccess, fail, onVps, pass } from '../../../helpers.ts'

const VPS = 'dojo-linux-m2-a3'
const allowed = (cmd: string) => `sudo -n -l ${cmd} >/dev/null 2>&1`

export default [
  {
    id: 'restart',
    label: '`nina` peut redémarrer le service cron avec sudo, sans mot de passe',
    run: onVps(VPS, async (vps) => {
      const before = await vps.out('systemctl show cron -p ExecMainStartTimestampMonotonic --value')
      const r = await vps.as('nina', 'sudo -n systemctl restart cron')
      if (r.code !== 0) return fail(`sudo systemctl restart cron, lancé par nina : ${r.stderr.trim().split('\n')[0] || `code ${r.code}`}.`)
      const after = await vps.out('systemctl show cron -p ExecMainStartTimestampMonotonic --value')
      return after !== before ? pass() : fail('La commande a réussi, mais le service cron n\'a pas redémarré.')
    }),
  },
  {
    id: 'nothing-else',
    label: '`nina` ne peut rien lancer d\'autre en root : ni shell, ni autre service, ni autre action sur cron',
    run: onVps(VPS, (vps) =>
      expectAccess(vps, [
        ['nina', 'ouvrir un shell root avec sudo', allowed('/bin/bash'), false],
        ['nina', 'lancer sudo -i', 'sudo -n -i true >/dev/null 2>&1', false],
        ['nina', 'redémarrer ssh avec sudo', allowed('/usr/bin/systemctl restart ssh'), false],
        ['nina', 'arrêter cron avec sudo', allowed('/usr/bin/systemctl stop cron'), false],
        ['nina', 'lancer `systemctl edit cron` avec sudo', allowed('/usr/bin/systemctl edit cron'), false],
        ['nina', 'redémarrer cron et ssh d\'un coup avec sudo', allowed('/usr/bin/systemctl restart cron ssh'), false],
        ['nina', 'lancer un éditeur avec sudo', allowed('/usr/bin/vim.tiny'), false],
        ['nina', 'lire /var/log/syslog avec sudo', allowed('/usr/bin/cat /var/log/syslog'), false],
      ]),
    ),
  },
  {
    id: 'syslog',
    label: '`nina` peut lire `/var/log/syslog` sans sudo',
    run: onVps(VPS, async (vps) => {
      if (!(await vps.test('test -f /var/log/syslog'))) return fail('/var/log/syslog n\'existe pas sur le serveur.')
      return expectAccess(vps, [['nina', 'lire /var/log/syslog', access.read('/var/log/syslog'), true]])
    }),
  },
  {
    id: 'config',
    label: 'La règle est dans un fichier de `/etc/sudoers.d/`, la configuration sudo est valide et `/etc/sudoers` n\'a pas changé',
    run: onVps(VPS, async (vps) => {
      if (!(await vps.test('sha256sum --quiet -c /root/.dojo/sudoers.sha256 >/dev/null 2>&1'))) return fail('/etc/sudoers a été modifié.')
      const check = await vps.sh('visudo -c')
      if (check.code !== 0) return fail(`visudo -c : ${(check.stdout + check.stderr).trim().split('\n').find((l) => !/parsed OK/.test(l)) ?? 'erreur'}`)
      const files = (await vps.out(`grep -lE '^[^#]*(nina|%)' /etc/sudoers.d/* 2>/dev/null | grep -v 90-cloud-init-users`)).split('\n').filter(Boolean)
      if (await vps.test('id -nG nina | grep -qw sudo')) return fail('nina est membre du groupe sudo.')
      return files.length ? pass(`Règle trouvée dans ${files.join(', ')}.`) : fail('Aucune règle sudo ne concerne nina dans /etc/sudoers.d/.')
    }),
  },
] satisfies Criterion[]
