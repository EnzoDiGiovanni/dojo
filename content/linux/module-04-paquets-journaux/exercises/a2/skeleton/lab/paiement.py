import os, sys, time
compteur = "/run/paiement/tentatives"
n = int(open(compteur).read()) + 1 if os.path.exists(compteur) else 1
open(compteur, "w").write(str(n))
print(f"<6>démarrage du module de paiement v2.3 (tentative {n})", flush=True)
print("<6>chargement du certificat client /etc/ssl/banque/client.pem", flush=True)
if n <= 2:
    print("<3>connexion à la banque refusée : certificat expiré", file=sys.stderr, flush=True)
    sys.exit(3)
print("<5>connexion à la banque établie (certificat de secours)", flush=True)
while True:
    time.sleep(60)
