import type { Criterion } from '#check'
import { fail, onVps, pass, type Vps } from '../../../helpers.ts'

const VPS = 'dojo-linux-m3-d1'
const URL = 'http://127.0.0.1:8200/'
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function get(vps: Vps): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const body = await vps.out(`curl -s --max-time 2 ${URL}`)
    if (body) return body
    await sleep(500)
  }
  return ''
}

const lastLog = async (vps: Vps) => (await vps.out('journalctl -u reservation -n 1 --no-pager -o cat')).slice(0, 140)

export default [
  {
    id: 'up',
    label: '`reservation` est actif et répond sur le port 8200 du serveur',
    run: onVps(VPS, async (vps) => {
      const active = await vps.out('systemctl is-active reservation')
      if (active !== 'active') return fail(`reservation est ${active}${(await lastLog(vps)) ? ` ; dernier message : « ${await lastLog(vps)} »` : ''}.`)
      const body = await get(vps)
      return body.includes('reservations:') ? pass() : fail(body ? `Réponse : « ${body.slice(0, 80)} ».` : 'Rien ne répond sur le port 8200.')
    }),
  },
  {
    id: 'persist',
    label: 'Une réservation enregistrée est toujours là après un redémarrage du service',
    run: onVps(VPS, async (vps) => {
      const nom = `dojo-${Date.now().toString(36)}`
      const post = await vps.out(`curl -s -o /dev/null -w '%{http_code}' --max-time 3 -X POST '${URL}?nom=${nom}'`)
      if (post !== '201') return fail(`POST /?nom=… : code HTTP ${post === '000' ? 'aucune réponse' : post}.`)
      await vps.sh('systemctl restart reservation')
      const body = await get(vps)
      return body.includes(nom) ? pass() : fail('Après redémarrage du service, la réservation n\'apparaît plus.')
    }),
  },
  {
    id: 'user',
    label: 'Le service tourne avec le compte `reservation`',
    run: onVps(VPS, async (vps) => {
      const pid = await vps.out('systemctl show reservation -p MainPID --value')
      if (!pid || pid === '0') return fail('Le service n\'a pas de processus en cours.')
      const user = await vps.out(`ps -o user= -p ${pid}`)
      return user === 'reservation' ? pass() : fail(`Le processus principal tourne avec le compte ${user}.`)
    }),
  },
  {
    id: 'boot',
    label: 'Après un redémarrage du serveur, le service est de nouveau actif sans intervention',
    run: onVps(VPS, async (vps) => {
      const notBack = await vps.reboot()
      if (notBack) return notBack
      const active = await vps.out('systemctl is-active reservation')
      if (active !== 'active') return fail(`Après redémarrage du serveur, reservation est ${active}.`)
      return (await get(vps)).includes('reservations:') ? pass() : fail('Après redémarrage, le service est actif mais ne répond pas.')
    }),
  },
] satisfies Criterion[]
