import type { Criterion } from '#check'
import { fail, fixture, lines, onVps, pass, sshdSetting, sshLogin, sshMethods } from '../../../helpers.ts'

const VPS = 'dojo-linux-m5-v1'
const PORT = 47557

export default [
  {
    id: 'access',
    label: '`sami` se connecte avec sa clé, et `nina` ne peut pas se connecter bien que sa clé soit installée',
    run: onVps(VPS, async (vps, ctx) => {
      const as = async (u: string) => (await sshLogin(ctx, { port: PORT, user: u, key: fixture(import.meta.url, u), command: 'whoami' })).stdout.trim() === u
      if (!(await as('sami'))) return fail('sami ne parvient pas à se connecter avec sa clé.')
      if (!((await vps.readFile('/home/nina/.ssh/authorized_keys')) ?? '').includes('nina@poste')) return fail('La clé de nina a été retirée.')
      if (await as('nina')) return fail('nina se connecte toujours avec sa clé.')
      const members = (await vps.out('getent group ssh-acces | cut -d: -f4')).split(',')
      return members.includes('ubuntu') ? pass() : fail('ubuntu n\'est pas membre de ssh-acces.')
    }),
  },
  {
    id: 'auth',
    label: 'Aucun compte ne se voit proposer d\'authentification par mot de passe, et root ne peut pas se connecter',
    run: onVps(VPS, async (vps, ctx) => {
      for (const user of ['sami', 'ubuntu', 'nina', 'root']) {
        const methods = await sshMethods(ctx, PORT, user)
        if (!methods) return fail(`Le serveur ne répond pas sur le port ${PORT}.`)
        if (methods.some((m) => m === 'password' || m === 'keyboard-interactive')) return fail(`Méthodes proposées à ${user} : ${methods.join(', ')}.`)
      }
      const root = await sshdSetting(vps, 'permitrootlogin', 'user=root,host=client,addr=203.0.113.9')
      return root === 'no' ? pass() : fail(`PermitRootLogin effectif : ${root}.`)
    }),
  },
  {
    id: 'fail2ban',
    label: 'fail2ban bannit pour 30 minutes une adresse qui échoue 5 fois en 10 minutes, sans jamais bannir 192.0.2.50',
    run: onVps(VPS, async (vps) => {
      if ((await vps.out('systemctl is-active fail2ban')) !== 'active') return fail('fail2ban n\'est pas actif.')
      const get = (k: string) => vps.out(`fail2ban-client get sshd ${k} 2>&1`)
      const [maxretry, findtime, bantime] = [await get('maxretry'), await get('findtime'), await get('bantime')]
      if (maxretry !== '5' || findtime !== '600' || bantime !== '1800') return fail(`Prison sshd : maxretry ${maxretry}, findtime ${findtime} s, bantime ${bantime} s.`)
      const ignored = await get('ignoreip')
      return /192\.0\.2\.50(\/32)?\b/.test(ignored) || /192\.0\.2\.0\/24/.test(ignored) ? pass() : fail(`Adresses ignorées : ${ignored.replace(/\s+/g, ' ').slice(0, 120)}.`)
    }),
  },
  {
    id: 'root-attempts',
    label: '`attaques.txt` donne l\'adresse qui a le plus souvent échoué à se connecter en root hier, avec son nombre d\'échecs',
    run: onVps(VPS, async (vps) => {
      const content = await vps.readFile('/home/ubuntu/attaques.txt')
      if (content === null) return fail('/home/ubuntu/attaques.txt n\'existe pas.')
      const got = lines(content)
      return got.length === 1 && got[0] === '150 192.0.2.77' ? pass() : fail(`attaques.txt contient : « ${got.join(' / ').slice(0, 80)} ».`)
    }),
  },
] satisfies Criterion[]
