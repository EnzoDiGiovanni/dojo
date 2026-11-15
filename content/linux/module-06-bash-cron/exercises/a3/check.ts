import type { Criterion } from '#check'
import { fail, lines, onVps, pass, type Vps } from '../../../helpers.ts'

const VPS = 'dojo-linux-m6-a3'
const usage = async (vps: Vps, mount: string) => Number(await vps.out(`df -P ${mount} | awk 'NR == 2 { sub(/%/, "", $5); print $5 }'`))

async function probe(vps: Vps, args: string) {
  const r = await vps.as('ubuntu', `verifier-disque ${args}`)
  return { code: r.code, lines: lines(r.stdout + '\n' + r.stderr) }
}

function expectState(r: { code: number; lines: string[] }, call: string, mount: string, state: string, code: number, pct?: number) {
  if (r.code === 127) return fail('La commande verifier-disque est introuvable.')
  const line = r.lines.find((l) => l.split(' ')[1] === mount)
  if (!line) return fail(`« ${call} » n'affiche aucune ligne pour ${mount}.`)
  if (!line.startsWith(`${state} `)) return fail(`« ${call} » affiche « ${line} » au lieu de l'état ${state}.`)
  if (pct !== undefined && line.split(' ')[2] !== `${pct}%`) return fail(`« ${call} » affiche « ${line} », alors que df -P mesure ${pct}%.`)
  return r.code === code ? null : fail(`« ${call} » sort avec le code ${r.code} au lieu de ${code}.`)
}

export default [
  {
    id: 'ok',
    label: 'Avec des seuils non atteints, la sonde affiche `OK` pour le point de montage et sort avec le code 0',
    run: onVps(VPS, async (vps) => {
      const pct = await usage(vps, '/')
      const args = `${pct + 1} ${pct + 2}`
      return expectState(await probe(vps, args), `verifier-disque ${args}`, '/', 'OK', 0, pct) ?? pass(`Utilisation de / : ${pct}%.`)
    }),
  },
  {
    id: 'levels',
    label: 'Au-delà du seuil d\'attention, elle affiche `ATTENTION` et sort avec le code 1 ; au-delà du seuil critique, `CRITIQUE` et le code 2',
    run: onVps(VPS, async (vps) => {
      const pct = await usage(vps, '/')
      const warn = `${pct} ${pct + 1}`
      const crit = `${Math.max(pct - 1, 0)} ${pct}`
      return expectState(await probe(vps, warn), `verifier-disque ${warn}`, '/', 'ATTENTION', 1, pct)
        ?? expectState(await probe(vps, crit), `verifier-disque ${crit}`, '/', 'CRITIQUE', 2, pct)
        ?? pass()
    }),
  },
  {
    id: 'multi',
    label: 'Avec plusieurs points de montage, elle les vérifie tous et sort avec le code le plus grave',
    run: onVps(VPS, async (vps) => {
      const root = await usage(vps, '/')
      const run = await usage(vps, '/run')
      if (run >= root) return fail(`Mesure impossible : /run (${run}%) est plus rempli que / (${root}%).`)
      const args = `${run + 1} ${root} /run /`
      const r = await probe(vps, args)
      return expectState(r, `verifier-disque ${args}`, '/run', 'OK', 2) ?? expectState(r, `verifier-disque ${args}`, '/', 'CRITIQUE', 2) ?? pass()
    }),
  },
  {
    id: 'unknown',
    label: 'Avec des seuils invalides ou un point de montage inexistant, elle affiche `INCONNU` et sort avec le code 3',
    run: onVps(VPS, async (vps) => {
      for (const args of ['', '80', 'quatre-vingts 90', '80 90 /nulle-part']) {
        const r = await probe(vps, args)
        if (r.code === 127) return fail('La commande verifier-disque est introuvable.')
        if (r.code !== 3 || !r.lines.some((l) => l.startsWith('INCONNU'))) return fail(`« verifier-disque ${args} » sort avec le code ${r.code}${r.lines[0] ? ` et affiche « ${r.lines[0].slice(0, 60)} »` : ''}.`)
      }
      return pass()
    }),
  },
] satisfies Criterion[]
