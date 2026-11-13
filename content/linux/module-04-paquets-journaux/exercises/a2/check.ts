import type { Criterion } from '#check'
import { fail, onVps, pass, type Vps } from '../../../helpers.ts'

const VPS = 'dojo-linux-m4-a2'
const norm = (s: string | undefined) => (s ?? '').trim().replace(/^["'«]\s*|\s*["'»]$/g, '').replace(/\.service$/, '').replace(/\s+/g, ' ').toLowerCase()

async function report(vps: Vps): Promise<Record<string, string> | null> {
  const content = await vps.readFile('/home/ubuntu/incident.txt')
  if (content === null) return null
  const values: Record<string, string> = {}
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*([a-z]+)\s*=\s*(.*?)\s*$/)
    if (m) values[m[1]] = m[2]
  }
  return values
}

function compare(values: Record<string, string> | null, expected: Record<string, string>) {
  if (!values) return fail('/home/ubuntu/incident.txt n\'existe pas.')
  const wrong = Object.keys(expected).filter((k) => norm(values[k]) !== norm(expected[k]))
  return wrong.length ? fail(`Valeur(s) inexacte(s) ou absente(s) : ${wrong.map((k) => `${k}=${values[k] ?? '(absent)'}`).join(', ')}.`) : pass()
}

export default [
  {
    id: 'service',
    label: '`incident.txt` nomme le service qui s\'est arrêté en erreur, et le nombre de ses arrêts',
    run: onVps(VPS, async (vps) => compare(await report(vps), { service: 'paiement', echecs: '2' })),
  },
  {
    id: 'details',
    label: '`incident.txt` donne le code de sortie et le message d\'erreur exact de ces arrêts',
    run: onVps(VPS, async (vps) => compare(await report(vps), { code: '3', message: 'connexion à la banque refusée : certificat expiré' })),
  },
  {
    id: 'other',
    label: '`incident.txt` nomme l\'autre service qui a signalé une erreur sans s\'arrêter',
    run: onVps(VPS, async (vps) => compare(await report(vps), { autre: 'newsletter' })),
  },
] satisfies Criterion[]
