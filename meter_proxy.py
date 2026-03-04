"""
HTTP-прокси для опроса Mercury 236/234 — фазные напряжения для SCADA.
Использует mercury.py из mercury-monitor (MercuryConn + poll_full).
Запуск: python meter_proxy.py
API:    GET http://localhost:8080/api/poll?reg=13401
"""

import sys, os, time, json, logging
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

sys.path.insert(0, os.path.expanduser("~/Desktop/Programs/mercury-monitor"))
from mercury import MercuryConn, Mercury234, make_cmd, check_crc

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger("meter")

# ── Конфиг ──
MODEM_HOST = "194.37.254.51"
MODEM_PORT = 48693
PASSWORD = b'\x02\x02\x02\x02\x02\x02'

METERS = {
    "13401": {"addr": 82, "name": "ТП-1913 ввод", "ct": 400},
}

# ── Опрос через Mercury234.poll_full (как в loss_server) ──
def poll_meter(reg: str) -> dict:
    cfg = METERS.get(reg)
    if not cfg:
        return {"ok": False, "error": f"Счётчик {reg} не найден"}

    addr = cfg["addr"]
    ct = cfg.get("ct", 1)
    result = {"ok": False, "reg": reg, "name": cfg["name"]}
    conn = None

    try:
        conn = MercuryConn(MODEM_HOST, MODEM_PORT, timeout=15.0)
        time.sleep(2)  # пауза после подключения к GSM Bridge
        conn.drain(1.0)

        m = Mercury234(None, addr, PASSWORD)
        data = m.poll_full(conn, ct=ct, read_profiles=False)
        result.update(data)

        # Для SCADA достаточно напряжений — не требуем энергию
        if data.get("Ua") is not None:
            result["ok"] = True
            log.info(f"  {cfg['name']}: Ua={data.get('Ua',0):.1f} Ub={data.get('Ub',0):.1f} Uc={data.get('Uc',0):.1f}")
        else:
            log.warning(f"  {cfg['name']}: {data.get('error', 'no data')}")

    except Exception as e:
        result["error"] = str(e)
        log.error(f"Ошибка: {e}")
    finally:
        if conn:
            conn.close()

    return result

# ── HTTP сервер ──
last_result = {}

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        url = urlparse(self.path)
        if url.path == "/api/poll":
            params = parse_qs(url.query)
            reg = params.get("reg", [""])[0]
            if reg:
                global last_result
                result = poll_meter(reg)
                result["timestamp"] = time.strftime("%Y-%m-%d %H:%M:%S")
                last_result[reg] = result
                self._json(result)
            else:
                self._json({"error": "reg parameter required"}, 400)
        elif url.path == "/api/last":
            params = parse_qs(url.query)
            reg = params.get("reg", [""])[0]
            self._json(last_result.get(reg, {"ok": False, "error": "not polled yet"}))
        else:
            self._json({"status": "ok", "meters": list(METERS.keys())})

    def _json(self, data, code=200):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        pass

if __name__ == "__main__":
    port = 8080
    server = HTTPServer(("0.0.0.0", port), Handler)
    log.info(f"Meter proxy: http://localhost:{port}")
    log.info(f"Модем: {MODEM_HOST}:{MODEM_PORT}")
    log.info(f"Пример: http://localhost:{port}/api/poll?reg=13401")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        log.info("Остановлен")
