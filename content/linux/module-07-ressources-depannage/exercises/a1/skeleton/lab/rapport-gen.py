import os, time
GROS = "/srv/donnees/rapports/rapport-en-cours.tmp"
if os.path.exists("/run/hebergeur/premier-rapport"):
    gros = open(GROS, "wb")
    for _ in range(130):
        gros.write(b"\0" * 1024 * 1024)
    gros.flush()
    open("/run/hebergeur/gros-ecrit", "w").close()
journal = open("/srv/donnees/rapports/rapport.log", "a", buffering=1)
while True:
    journal.write(time.strftime("%H:%M:%S") + " rapport mis à jour\n")
    time.sleep(5)
