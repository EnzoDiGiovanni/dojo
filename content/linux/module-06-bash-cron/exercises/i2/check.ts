import type { Criterion } from '#check'
import { fail, onVps, pass, q, type Vps } from '../../../helpers.ts'

const VPS = 'dojo-linux-m6-i2'
const SCRIPT = '/usr/local/sbin/creer-comptes'

interface Fixture { file: string; users: Record<string, { gecos: string; groups: string[] }>; invalidLines: number[] }

async function fixtureFile(vps: Vps, withErrors: boolean): Promise<Fixture> {
  const t = Date.now().toString(36).slice(-5)
  const users = {
    [`a${t}`]: { gecos: 'Aline Rémy', groups: ['devs', 'web'] },
    [`b${t}`]: { gecos: 'Bruno Lefèvre-Saint', groups: [`grp${t}`] },
    [`c${t}`]: { gecos: 'Chloé Diaz', groups: [] as string[] },
  }
  const rows = ['login;nom complet;groupes', '# fichier de test', `a${t};Aline Rémy;devs,web`, '', `b${t};Bruno Lefèvre-Saint;grp${t}`]
  const invalidLines: number[] = []
  if (withErrors) {
    rows.push(`Mauvais Login;Personne;devs`); invalidLines.push(rows.length)
    rows.push(`d${t}`); invalidLines.push(rows.length)
  }
  rows.push(`c${t};Chloé Diaz;`)
  const file = `/tmp/dojo-comptes-${t}.csv`
  await vps.sh(`cat > ${file}`, { stdin: rows.join('\n') + '\n' })
  return { file, users, invalidLines }
}

async function cleanup(vps: Vps, f: Fixture) {
  for (const u of Object.keys(f.users)) await vps.sh(`userdel -r ${u} >/dev/null 2>&1; true`)
  await vps.sh(`rm -f ${f.file}; getent group ${Object.values(f.users)[1].groups[0]} >/dev/null && groupdel ${Object.values(f.users)[1].groups[0]}; true`)
}

async function accountProblem(vps: Vps, f: Fixture): Promise<string | null> {
  for (const [u, spec] of Object.entries(f.users)) {
    const entry = await vps.out(`getent passwd ${u}`)
    if (!entry) return `le compte ${u} n'a pas été créé`
    const [, , , , gecos, home, shell] = entry.split(':')
    if (gecos.split(',')[0] !== spec.gecos) return `nom complet de ${u} : « ${gecos} »`
    if (shell !== '/bin/bash') return `shell de ${u} : ${shell}`
    if ((await vps.out(`stat -c %U ${q(home)} 2>/dev/null`)) !== u) return `dossier personnel de ${u} absent`
    const groups = (await vps.out(`id -nG ${u}`)).split(' ')
    const lacking = spec.groups.filter((g) => !groups.includes(g))
    if (lacking.length) return `${u} n'est pas membre de ${lacking.join(', ')}`
  }
  return null
}

export default [
  {
    id: 'create',
    label: 'Les comptes valides du fichier sont créés avec leur nom complet, un dossier personnel et tous leurs groupes, même inexistants jusque-là',
    run: onVps(VPS, async (vps) => {
      if (!(await vps.test(`test -x ${SCRIPT}`))) return fail(`${SCRIPT} est absent ou n'est pas exécutable.`)
      const f = await fixtureFile(vps, true)
      try {
        await vps.sh(`${SCRIPT} ${f.file}`)
        const problem = await accountProblem(vps, f)
        return problem ? fail(`Après exécution : ${problem}.`) : pass()
      } finally {
        await cleanup(vps, f)
      }
    }),
  },
  {
    id: 'invalid',
    label: 'Chaque ligne invalide est signalée sur la sortie d\'erreur avec son numéro, sans bloquer les autres, et le script sort avec le code 1',
    run: onVps(VPS, async (vps) => {
      if (!(await vps.test(`test -x ${SCRIPT}`))) return fail(`${SCRIPT} est absent ou n'est pas exécutable.`)
      const f = await fixtureFile(vps, true)
      try {
        const r = await vps.sh(`${SCRIPT} ${f.file}`)
        const unreported = f.invalidLines.filter((n) => !new RegExp(`\\b${n}\\b`).test(r.stderr))
        if (unreported.length) return fail(`La sortie d'erreur ne mentionne pas la ligne ${unreported.join(', ')} : « ${r.stderr.trim().slice(0, 100)} ».`)
        if (!(await vps.test(`getent passwd ${Object.keys(f.users)[2]} >/dev/null`))) return fail('Le compte de la dernière ligne, valide, n\'a pas été créé.')
        if (await vps.test('getent passwd "Mauvais Login" >/dev/null || getent passwd mauvais >/dev/null')) return fail('Un compte a été créé pour une ligne invalide.')
        return r.code === 1 ? pass() : fail(`Le script sort avec le code ${r.code}.`)
      } finally {
        await cleanup(vps, f)
      }
    }),
  },
  {
    id: 'rerun',
    label: 'Relancé sur un fichier sans erreur, le script ne recrée rien, ajoute les groupes manquants, n\'écrit rien sur la sortie d\'erreur et sort avec le code 0',
    run: onVps(VPS, async (vps) => {
      if (!(await vps.test(`test -x ${SCRIPT}`))) return fail(`${SCRIPT} est absent ou n'est pas exécutable.`)
      const f = await fixtureFile(vps, false)
      try {
        const first = await vps.sh(`${SCRIPT} ${f.file}`)
        if (first.code !== 0) return fail(`Sur un fichier sans erreur, la première exécution sort avec le code ${first.code} : « ${first.stderr.trim().slice(0, 100)} ».`)
        const user = Object.keys(f.users)[0]
        await vps.sh(`echo marqueur > /home/${user}/.dojo-marqueur && gpasswd -d ${user} web >/dev/null`)
        const second = await vps.sh(`${SCRIPT} ${f.file}`)
        if (second.code !== 0) return fail(`Relancé, le script sort avec le code ${second.code}.`)
        if (second.stderr.trim()) return fail(`Relancé, le script écrit sur la sortie d'erreur : « ${second.stderr.trim().slice(0, 100)} ».`)
        if (!(await vps.test(`test -f /home/${user}/.dojo-marqueur`))) return fail(`Relancé, le script a recréé le dossier personnel de ${user}.`)
        const problem = await accountProblem(vps, f)
        return problem ? fail(`Après la seconde exécution : ${problem}.`) : pass()
      } finally {
        await cleanup(vps, f)
      }
    }),
  },
] satisfies Criterion[]
