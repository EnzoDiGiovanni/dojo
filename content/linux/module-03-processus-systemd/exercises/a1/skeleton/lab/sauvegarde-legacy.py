# Ancien agent de sauvegarde : attend les ordres sur le port 9000.
import signal, socket
signal.signal(signal.SIGTERM, signal.SIG_IGN)
s = socket.socket()
s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
s.bind(("0.0.0.0", 9000))
s.listen()
while True:
    conn, _ = s.accept()
    conn.sendall(b"agent de sauvegarde v0.3\n")
    conn.close()
