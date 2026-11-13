import type { Criterion } from '#check'
import { fail, onVps, pass } from '../../../helpers.ts'

const VPS = 'dojo-linux-m3-i1'

export default [
  {
    id: 'timer',
    label: '`export.timer` est actif, activé au démarrage, et déclenche l\'export à chaque quart d\'heure pile',
    run: onVps(VPS, async (vps) => {
      if (!(await vps.test('systemctl cat export.timer >/dev/null 2>&1'))) return fail('Aucune unit export.timer.')
      const active = await vps.out('systemctl is-active export.timer')
      const enabled = await vps.out('systemctl is-enabled export.timer 2>/dev/null')
      if (active !== 'active' || enabled !== 'enabled') return fail(`export.timer : ${active}, ${enabled || 'non activable'}.`)
      const unit = await vps.out('systemctl show export.timer -p Unit --value')
      if (unit !== 'export.service') return fail(`export.timer déclenche ${unit || 'rien'}.`)
      const calendars = (await vps.out(`systemctl show export.timer -p TimersCalendar --value`)).match(/OnCalendar=([^;]+);/g) ?? []
      if (!calendars.length) return fail('export.timer n\'a pas de déclenchement OnCalendar.')
      const exprs = calendars.map((c) => c.replace(/^OnCalendar=/, '').replace(/\s*;$/, '').trim())
      const times = (await vps.out(`for e in ${exprs.map((e) => `'${e}'`).join(' ')}; do systemd-analyze calendar --iterations=8 "$e" | sed -n 's/.*\\(Next elapse\\|Iteration #[0-9]*\\): //p'; done | while read -r l; do date -d "$l" +%s; done | sort -un | head -n 8`)).split('\n').map(Number).filter(Boolean)
      const wrong = times.find((t) => t % 900 !== 0)
      if (wrong !== undefined) return fail(`Prochain déclenchement hors quart d'heure : ${await vps.out(`date -d @${wrong} +%H:%M:%S`)}.`)
      const gaps = times.slice(1).map((t, i) => t - times[i])
      return times.length >= 4 && gaps.every((g) => g === 900) ? pass(`Calendrier : ${exprs.join(', ')}.`) : fail(`Les déclenchements ne sont pas espacés de 15 minutes (${exprs.join(', ')}).`)
    }),
  },
  {
    id: 'service',
    label: 'Lancé par systemd, `export.service` s\'exécute avec le compte `export` et se termine avec succès',
    run: onVps(VPS, async (vps) => {
      if (!(await vps.test('systemctl cat export.service >/dev/null 2>&1'))) return fail('Aucune unit export.service.')
      const r = await vps.sh('systemctl start export.service', { timeoutMs: 60_000 })
      const result = await vps.out('systemctl show export.service -p Result --value')
      if (r.code !== 0 || result !== 'success') {
        const last = await vps.out('journalctl -u export.service -n 3 --no-pager -o cat | tail -n 1')
        return fail(`L'exécution a échoué (résultat : ${result})${last ? ` : « ${last.slice(0, 120)} »` : ''}.`)
      }
      const user = await vps.out('journalctl -u export.service -n 20 --no-pager -o cat | grep "export terminé" | tail -n 1')
      return user.endsWith('(export)') ? pass() : fail(`Dernier message du script : « ${user || 'aucun'} ».`)
    }),
  },
  {
    id: 'file',
    label: 'L\'export produit bien son fichier dans `/var/lib/export`, au nom du compte `export`',
    run: onVps(VPS, async (vps) => {
      const last = await vps.out(`ls -t /var/lib/export/clients-*.csv 2>/dev/null | head -n 1`)
      if (!last) return fail('Aucun fichier clients-*.csv dans /var/lib/export.')
      const owner = await vps.out(`stat -c %U ${last}`)
      if (owner !== 'export') return fail(`${last} appartient à ${owner}.`)
      const worldWritable = await vps.test(`find /var/lib/export -maxdepth 0 -perm -o+w | grep -q .`)
      return worldWritable ? fail('/var/lib/export est accessible en écriture à tous.') : pass()
    }),
  },
  {
    id: 'persistent',
    label: 'Une exécution manquée pendant que le serveur était arrêté est rattrapée au démarrage',
    run: onVps(VPS, async (vps) => {
      const persistent = await vps.out('systemctl show export.timer -p Persistent --value')
      return persistent === 'yes' ? pass() : fail(`Persistent de export.timer : ${persistent || 'non défini'}.`)
    }),
  },
] satisfies Criterion[]
