import http.server, os, pwd, sys, datetime

DEVISE = os.environ.get("FACT_DEVISE")
SOCIETE = os.environ.get("FACT_SOCIETE")
if not DEVISE or not SOCIETE:
    sys.exit("FACT_DEVISE et FACT_SOCIETE doivent être définies")
JOURNAL = "/var/lib/facturation/consultations.log"

class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        with open(JOURNAL, "a") as f:
            f.write(datetime.datetime.now().isoformat() + "\n")
        body = f"facturation 2.0 {SOCIETE} devise={DEVISE} compte={pwd.getpwuid(os.getuid()).pw_name}\n".encode()
        self.send_response(200)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

http.server.HTTPServer(("127.0.0.1", 8300), Handler).serve_forever()
