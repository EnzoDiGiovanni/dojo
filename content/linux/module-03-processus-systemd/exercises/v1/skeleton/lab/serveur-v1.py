import http.server

class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        body = b"facturation 1.0 (obsolete)\n"
        self.send_response(200)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

http.server.HTTPServer(("0.0.0.0", 8300), Handler).serve_forever()
