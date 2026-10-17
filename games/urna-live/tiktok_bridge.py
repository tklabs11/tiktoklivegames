"""URNA LIVE - servidor local e ponte de presentes TikTok LIVE.
Instale: pip install -r requirements.txt
Execute: python tiktok_bridge.py @usuario
"""
import asyncio
import json
import sys
import threading
import time
from collections import deque
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
CONFIG = ROOT / 'presentes.json'
EVENTS = deque(maxlen=2000)
LOCK = threading.Lock()
SEQ = 0
STATUS = {'connected': False, 'message': 'Aguardando conexão'}

def config():
    return json.loads(CONFIG.read_text(encoding='utf-8'))

def emit(data):
    global SEQ
    with LOCK:
        SEQ += 1
        EVENTS.append({'seq': SEQ, **data})

def classify(gift_id, name):
    name = (name or '').strip().casefold()
    for side, entry in config()['presentes'].items():
        if str(gift_id) in [str(x) for x in entry.get('ids', [])] or name in [x.casefold() for x in entry.get('nomes', [])]:
            return int(side)
    return None

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        route = urlparse(self.path).path
        if route == '/api/events':
            try:
                cursor = int(urlparse(self.path).query.split('cursor=')[-1]) if 'cursor=' in self.path else 0
            except ValueError:
                cursor = 0
            with LOCK:
                result = {'events': [x for x in EVENTS if x['seq'] > cursor], 'cursor': SEQ, 'status': dict(STATUS)}
            payload = json.dumps(result, ensure_ascii=False).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        return super().do_GET()

async def tiktok_loop(user):
    from TikTokLive import TikTokLiveClient
    from TikTokLive.events import ConnectEvent, DisconnectEvent, GiftEvent
    # A conexão TikTokLive v7 é de uso único: a cada tentativa, criar
    # um novo cliente e registrar seus listeners novamente.
    while True:
        client = TikTokLiveClient(unique_id=user)

        @client.on(ConnectEvent)
        async def connected(event):
            STATUS.update(connected=True, message='Conectado à live')
            print('Conectado à live:', user, flush=True)

        @client.on(DisconnectEvent)
        async def disconnected(event):
            STATUS.update(connected=False, message='Desconectado')
            print('TikTok desconectado', flush=True)

        @client.on(GiftEvent)
        async def gift(event):
            g = event.gift
            gift_id = getattr(g, 'id', None)
            name = getattr(g, 'name', '')
            # Presentes em sequência: só contar quando a sequência terminar.
            if getattr(g, 'streakable', False) and not getattr(event, 'repeat_end', True):
                return
            count = max(1, min(int(getattr(event, 'repeat_count', 1) or 1), 500))
            side = classify(gift_id, name)
            sender = getattr(getattr(event, 'user', None), 'unique_id', 'desconhecido')
            print(f'Presente: {name!r} ID={gift_id} x{count} de @{sender} -> {side or "não mapeado"}', flush=True)
            emit({'type': 'gift', 'gift_id': str(gift_id), 'name': name, 'count': count, 'side': side, 'sender': sender})

        try:
            STATUS.update(connected=False, message='Conectando...')
            await client.start()
            # start() também pode retornar normalmente após uma desconexão.
            STATUS.update(connected=False, message='Desconectado; reconectando...')
            print('Conexão encerrada; nova tentativa em 10s', flush=True)
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            STATUS.update(connected=False, message=f'Erro: {exc}')
            print('Falha TikTok:', exc, '- nova tentativa em 10s', flush=True)
        finally:
            STATUS['connected'] = False
            # Evita reutilizar cliente ou manter uma sessão aberta ao reconectar.
            try:
                await client.disconnect()
            except Exception:
                pass
        await asyncio.sleep(10)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Uso: python tiktok_bridge.py @usuario_da_live')
        sys.exit(1)
    user = sys.argv[1].strip()
    preferred = int(sys.argv[2]) if len(sys.argv) > 2 else 8080
    # Windows may reserve ports (WinError 10013). Try alternatives automatically.
    candidates = list(dict.fromkeys([preferred, *range(8081, 8111), 0]))
    server = None
    for port in candidates:
        try:
            server = ThreadingHTTPServer(('127.0.0.1', port), Handler)
            break
        except OSError as exc:
            print(f'Porta {port} indisponível: {exc}', flush=True)
    if server is None:
        print('ERRO: Não foi possível iniciar o servidor local.', flush=True)
        sys.exit(2)
    actual_port = server.server_address[1]
    threading.Thread(target=server.serve_forever, daemon=True).start()
    print(f'SERVER_PORT={actual_port}', flush=True)
    print(f'Tela: http://127.0.0.1:{actual_port}/index.html', flush=True)
    print(f'Painel: http://127.0.0.1:{actual_port}/admin.html', flush=True)
    print('Iniciando conexão com', user)
    try:
        asyncio.run(tiktok_loop(user))
    except KeyboardInterrupt:
        server.shutdown()
