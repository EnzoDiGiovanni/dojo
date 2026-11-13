import type { Criterion } from '#check'
import { fail, lines, onVps, pass, sshLogin } from '../../../helpers.ts'

const VPS = 'dojo-linux-m5-i2'
const PORT = 47555
const EXPECTED = ['412 203.0.113.50', '387 192.0.2.77', '201 198.18.4.20']
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export default [
  {
    id: 'report',
    label: '`attaques.txt` donne les 3 adresses qui ont échoué le plus souvent hier, avec leur nombre d\'échecs',
    run: onVps(VPS, async (vps) => {
      const content = await vps.readFile('/home/ubuntu/attaques.txt')
      if (content === null) return fail('/home/ubuntu/attaques.txt n\'existe pas.')
      const got = lines(content)
      if (got.length !== 3) return fail(`attaques.txt contient ${got.length} ligne(s) au lieu de 3.`)
      const i = got.findIndex((l, n) => l !== EXPECTED[n])
      return i < 0 ? pass() : fail(`Ligne ${i + 1} : « ${got[i]} ».`)
    }),
  },
  {
    id: 'jail',
    label: 'fail2ban surveille SSH : 3 échecs en 10 minutes valent un bannissement d\'une heure',
    run: onVps(VPS, async (vps) => {
      if ((await vps.out('systemctl is-active fail2ban')) !== 'active') return fail('fail2ban n\'est pas actif.')
      const get = (k: string) => vps.out(`fail2ban-client get sshd ${k} 2>&1`)
      const [maxretry, findtime, bantime] = [await get('maxretry'), await get('findtime'), await get('bantime')]
      if (maxretry !== '3' || findtime !== '600' || bantime !== '3600') return fail(`Prison sshd : maxretry ${maxretry}, findtime ${findtime} s, bantime ${bantime} s.`)
      const modified = await vps.out(`dpkg -V fail2ban 2>/dev/null | grep -F '/etc/fail2ban/jail.conf'`)
      return modified ? fail('/etc/fail2ban/jail.conf a été modifié.') : pass()
    }),
  },
  {
    id: 'office',
    label: 'Les adresses du bureau ne sont jamais bannies',
    run: onVps(VPS, async (vps) => {
      if ((await vps.out('systemctl is-active fail2ban')) !== 'active') return fail('fail2ban n\'est pas actif.')
      const ignored = await vps.out('fail2ban-client get sshd ignoreip 2>&1')
      if (/198\.51\.100\.0\/24/.test(ignored)) return pass()
      const probe = await vps.sh('python3 -c "import ipaddress,sys; nets=[ipaddress.ip_network(n.strip(\'|-` \'), strict=False) for n in sys.stdin.read().split() if n.strip(\'|-` \').count(\'.\')==3]; sys.exit(0 if all(any(ipaddress.ip_address(a) in n for n in nets) for a in (\'198.51.100.1\',\'198.51.100.254\')) else 1)"', { stdin: ignored })
      return probe.code === 0 ? pass() : fail(`Adresses ignorées par la prison sshd : ${ignored.replace(/\s+/g, ' ').slice(0, 120)}.`)
    }),
  },
  {
    id: 'ban',
    label: 'Après plusieurs échecs de connexion, l\'adresse fautive est réellement bannie',
    run: onVps(VPS, async (vps, ctx) => {
      if ((await vps.out('systemctl is-active fail2ban')) !== 'active') return fail('fail2ban n\'est pas actif.')
      const dir = await ctx.tempDir()
      await ctx.exec('ssh-keygen', ['-q', '-t', 'ed25519', '-N', '', '-f', `${dir}/intrus`])
      const user = `sonde${Date.now().toString(36)}`
      for (let i = 0; i < 5; i++) await sshLogin(ctx, { port: PORT, user, key: `${dir}/intrus` })
      const ip = await vps.out(`journalctl -t sshd --no-pager -o cat | grep -oP 'Invalid user ${user} from \\K[0-9.]+' | tail -n 1`)
      if (!ip) return fail('Les tentatives de la vérification n\'apparaissent pas dans le journal de sshd.')
      let banned = false
      for (let i = 0; i < 20 && !banned; i++) {
        await sleep(1000)
        banned = (await vps.out('fail2ban-client status sshd 2>&1')).includes(ip)
      }
      try {
        if (!banned) return fail(`Après 5 échecs depuis ${ip}, l'adresse n'est pas bannie.`)
        const after = await sshLogin(ctx, { port: PORT, user, key: `${dir}/intrus` })
        return /Permission denied/.test(after.stderr) ? fail(`${ip} figure parmi les bannis, mais ses connexions arrivent toujours jusqu'à sshd.`) : pass(`${ip} bannie puis débannie par la vérification.`)
      } finally {
        await vps.sh(`fail2ban-client set sshd unbanip ${ip} >/dev/null 2>&1`)
      }
    }),
  },
] satisfies Criterion[]
