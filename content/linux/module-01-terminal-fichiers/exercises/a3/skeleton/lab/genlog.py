import random, sys
random.seed(int(sys.argv[1]))
ips = list(dict.fromkeys(
    ["%d.%d.%d.%d" % (random.randint(11, 223), random.randint(0, 255), random.randint(0, 255), random.randint(1, 254)) for _ in range(30)]
    + ["2001:db8::%x" % random.randint(1, 4000) for _ in range(5)]))
counts = random.sample(range(5, 400), len(ips))
paths = ["/", "/contact", "/produits", "/img/logo.png", "/panier", "/api/stock", "/recherche"]
hot = random.choice(paths[1:])
lines = []
for ip, n in zip(ips, counts):
    for _ in range(n):
        status = random.choice([200, 200, 200, 200, 301, 304, 404, 500, 502, 503])
        path = random.choice(paths)
        if status >= 500 and random.random() < 0.5:
            path = hot + "?id=%d" % random.randint(1, 99)
        elif random.random() < 0.3:
            path += "?id=%d" % random.randint(1, 99)
        size = random.choice([random.randint(200, 9000), random.choice([500, 502, 503, 404])])
        lines.append('%s - - [12/Nov/2026:%02d:%02d:%02d +0100] "GET %s HTTP/1.1" %d %d "-" "Mozilla/5.0"'
                     % (ip, random.randint(0, 23), random.randint(0, 59), random.randint(0, 59), path, status, size))
random.shuffle(lines)
open(sys.argv[2], "w").write("\n".join(lines) + "\n")
