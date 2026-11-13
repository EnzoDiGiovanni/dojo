import type { Criterion } from '#check'
import { access, expectAccess, fail, onVps, pass, type Vps } from '../../../helpers.ts'

const VPS = 'dojo-linux-m2-i1'
const PROJECT = '/srv/projets/vitrine'
const DEPOT = '/srv/projets/depot'

// Each criterion works on files of its own and removes them afterwards.
const tag = () => `dojo-${Date.now().toString(36)}`

async function created(vps: Vps, user: string, file: string): Promise<string | null> {
  const r = await vps.as(user, `echo "par ${user}" > '${file}'`)
  return r.code === 0 ? null : `${user} ne peut pas créer ${file}`
}

export default [
  {
    id: 'group',
    label: 'Un fichier créé par un membre de `devs` dans le projet, même dans un sous-dossier existant, appartient au groupe `devs`',
    run: onVps(VPS, async (vps) => {
      const t = tag()
      const files = [`${PROJECT}/${t}.txt`, `${PROJECT}/maquettes/${t}.txt`]
      try {
        for (const f of files) {
          const problem = await created(vps, 'hugo', f)
          if (problem) return fail(`${problem}.`)
          const group = await vps.out(`stat -c %G '${f}'`)
          if (group !== 'devs') return fail(`${f.replace(t, '<nouveau>')}, créé par hugo, appartient au groupe ${group}.`)
        }
        const dir = `${PROJECT}/notes/${t}`
        if ((await vps.as('lea', `mkdir '${dir}' && echo x > '${dir}/f'`)).code !== 0) return fail('lea ne peut pas créer de sous-dossier dans notes/.')
        const group = await vps.out(`stat -c %G '${dir}/f'`)
        return group === 'devs' ? pass() : fail(`Un fichier créé par lea dans un nouveau sous-dossier appartient au groupe ${group}.`)
      } finally {
        await vps.sh(`rm -rf ${PROJECT}/${t}.txt ${PROJECT}/maquettes/${t}.txt ${PROJECT}/notes/${t}`)
      }
    }),
  },
  {
    id: 'shared',
    label: 'Un membre de `devs` peut modifier un fichier créé par un autre membre, y compris les fichiers d\'avant ton intervention',
    run: onVps(VPS, async (vps) => {
      const t = tag()
      try {
        for (const [author, other] of [['lea', 'hugo'], ['hugo', 'lea']]) {
          const f = `${PROJECT}/maquettes/${t}-${author}.txt`
          const problem = await created(vps, author, f)
          if (problem) return fail(`${problem}.`)
          const mode = await vps.out(`stat -c %A '${f}'`)
          const outcome = await expectAccess(vps, [[other, `modifier un fichier que ${author} vient de créer (${mode})`, access.write(f), true]])
          if (!outcome.ok) return outcome
        }
        return expectAccess(vps, [
          ['hugo', `modifier ${PROJECT}/notes/cahier.md`, access.write(`${PROJECT}/notes/cahier.md`), true],
          ['hugo', `modifier ${PROJECT}/maquettes/accueil.txt`, access.write(`${PROJECT}/maquettes/accueil.txt`), true],
        ])
      } finally {
        await vps.sh(`rm -f ${PROJECT}/maquettes/${t}-*`)
      }
    }),
  },
  {
    id: 'nina',
    label: '`nina` n\'a aucun accès au projet',
    run: onVps(VPS, (vps) =>
      expectAccess(vps, [
        ['nina', `lister ${PROJECT}`, access.list(PROJECT), false],
        ['nina', `lire ${PROJECT}/notes/cahier.md`, access.read(`${PROJECT}/notes/cahier.md`), false],
      ]),
    ),
  },
  {
    id: 'depot',
    label: 'Tout le monde peut déposer un fichier dans `/srv/projets/depot`, mais personne ne peut supprimer celui d\'un autre',
    run: onVps(VPS, async (vps) => {
      if (!(await vps.test(`test -d ${DEPOT}`))) return fail(`${DEPOT} n'existe pas.`)
      const t = tag()
      try {
        for (const u of ['nina', 'lea', 'hugo', 'ubuntu']) {
          const problem = await created(vps, u, `${DEPOT}/${t}-${u}.txt`)
          if (problem) return fail(`${problem}.`)
        }
        return await expectAccess(vps, [
          ['nina', 'supprimer le fichier déposé par lea', `rm -f ${DEPOT}/${t}-lea.txt`, false],
          ['hugo', 'renommer le fichier déposé par nina', `mv ${DEPOT}/${t}-nina.txt ${DEPOT}/${t}-x.txt`, false],
          ['lea', 'supprimer son propre fichier', `rm -f ${DEPOT}/${t}-lea.txt`, true],
        ])
      } finally {
        await vps.sh(`rm -f ${DEPOT}/${t}-*`)
      }
    }),
  },
] satisfies Criterion[]
