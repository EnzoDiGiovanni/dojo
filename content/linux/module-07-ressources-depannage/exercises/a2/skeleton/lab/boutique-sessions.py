import os, sys, time, uuid
while True:
    nom = f"/var/spool/sessions/sess_{uuid.uuid4().hex[:12]}"
    try:
        with open(nom, "w") as f:
            f.write('{"panier":[]}\n')
        print(f"<6>session créée : {os.path.basename(nom)}", flush=True)
    except OSError as e:
        print(f"<3>impossible de créer une session : {e}", file=sys.stderr, flush=True)
    time.sleep(10)
