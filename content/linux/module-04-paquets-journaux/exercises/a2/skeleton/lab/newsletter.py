import sys, time
print("<6>newsletter : 120 courriels à envoyer", flush=True)
time.sleep(2)
print("<4>newsletter : file d'attente lente", flush=True)
print("<3>newsletter : quota SMTP atteint, envoi suspendu pour 1 h", file=sys.stderr, flush=True)
while True:
    time.sleep(60)
