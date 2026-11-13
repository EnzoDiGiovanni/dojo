# Journal d'authentification de la veille, tel que rsyslog l'a écrit.
import random
random.seed(11)
tentatives = [("203.0.113.50", "root", 30), ("203.0.113.50", "admin", 400), ("192.0.2.77", "root", 150),
              ("198.18.4.20", "root", 120), ("198.18.4.20", "rootadmin", 60), ("203.0.113.9", "root", 75), ("192.0.2.140", "oracle", 90)]
lignes = []
for ip, compte, n in tentatives:
    for _ in range(n):
        t = (random.randint(0, 23), random.randint(0, 59), random.randint(0, 59))
        pid, port = random.randint(1000, 60000), random.randint(30000, 65000)
        if compte == "root":
            lignes.append((t, f"sshd[{pid}]: Failed password for root from {ip} port {port} ssh2"))
        else:
            lignes.append((t, f"sshd[{pid}]: Invalid user {compte} from {ip} port {port}"))
            lignes.append((t, f"sshd[{pid}]: Failed password for invalid user {compte} from {ip} port {port} ssh2"))
lignes.sort()
with open("/var/log/auth.log.1", "w") as f:
    for (h, m, s), texte in lignes:
        f.write(f"2026-11-12T{h:02d}:{m:02d}:{s:02d}.000000+00:00 fabrique {texte}\n")
