import type { Criterion } from '#check'
import { fail, onVps, pass, type Vps } from '../../../helpers.ts'

const VPS = 'dojo-linux-m3-v1'
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function get(vps: Vps): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const body = await vps.out('curl -s --max-time 2 http://127.0.0.1:8300/')
    if (body) return body
    await sleep(500)
  }
  return ''
}

export default [
  {
    id: 'port',
    label: 'Plus aucun ancien processus n\'occupe le port 8300, et c\'est `facturation` qui y répond',
    run: onVps(VPS, async (vps) => {
      const legacy = await vps.out("pgrep -f '[s]erveur-v1.py'")
      if (legacy) return fail(`L'ancienne facturation tourne encore (PID ${legacy.split('\n').join(', ')}).`)
      const body = await get(vps)
      return body.startsWith('facturation 2.0') ? pass() : fail(body ? `Réponse sur le port 8300 : « ${body.slice(0, 60)} ».` : 'Rien ne répond sur le port 8300.')
    }),
  },
  {
    id: 'service',
    label: '`facturation` tourne avec le compte `facturation`, lit sa configuration et se relance s\'il est tué',
    run: onVps(VPS, async (vps) => {
      const body = await get(vps)
      if (!body.includes('devise=EUR')) return fail(body ? `Réponse : « ${body.slice(0, 80)} ».` : 'Rien ne répond sur le port 8300.')
      if (!body.includes('compte=facturation')) return fail(`Réponse : « ${body.slice(0, 80)} ».`)
      const before = await vps.out('systemctl show facturation -p MainPID --value')
      if (!before || before === '0') return fail('Aucun service facturation en cours.')
      await vps.sh(`kill -9 ${before}`)
      for (let i = 0; i < 12; i++) {
        await sleep(500)
        const now = await vps.out('systemctl show facturation -p MainPID --value')
        if (now !== '0' && now !== before) return pass()
      }
      return fail(`6 secondes après un kill, facturation est ${await vps.out('systemctl is-active facturation')}.`)
    }),
  },
  {
    id: 'timer',
    label: '`facturation-relance.timer` est actif, activé, et déclenche les relances chaque jour à 08:00',
    run: onVps(VPS, async (vps) => {
      const unit = 'facturation-relance.timer'
      if (!(await vps.test(`systemctl cat ${unit} >/dev/null 2>&1`))) return fail(`Aucune unit ${unit}.`)
      const active = await vps.out(`systemctl is-active ${unit}`)
      const enabled = await vps.out(`systemctl is-enabled ${unit} 2>/dev/null`)
      if (active !== 'active' || enabled !== 'enabled') return fail(`${unit} : ${active}, ${enabled || 'non activable'}.`)
      const exprs = ((await vps.out(`systemctl show ${unit} -p TimersCalendar --value`)).match(/OnCalendar=([^;]+);/g) ?? []).map((c) => c.replace(/^OnCalendar=/, '').replace(/\s*;$/, '').trim())
      if (!exprs.length) return fail(`${unit} n'a pas de déclenchement OnCalendar.`)
      const times = (await vps.out(`for e in ${exprs.map((e) => `'${e}'`).join(' ')}; do systemd-analyze calendar --iterations=4 "$e" | sed -n 's/.*\\(Next elapse\\|Iteration #[0-9]*\\): //p'; done | while read -r l; do date -d "$l" +%s; done | sort -un | head -n 4`)).split('\n').map(Number).filter(Boolean)
      const off = times.find((t) => (t - 8 * 3600) % 86400 !== 0)
      if (off !== undefined) return fail(`Un déclenchement tombe à ${await vps.out(`date -d @${off} '+%F %H:%M:%S'`)}.`)
      return times.length >= 2 && times[1] - times[0] === 86400 ? pass() : fail('Les déclenchements ne sont pas quotidiens.')
    }),
  },
  {
    id: 'relance',
    label: 'Lancées par systemd, les relances s\'exécutent avec le compte `facturation` et réussissent',
    run: onVps(VPS, async (vps) => {
      const service = await vps.out('systemctl show facturation-relance.timer -p Unit --value')
      if (!service || !(await vps.test(`systemctl cat ${service} >/dev/null 2>&1`))) return fail('Le timer ne déclenche aucun service existant.')
      await vps.sh(`systemctl start ${service}`, { timeoutMs: 60_000 })
      const result = await vps.out(`systemctl show ${service} -p Result --value`)
      const message = await vps.out(`journalctl -u ${service} -n 5 --no-pager -o cat | grep 'relances envoyées' | tail -n 1`)
      if (result !== 'success') return fail(`${service} : résultat ${result}.`)
      return message.endsWith('(facturation)') ? pass() : fail(`Message du script : « ${message || 'aucun'} ».`)
    }),
  },
  {
    id: 'boot',
    label: 'Après un redémarrage du serveur, `facturation` répond de nouveau sans intervention',
    run: onVps(VPS, async (vps) => {
      const notBack = await vps.reboot()
      if (notBack) return notBack
      const body = await get(vps)
      return body.startsWith('facturation 2.0') ? pass() : fail(body ? `Après redémarrage, réponse : « ${body.slice(0, 60)} ».` : 'Après redémarrage, rien ne répond sur le port 8300.')
    }),
  },
] satisfies Criterion[]
