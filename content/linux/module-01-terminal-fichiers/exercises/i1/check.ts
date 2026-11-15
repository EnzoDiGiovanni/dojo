import type { Criterion } from '#check'
import { fail, lines, onVps, pass } from '../../../helpers.ts'

const VPS = 'dojo-linux-m1-i1'
const ARCHIVE = '/srv/archive/journaux-2026-10.tar.gz'

export default [
  {
    id: 'readable',
    label: '`/srv/archive/journaux-2026-10.tar.gz` est une archive tar compressée lisible',
    run: onVps(VPS, async (vps) => {
      if (!(await vps.test(`test -f ${ARCHIVE}`))) return fail(`${ARCHIVE} n'existe pas.`)
      if (!(await vps.test(`gzip -t ${ARCHIVE}`))) return fail('Le fichier n\'est pas compressé avec gzip, ou il est corrompu.')
      return (await vps.test(`tar -tzf ${ARCHIVE} >/dev/null`)) ? pass() : fail('Le fichier est compressé mais ne contient pas une archive tar lisible.')
    }),
  },
  {
    id: 'content',
    label: 'L\'archive contient tous les journaux d\'octobre et seulement eux, avec leur chemin relatif à `/var/log/vitrine`',
    run: onVps(VPS, async (vps) => {
      if (!(await vps.test(`tar -tzf ${ARCHIVE} >/dev/null 2>&1`))) return fail('Archive absente ou illisible.')
      const listing = await vps.sh(`tar -tzvf ${ARCHIVE} 2>/dev/null | grep '^-' | sed -E 's/^([^ ]+ +){5}//' | sed 's|^\\./||' | sort`)
      const got = listing.stdout.split('\n').filter(Boolean)
      const expected = (await vps.out(`awk '{ $1=""; sub(/^ /, ""); print }' /root/.dojo/octobre.sha256 | sort`)).split('\n')
      const missing = expected.filter((f) => !got.includes(f))
      const extra = got.filter((f) => !expected.includes(f))
      if (!missing.length && !extra.length) return pass(`${got.length} journaux archivés.`)
      const parts = []
      if (extra.length) parts.push(`chemins inattendus dans l'archive : ${extra.slice(0, 2).map((f) => `« ${f} »`).join(', ')}${extra.length > 2 ? ` (+${extra.length - 2})` : ''}`)
      if (missing.length) parts.push(`${missing.length} journal(aux) d'octobre absent(s) de l'archive, dont « ${missing[0]} »`)
      return fail(`${parts.join(' ; ')}.`)
    }),
  },
  {
    id: 'identical',
    label: 'Le contenu archivé est identique aux journaux d\'origine',
    run: onVps(VPS, async (vps) => {
      const r = await vps.sh(`d=$(mktemp -d) && tar -xzf ${ARCHIVE} -C "$d" 2>/dev/null && cd "$d" && sha256sum --quiet -c /root/.dojo/octobre.sha256 2>&1; s=$?; rm -rf "$d"; exit $s`)
      if (r.code === 0) return pass()
      const bad = lines(r.stdout).filter((l) => /FAILED/.test(l)).map((l) => l.replace(/:.*$/, ''))
      return fail(bad.length ? `Contenu différent ou absent pour ${bad.length} fichier(s), dont « ${bad[0]} ».` : 'Archive absente ou illisible.')
    }),
  },
  {
    id: 'cleaned',
    label: 'Les journaux d\'octobre ont disparu de `/var/log/vitrine`, ceux de novembre sont intacts',
    run: onVps(VPS, async (vps) => {
      const remaining = lines(await vps.out(`cd /var/log/vitrine && find . -type f -name '*2026-10-*' | sed 's|^\\./||'`))
      if (remaining.length) return fail(`Encore présents : ${remaining.length} journal(aux) d'octobre, dont « ${remaining[0]} ».`)
      const missing = lines(await vps.out(`cd /var/log/vitrine && while IFS= read -r f; do [ -f "$f" ] || echo "$f"; done < /root/.dojo/novembre.txt`))
      return missing.length ? fail(`Journaux de novembre disparus : ${missing.slice(0, 3).join(', ')}.`) : pass()
    }),
  },
] satisfies Criterion[]
