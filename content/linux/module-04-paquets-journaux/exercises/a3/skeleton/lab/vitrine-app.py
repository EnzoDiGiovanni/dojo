import datetime, random, signal, time

FICHIERS = {"app": "/var/log/vitrine/app.log", "acces": "/var/log/vitrine/acces.log"}
ouverts = {}

def ouvrir(*_):
    for nom, chemin in FICHIERS.items():
        if nom in ouverts:
            ouverts[nom].close()
        ouverts[nom] = open(chemin, "a", buffering=1)

signal.signal(signal.SIGHUP, ouvrir)
ouvrir()
n = 0
while True:
    n += 1
    now = datetime.datetime.now().isoformat(timespec="seconds")
    ouverts["acces"].write(f"{now} GET /produits/{random.randint(1, 80)} 200\n")
    if n % 4 == 0:
        ouverts["app"].write(f"{now} INFO cache rafraîchi ({n})\n")
    time.sleep(0.25)
