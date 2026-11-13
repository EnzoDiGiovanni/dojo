# Journal d'authentification de la veille, tel que rsyslog l'a écrit.
import random
random.seed(5)
attaquants = {"203.0.113.50": 412, "192.0.2.77": 387, "198.18.4.20": 201, "203.0.113.9": 95, "192.0.2.140": 41, "198.18.77.3": 12}
comptes = ["root", "admin", "oracle", "test", "ubuntu", "postgres", "git"]
lignes = []
for ip, n in attaquants.items():
    for _ in range(n):
        compte = random.choice(comptes)
        t = (random.randint(0, 23), random.randint(0, 59), random.randint(0, 59))
        pid = random.randint(1000, 60000)
        port = random.randint(30000, 65000)
        if compte not in ("root", "ubuntu"):
            lignes.append((t, f"sshd[{pid}]: Invalid user {compte} from {ip} port {port}"))
            lignes.append((t, f"sshd[{pid}]: Failed password for invalid user {compte} from {ip} port {port} ssh2"))
        else:
            lignes.append((t, f"sshd[{pid}]: Failed password for {compte} from {ip} port {port} ssh2"))
        lignes.append((t, f"sshd[{pid}]: Connection closed by authenticating user {compte} {ip} port {port} [preauth]"))
for _ in range(6):
    t = (random.randint(8, 18), random.randint(0, 59), random.randint(0, 59))
    lignes.append((t, f"sshd[{random.randint(1000, 60000)}]: Accepted publickey for deploy from 198.51.100.7 port {random.randint(30000, 65000)} ssh2: ED25519 SHA256:q2Xf0aZr1x"))
lignes.sort()
with open("/var/log/auth.log.1", "w") as f:
    for (h, m, s), texte in lignes:
        f.write(f"2026-11-12T{h:02d}:{m:02d}:{s:02d}.000000+00:00 fabrique {texte}\n")
