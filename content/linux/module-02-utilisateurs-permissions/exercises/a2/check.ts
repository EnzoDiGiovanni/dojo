import type { Criterion } from '#check'
import { access, expectAccess, onVps } from '../../../helpers.ts'

const VPS = 'dojo-linux-m2-a2'
const DIR = '/srv/compta'
const BILAN = `${DIR}/bilan-2025.pdf`
const EXPORT = `${DIR}/outils/export.sh`
const BANQUE = `${DIR}/secret/banque.txt`

export default [
  {
    id: 'dir',
    label: 'Les membres de `compta` peuvent entrer dans `/srv/compta` et y créer des fichiers, les autres ne peuvent même pas le lister',
    run: onVps(VPS, (vps) =>
      expectAccess(vps, [
        ['lea', `créer un fichier dans ${DIR}`, access.create(DIR), true],
        ['nina', `créer un fichier dans ${DIR}`, access.create(DIR), true],
        ['nina', `lister ${DIR}`, access.list(DIR), true],
        ['hugo', `lister ${DIR}`, access.list(DIR), false],
        ['ubuntu', `lister ${DIR} sans sudo`, access.list(DIR), false],
      ]),
    ),
  },
  {
    id: 'bilan',
    label: '`bilan-2025.pdf` est modifiable par `lea` seule, lisible par `nina`, inaccessible à `hugo`',
    run: onVps(VPS, (vps) =>
      expectAccess(vps, [
        ['lea', `modifier ${BILAN}`, access.write(BILAN), true],
        ['nina', `lire ${BILAN}`, access.read(BILAN), true],
        ['nina', `modifier ${BILAN}`, access.write(BILAN), false],
        ['hugo', `lire ${BILAN}`, access.read(BILAN), false],
      ]),
    ),
  },
  {
    id: 'export',
    label: '`export.sh` se lance pour `lea` et `nina`, et seule `lea` peut le modifier',
    run: onVps(VPS, (vps) =>
      expectAccess(vps, [
        ['lea', `lancer ${EXPORT}`, access.exec(EXPORT), true],
        ['nina', `lancer ${EXPORT}`, access.exec(EXPORT), true],
        ['lea', `modifier ${EXPORT}`, access.write(EXPORT), true],
        ['nina', `modifier ${EXPORT}`, access.write(EXPORT), false],
        ['hugo', `lancer ${EXPORT}`, access.exec(EXPORT), false],
      ]),
    ),
  },
  {
    id: 'banque',
    label: 'Seul root peut lire `secret/banque.txt`',
    run: onVps(VPS, (vps) =>
      expectAccess(vps, [
        ['lea', `lire ${BANQUE}`, access.read(BANQUE), false],
        ['nina', `lire ${BANQUE}`, access.read(BANQUE), false],
        ['hugo', `lire ${BANQUE}`, access.read(BANQUE), false],
        ['root', `lire ${BANQUE}`, access.read(BANQUE), true],
      ]),
    ),
  },
] satisfies Criterion[]
