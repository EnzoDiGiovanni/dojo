"""dojo-m2-v1 : petit service HTTP.

Usage : python app.py [--greeting TEXTE] [--port PORT]
"""
import argparse
import http.server
import signal
import sys
import time

import humanize

START = time.time()

parser = argparse.ArgumentParser()
parser.add_argument("--greeting", default="Bonjour")
parser.add_argument("--port", type=int, default=8000)
args = parser.parse_args()


class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        uptime = humanize.naturaldelta(time.time() - START)
        body = f"{args.greeting} depuis dojo-m2-v1 (en ligne depuis {uptime})\n".encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.end_headers()
        self.wfile.write(body)


def stop(*_):
    print("arrêt propre", flush=True)
    sys.exit(0)


signal.signal(signal.SIGTERM, stop)
print(f"Écoute sur le port {args.port}", flush=True)
http.server.HTTPServer(("0.0.0.0", args.port), Handler).serve_forever()
