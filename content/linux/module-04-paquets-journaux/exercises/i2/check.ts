import type { Criterion } from '#check'
import { fail, onVps, pass, type Vps } from '../../../helpers.ts'

const VPS = 'dojo-linux-m4-i2'

// Last value of a directive in the effective journald configuration (main file then drop-ins).
const effective = async (vps: Vps, key: string) =>
  (await vps.out(`systemd-analyze cat-config systemd/journald.conf | grep -E '^\\s*${key}=' | tail -n 1 | cut -d= -f2-`)).trim()

export default [
  {
    id: 'dropin',
    label: 'La configuration de journald est faite par un fichier de surcharge, `journald.conf` est intact',
    run: onVps(VPS, async (vps) => {
      if (!(await vps.test('sha256sum --quiet -c /root/.dojo/journald.sha256 >/dev/null 2>&1'))) return fail('/etc/systemd/journald.conf a été modifié.')
      const dropins = (await vps.out('ls /etc/systemd/journald.conf.d/*.conf 2>/dev/null')).split('\n').filter(Boolean)
      return dropins.length ? pass(`Surcharge : ${dropins.join(', ')}.`) : fail('Aucun fichier dans /etc/systemd/journald.conf.d/.')
    }),
  },
  {
    id: 'size',
    label: 'Le journal ne peut pas occuper plus de 200 Mo sur le disque',
    run: onVps(VPS, async (vps) => {
      const value = await effective(vps, 'SystemMaxUse')
      if (!value) return fail('SystemMaxUse n\'est pas défini.')
      const bytes = Number(await vps.out(`numfmt --from=iec ${value.replace(/B$/i, '')} 2>/dev/null`))
      return bytes > 0 && bytes <= 200 * 1024 * 1024 ? pass(`SystemMaxUse=${value}.`) : fail(`SystemMaxUse=${value}.`)
    }),
  },
  {
    id: 'retention',
    label: 'Les entrées de plus de 30 jours sont supprimées',
    run: onVps(VPS, async (vps) => {
      const value = await effective(vps, 'MaxRetentionSec')
      if (!value || value === '0') return fail('MaxRetentionSec n\'est pas défini.')
      const usec = Number(await vps.out(`systemd-analyze timespan '${value}' | sed -n 's/.*μs: //p'`))
      const days = usec / 86_400e6
      return days >= 28 && days <= 31 ? pass(`MaxRetentionSec=${value}.`) : fail(`MaxRetentionSec=${value} (${days.toFixed(1)} jours).`)
    }),
  },
  {
    id: 'persistent',
    label: 'Après un redémarrage du serveur, les messages du démarrage précédent sont consultables',
    run: onVps(VPS, async (vps) => {
      const marker = `dojo-repere-${Date.now().toString(36)}`
      await vps.sh(`logger -t dojo ${marker} && journalctl --sync`)
      const notBack = await vps.reboot()
      if (notBack) return notBack
      // In the lab every boot shares the host kernel's boot ID: look for the marker in the whole journal.
      const found = await vps.test(`journalctl -t dojo --no-pager 2>/dev/null | grep -q ${marker}`)
      if (found) return pass()
      const oldest = await vps.out(`journalctl --no-pager -o short-iso 2>/dev/null | head -n 1 | cut -d' ' -f1`)
      return fail(`Après redémarrage, le message écrit juste avant est introuvable (plus ancienne entrée du journal : ${oldest || 'aucune'}).`)
    }),
  },
] satisfies Criterion[]
