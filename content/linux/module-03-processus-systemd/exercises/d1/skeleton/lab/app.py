import http.server, os, sys, urllib.parse

DB = os.environ.get("RESA_DB")
if not DB:
    sys.exit("RESA_DB n'est pas défini")
ACCUEIL = open("messages/accueil.txt", encoding="utf-8").read().strip()

class Handler(http.server.BaseHTTPRequestHandler):
    def reply(self, code, text):
        body = (text + "\n").encode()
        self.send_response(code)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        lines = open(DB, encoding="utf-8").read().splitlines() if os.path.exists(DB) else []
        self.reply(200, "\n".join([ACCUEIL, f"reservations: {len(lines)}", *lines]))

    def do_POST(self):
        nom = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query).get("nom", [""])[0]
        if not nom:
            return self.reply(400, "paramètre nom manquant")
        try:
            with open(DB, "a", encoding="utf-8") as f:
                f.write(nom + "\n")
        except OSError as e:
            print(f"écriture impossible : {e}", file=sys.stderr, flush=True)
            return self.reply(500, "erreur interne")
        self.reply(201, f"réservation enregistrée : {nom}")

print("service de réservation prêt sur le port 8200", flush=True)
http.server.HTTPServer(("127.0.0.1", 8200), Handler).serve_forever()
