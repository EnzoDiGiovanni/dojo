import datetime, os, pwd
jour = datetime.date.today().isoformat()
with open(f"/var/lib/facturation/relances-{jour}.txt", "w") as f:
    f.write("Agence Roux : facture 2026-041 en retard\n")
print(f"relances envoyées ({pwd.getpwuid(os.getuid()).pw_name})")
