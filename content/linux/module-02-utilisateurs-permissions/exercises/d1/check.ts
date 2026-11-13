import type { Criterion } from '#check'
import { access, expectAccess, fail, lines, onVps, pass } from '../../../helpers.ts'

const VPS = 'dojo-linux-m2-d1'
const BASE = '/srv/clients'
const CLIENTS = ['agence-roux', 'boulangerie-mas']
const tag = () => `dojo-${Date.now().toString(36)}`

export default [
  {
    id: 'enter',
    label: '`lea` et `hugo` peuvent entrer dans chaque dossier client et y créer des fichiers',
    run: onVps(VPS, (vps) =>
      expectAccess(vps, CLIENTS.flatMap((c) => ['lea', 'hugo'].map((u) => [u, `créer un fichier dans ${BASE}/${c}`, access.create(`${BASE}/${c}`), true] as [string, string, string, boolean]))),
    ),
  },
  {
    id: 'shared',
    label: 'Dans chaque dossier client, un fichier créé par `lea` est modifiable par `hugo`, et inversement',
    run: onVps(VPS, async (vps) => {
      const t = tag()
      try {
        for (const c of CLIENTS) {
          for (const [author, other] of [['lea', 'hugo'], ['hugo', 'lea']]) {
            const f = `${BASE}/${c}/${t}-${author}.txt`
            if ((await vps.as(author, `echo brouillon > ${f}`)).code !== 0) return fail(`${author} ne peut pas créer de fichier dans ${BASE}/${c}.`)
            const meta = await vps.out(`stat -c '%A %G' ${f}`)
            const outcome = await expectAccess(vps, [[other, `modifier un fichier que ${author} vient de créer dans ${c} (${meta})`, access.write(f), true]])
            if (!outcome.ok) return outcome
          }
        }
        return pass()
      } finally {
        await vps.sh(`rm -f ${CLIENTS.map((c) => `${BASE}/${c}/${t}-*`).join(' ')}`)
      }
    }),
  },
  {
    id: 'audit',
    label: 'Un fichier créé par `lea` ou `hugo` n\'est pas lisible par les utilisateurs hors de son groupe',
    run: onVps(VPS, async (vps) => {
      const t = tag()
      try {
        for (const u of ['lea', 'hugo']) {
          const f = `/tmp/${t}-${u}.txt`
          await vps.as(u, `echo secret > ${f}`)
          const mode = await vps.out(`stat -c %A ${f}`)
          if (mode.slice(7, 10) !== '---') return fail(`Un fichier créé par ${u} dans /tmp naît avec les droits ${mode}.`)
        }
        return pass()
      } finally {
        await vps.sh(`rm -f /tmp/${t}-*`)
      }
    }),
  },
  {
    id: 'publish',
    label: '`lea` et `hugo` peuvent lancer `/srv/clients/outils/publier.sh`',
    run: onVps(VPS, (vps) =>
      expectAccess(vps, ['lea', 'hugo'].map((u) => [u, `lancer ${BASE}/outils/publier.sh`, access.exec(`${BASE}/outils/publier.sh`), true] as [string, string, string, boolean])),
    ),
  },
  {
    id: 'nina',
    label: '`nina` ne peut rien lire sous `/srv/clients`',
    run: onVps(VPS, async (vps) => {
      const files = lines(await vps.out(`find ${BASE} -type f -not -name '.dojo-*'`))
      for (const f of files) {
        const outcome = await expectAccess(vps, [['nina', `lire ${f}`, access.read(f), false]])
        if (!outcome.ok) return outcome
      }
      return expectAccess(vps, [['nina', `lister ${BASE}`, access.list(BASE), false]])
    }),
  },
  {
    id: 'orphans',
    label: 'Plus aucun fichier de `/srv/clients` n\'appartient à un utilisateur inexistant',
    run: onVps(VPS, async (vps) => {
      const orphans = lines(await vps.out(`find ${BASE} -nouser -printf '%p (UID %U)\\n'`))
      return orphans.length ? fail(`Sans propriétaire existant : ${orphans.join(', ')}.`) : pass()
    }),
  },
] satisfies Criterion[]
