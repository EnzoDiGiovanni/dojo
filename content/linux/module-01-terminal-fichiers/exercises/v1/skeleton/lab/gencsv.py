import random, sys
products = ["Tarte aux pommes", "Quiche lorraine", "Plateau fromages", "Verrine saumon", "Mini burgers", "Salade niçoise", "Pain surprise"]
seed = int(sys.argv[1])
while True:
    random.seed(seed)
    rows = [("2026-%02d-%02d" % (random.randint(1, 11), random.randint(1, 28)), random.choice(["Mairie", "Cabinet Roux", "Lycée Ampère", "M. Petit", "Studio 9"]),
             random.choice(products), random.randint(1, 40)) for _ in range(random.randint(150, 300))]
    totals = {}
    for r in rows:
        totals[r[2]] = totals.get(r[2], 0) + r[3]
    top = sorted(totals.values(), reverse=True)[:4]
    if len(set(top)) == len(top):
        break
    seed += 1000
with open(sys.argv[2], "w") as f:
    f.write("date;client;produit;quantite\n")
    for r in rows:
        f.write("%s;%s;%s;%d\n" % r)
