import json
import smtplib
from email.message import EmailMessage
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


class MailRelayHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/send":
            self.send_error(404)
            return

        length = int(self.headers.get("Content-Length", "0"))
        if length > 1_000_000:
            self.send_error(413)
            return

        try:
            payload = json.loads(self.rfile.read(length))
            message = EmailMessage()
            message["From"] = payload["from"]
            message["To"] = ", ".join(payload["to"])
            message["Reply-To"] = payload["reply_to"]
            message["Subject"] = payload["subject"]
            message.set_content(payload["text"])
            message.add_alternative(payload["html"], subtype="html")

            with smtplib.SMTP("mailcatcher", 1025, timeout=10) as smtp:
                smtp.send_message(message)
        except (json.JSONDecodeError, KeyError, smtplib.SMTPException, OSError):
            self.send_error(502)
            return

        self.send_response(202)
        self.end_headers()

    def log_message(self, format, *args):
        print(format % args)


ThreadingHTTPServer(("0.0.0.0", 8025), MailRelayHandler).serve_forever()
