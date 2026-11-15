import type { Criterion } from '#check'
import { fail, onVps, pass, type Vps } from '../../../helpers.ts'

const VPS = 'dojo-linux-m3-i2'
const VENDOR = '/usr/lib/systemd/system/imprimerie.service'
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function answer(vps: Vps): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const body = await vps.out('curl -s --max-time 2 http://127.0.0.1:8100/')
    if (body) return body
    await sleep(500)
  }
  return ''
}

function expected(body: string) {
  if (!body) return fail('Rien ne répond sur le port 8100.')
  if (!body.includes('utilisateur=imprimerie')) return fail(`Réponse : « ${body} ».`)
  return body.includes('format=A4') ? pass() : fail(`Réponse : « ${body} ».`)
}

export default [
  {
    id: 'settings',
    label: '`imprimerie` tourne avec le compte `imprimerie` et produit du A4',
    run: onVps(VPS, async (vps) => expected(await answer(vps))),
  },
  {
    id: 'restart',
    label: 'Si le processus est tué brutalement, il redémarre',
    run: onVps(VPS, async (vps) => {
      const before = await vps.out('systemctl show imprimerie -p MainPID --value')
      if (!before || before === '0') return fail('Le service n\'a pas de processus en cours.')
      await vps.sh(`kill -9 ${before}`)
      for (let i = 0; i < 12; i++) {
        await sleep(500)
        const now = await vps.out('systemctl show imprimerie -p MainPID --value')
        if (now !== '0' && now !== before) return pass()
      }
      return fail(`6 secondes après le kill, imprimerie est ${await vps.out('systemctl is-active imprimerie')}.`)
    }),
  },
  {
    id: 'vendor',
    label: 'Le fichier d\'unit du paquet est intact, et aucune copie complète ne le remplace',
    run: onVps(VPS, async (vps) => {
      if (!(await vps.test('sha256sum --quiet -c /root/.dojo/imprimerie.sha256 >/dev/null 2>&1'))) return fail(`${VENDOR} a été modifié.`)
      const fragment = await vps.out('systemctl show imprimerie -p FragmentPath --value')
      return fragment === VENDOR ? pass() : fail(`L'unit utilisée est ${fragment}, pas celle du paquet.`)
    }),
  },
  {
    id: 'upgrade',
    label: 'Les réglages survivent à une mise à jour du paquet qui réécrit son fichier d\'unit',
    run: onVps(VPS, async (vps) => {
      await vps.sh(`sed -e 's/^Description=.*/Description=Imprimerie 2.5 - serveur de devis PDF/' -e '/^After=/a Wants=network.target' /root/.dojo/imprimerie.service.orig > ${VENDOR} && systemctl daemon-reload && systemctl restart imprimerie`)
      try {
        return expected(await answer(vps))
      } finally {
        await vps.sh(`cp /root/.dojo/imprimerie.service.orig ${VENDOR} && systemctl daemon-reload && systemctl restart imprimerie`)
      }
    }),
  },
] satisfies Criterion[]
