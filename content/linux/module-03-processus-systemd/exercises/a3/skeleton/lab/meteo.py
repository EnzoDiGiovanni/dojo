import http.server, json, os, pwd, sys

port = int(os.environ.get("PORT", "8000"))
ville = os.environ.get("VILLE")
if not ville:
    sys.exit("VILLE n'est pas définie : impossible de démarrer.")

class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        body = json.dumps({"ville": ville, "temperature": 11, "compte": pwd.getpwuid(os.getuid()).pw_name}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

print(f"météo de {ville} sur le port {port}", flush=True)
http.server.HTTPServer(("0.0.0.0", port), Handler).serve_forever()
