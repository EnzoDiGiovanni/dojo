import type { Criterion } from '#check'
import { access, expectAccess, fail, lines, missingUsers, onVps, pass } from '../../../helpers.ts'

const VPS = 'dojo-linux-m2-v1'
const RECETTES = '/srv/cuisine/recettes'
const FACTURES = '/srv/cuisine/factures'
const allowed = (cmd: string) => `sudo -n -l ${cmd} >/dev/null 2>&1`
const tag = () => `dojo-${Date.now().toString(36)}`

export default [
  {
    id: 'accounts',
    label: '`paul` et `ines` existent avec un dossier personnel et le shell bash, et sont membres de `cuisine`',
    run: onVps(VPS, async (vps) => {
      const missing = await missingUsers(vps, ['paul', 'ines'])
      if (missing.length) return fail(`Comptes absents : ${missing.join(', ')}.`)
      for (const u of ['paul', 'ines']) {
        const [, , , , , home, shell] = (await vps.out(`getent passwd ${u}`)).split(':')
        if (shell !== '/bin/bash') return fail(`Shell de ${u} : ${shell || '(vide)'}.`)
        if ((await vps.out(`stat -c %U ${home} 2>/dev/null`)) !== u) return fail(`Dossier personnel de ${u} absent.`)
        const groups = (await vps.out(`id -nG ${u}`)).split(' ')
        if (!groups.includes('cuisine')) return fail(`Groupes de ${u} : ${groups.join(', ')}.`)
      }
      return pass()
    }),
  },
  {
    id: 'recettes',
    label: 'Dans `recettes`, ce que crée `paul` ou `ines` appartient au groupe `cuisine` et est modifiable par l\'autre, comme la recette existante',
    run: onVps(VPS, async (vps) => {
      const missing = await missingUsers(vps, ['paul', 'ines'])
      if (missing.length) return fail(`Comptes absents : ${missing.join(', ')}.`)
      const t = tag()
      try {
        for (const [author, other] of [['paul', 'ines'], ['ines', 'paul']]) {
          const f = `${RECETTES}/${t}-${author}.md`
          if ((await vps.as(author, `echo recette > ${f}`)).code !== 0) return fail(`${author} ne peut pas créer de fichier dans ${RECETTES}.`)
          const [mode, group] = (await vps.out(`stat -c '%A %G' ${f}`)).split(' ')
          if (group !== 'cuisine') return fail(`Un fichier créé par ${author} appartient au groupe ${group}.`)
          const outcome = await expectAccess(vps, [[other, `modifier un fichier que ${author} vient de créer (${mode})`, access.write(f), true]])
          if (!outcome.ok) return outcome
        }
        return expectAccess(vps, [['ines', `modifier ${RECETTES}/pate-brisee.md`, access.write(`${RECETTES}/pate-brisee.md`), true]])
      } finally {
        await vps.sh(`rm -f ${RECETTES}/${t}-*`)
      }
    }),
  },
  {
    id: 'recettes-closed',
    label: 'Les utilisateurs hors de `cuisine` n\'ont aucun accès à `recettes`',
    run: onVps(VPS, (vps) =>
      expectAccess(vps, [
        ['lea', `lister ${RECETTES}`, access.list(RECETTES), false],
        ['nina', `lire ${RECETTES}/pate-brisee.md`, access.read(`${RECETTES}/pate-brisee.md`), false],
        ['ubuntu', `lister ${RECETTES} sans sudo`, access.list(RECETTES), false],
      ]),
    ),
  },
  {
    id: 'factures',
    label: 'Les factures sont lisibles par `lea` et par personne d\'autre hors root, et seul root peut les modifier',
    run: onVps(VPS, async (vps) => {
      const files = lines(await vps.out(`find ${FACTURES} -type f`))
      const rules: [string, string, string, boolean][] = []
      for (const f of files) {
        rules.push(['lea', `lire ${f}`, access.read(f), true], ['lea', `modifier ${f}`, access.write(f), false])
        for (const u of ['nina', 'ubuntu', ...(await missingUsers(vps, ['paul'])).length ? [] : ['paul']]) rules.push([u, `lire ${f}`, access.read(f), false])
      }
      rules.push(['lea', `créer un fichier dans ${FACTURES}`, access.create(FACTURES), false])
      return expectAccess(vps, rules)
    }),
  },
  {
    id: 'sudo',
    label: '`ines` peut redémarrer cron avec sudo sans mot de passe, et ne peut rien lancer d\'autre en root',
    run: onVps(VPS, async (vps) => {
      if ((await missingUsers(vps, ['ines'])).length) return fail('Aucun compte ines.')
      if (!(await vps.test('sha256sum --quiet -c /root/.dojo/sudoers.sha256 >/dev/null 2>&1'))) return fail('/etc/sudoers a été modifié.')
      const r = await vps.as('ines', 'sudo -n systemctl restart cron')
      if (r.code !== 0) return fail(`sudo systemctl restart cron, lancé par ines : ${r.stderr.trim().split('\n')[0] || `code ${r.code}`}.`)
      return expectAccess(vps, [
        ['ines', 'ouvrir un shell root avec sudo', allowed('/bin/bash'), false],
        ['ines', 'arrêter cron avec sudo', allowed('/usr/bin/systemctl stop cron'), false],
        ['ines', 'lancer `systemctl edit cron` avec sudo', allowed('/usr/bin/systemctl edit cron'), false],
        ['ines', 'redémarrer ssh avec sudo', allowed('/usr/bin/systemctl restart ssh'), false],
      ])
    }),
  },
  {
    id: 'ancien',
    label: 'Le mot de passe de `ancien` est verrouillé',
    run: onVps(VPS, async (vps) => {
      const status = (await vps.out('passwd -S ancien 2>/dev/null')).split(' ')
      if (!status[0]) return fail('Le compte ancien n\'existe plus.')
      return status[1] === 'L' ? pass() : fail(`État du mot de passe de ancien (passwd -S) : ${status[1]}.`)
    }),
  },
] satisfies Criterion[]
