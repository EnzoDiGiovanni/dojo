import time
for i in range(3):
    print(f"<6>stock : synchronisation {i + 1}/3 terminée", flush=True)
    time.sleep(1)
print("<4>stock : 2 articles sans prix", flush=True)
while True:
    time.sleep(60)
