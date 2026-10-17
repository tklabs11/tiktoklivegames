"""TikTokLiveGames Launcher — standard-library desktop GUI."""
import json
import os
import queue
import re
import subprocess
import sys
import threading
import tkinter as tk
from pathlib import Path
from tkinter import messagebox, ttk
import urllib.request
import urllib.error
import webbrowser

ROOT = Path(sys.executable).resolve().parent if getattr(sys, 'frozen', False) else Path(__file__).resolve().parent
GAMES = ROOT / 'games'
SETTINGS = Path(os.environ.get('APPDATA', str(Path.home()))) / 'TikTokLiveGames' / 'settings.json'


def resource_path(path):
    return ROOT / path


def available_games():
    found = {}
    for folder in sorted(GAMES.iterdir()) if GAMES.exists() else []:
        manifest = folder / 'game.json'
        if not manifest.is_file():
            continue
        try:
            data = json.loads(manifest.read_text(encoding='utf-8'))
            if not (folder / data['bridge']).is_file() or not (folder / data['screen']).is_file():
                continue
            found[data['id']] = (folder, data)
        except (OSError, ValueError, KeyError):
            continue
    return found


class App:
    def __init__(self, root):
        self.root = root
        root.title('TikTokLiveGames Launcher')
        root.geometry('760x640')
        root.minsize(650, 570)
        root.configure(bg='#101827')
        self.games = available_games()
        self.messages = queue.Queue()
        self.proc = None
        self.port = None
        self.running_game = None
        try:
            prefs = json.loads(SETTINGS.read_text(encoding='utf-8'))
        except (OSError, ValueError):
            prefs = {}
        self.username = tk.StringVar(value=prefs.get('username', ''))
        self.game = tk.StringVar(value=prefs.get('game', next(iter(self.games), '')))
        self.status = tk.StringVar(value='Desconectado')
        self.selected_port = int(prefs.get('port', 8080))
        self.build_ui()
        self.root.protocol('WM_DELETE_WINDOW', self.close)
        self.root.after(150, self.poll)

    def build_ui(self):
        BG = '#090E1B'; PANEL = '#121B2D'; CARD = '#18243A'
        MUTED = '#93A5C0'; WHITE = '#F4F7FF'; CYAN = '#32D9E8'
        self.root.configure(bg=BG)
        self.root.title('TikTokLiveGames Launcher | TKLabs')
        self.root.geometry('1010x770')
        self.root.minsize(830, 690)

        outer = tk.Frame(self.root, bg=BG, padx=30, pady=22)
        outer.pack(fill='both', expand=True)
        head = tk.Frame(outer, bg=BG)
        head.pack(fill='x', pady=(0, 22))
        tk.Label(head, text='◈', bg=BG, fg=CYAN, font=('Segoe UI Symbol', 29, 'bold')).pack(side='left', padx=(0, 12))
        htext = tk.Frame(head, bg=BG)
        htext.pack(side='left')
        tk.Label(htext, text='TikTokLiveGames', bg=BG, fg=WHITE, font=('Segoe UI', 24, 'bold')).pack(anchor='w')
        tk.Label(htext, text='by TKLabs  •  Seus jogos interativos. Uma única central.', bg=BG, fg=MUTED, font=('Segoe UI', 10)).pack(anchor='w')
        self.status_badge = tk.Label(head, text='●  DESCONECTADO', bg='#273044', fg='#B7C3D7', font=('Segoe UI', 10, 'bold'), padx=17, pady=10)
        self.status_badge.pack(side='right')
        main = tk.Frame(outer, bg=BG)
        main.pack(fill='both', expand=True)
        left = tk.Frame(main, bg=BG)
        left.pack(side='left', fill='both', expand=True, padx=(0, 20))
        right = tk.Frame(main, bg=BG, width=300)
        right.pack(side='right', fill='y')
        right.pack_propagate(False)

        tk.Label(left, text='BIBLIOTECA DE JOGOS', bg=BG, fg=MUTED, font=('Segoe UI', 9, 'bold')).pack(anchor='w', pady=(0, 10))
        self.game_cards = {}
        games_frame = tk.Frame(left, bg=BG)
        games_frame.pack(fill='x')
        names = {'urna-live': ('URNA LIVE', 'Presentes • Simulação', '▣', '#2FC9EB'),
                 'pipa-live': ('PIPA COMBAT', 'Chat • Pipas e poderes', '◇', '#F4B35B'),
                 'chat-war-live': ('CHAT WAR', 'Chat • Arena de combate', '✦', '#B09AFF'),
                 'corrida-chat-live': ('CORRIDA DO CHAT', 'Chat • Corrida arcade', '▰', '#5DDBA3')}
        for i, (gid, (folder, manifest)) in enumerate(self.games.items()):
            title, subtitle, symbol, accent = names.get(gid, (manifest.get('name', gid), manifest.get('events', 'Jogo interativo'), '◆', CYAN))
            card = tk.Frame(games_frame, bg=CARD, padx=16, pady=13, cursor='hand2', highlightthickness=2, highlightbackground=CARD)
            card.grid(row=i//2, column=i%2, sticky='nsew', padx=(0, 10) if i%2==0 else (0,0), pady=(0, 10))
            icon = tk.Label(card, text=symbol, bg=CARD, fg=accent, font=('Segoe UI Symbol', 27, 'bold'))
            icon.pack(anchor='w')
            label = tk.Label(card, text=title, bg=CARD, fg=WHITE, font=('Segoe UI', 11, 'bold'))
            label.pack(anchor='w', pady=(7, 2))
            sub = tk.Label(card, text=subtitle, bg=CARD, fg=MUTED, font=('Segoe UI', 9))
            sub.pack(anchor='w')
            self.game_cards[gid] = (card, icon, label, sub, accent)
            for widget in (card, icon, label, sub):
                widget.bind('<Button-1>', lambda event, game_id=gid: self.select_game(game_id))
        games_frame.grid_columnconfigure(0, weight=1, uniform='games')
        games_frame.grid_columnconfigure(1, weight=1, uniform='games')
        self.desc = tk.Label(left, text='', bg=BG, fg=MUTED, font=('Segoe UI', 10), justify='left', wraplength=530)
        self.desc.pack(fill='x', anchor='w', pady=(8, 18))
        tk.Label(left, text='ATIVIDADE E DIAGNÓSTICO', bg=BG, fg=MUTED, font=('Segoe UI', 9, 'bold')).pack(anchor='w', pady=(0, 9))
        logwrap = tk.Frame(left, bg=PANEL, padx=12, pady=12)
        logwrap.pack(fill='both', expand=True)
        self.log = tk.Text(logwrap, bg=PANEL, fg='#C5D9EE', insertbackground=WHITE, font=('Consolas', 9), relief='flat', borderwidth=0, height=8, state='disabled', wrap='word')
        self.log.pack(side='left', fill='both', expand=True)
        scroll = tk.Scrollbar(logwrap, command=self.log.yview, bg=PANEL)
        scroll.pack(side='right', fill='y')
        self.log.configure(yscrollcommand=scroll.set)

        connection = tk.Frame(right, bg=PANEL, padx=19, pady=19)
        connection.pack(fill='x')
        tk.Label(connection, text='CONEXÃO TIKTOK', bg=PANEL, fg=MUTED, font=('Segoe UI', 9, 'bold')).pack(anchor='w')
        tk.Label(connection, text='Conecte sua transmissão', bg=PANEL, fg=WHITE, font=('Segoe UI', 14, 'bold')).pack(anchor='w', pady=(10, 3))
        tk.Label(connection, text='Informe o usuário sem @', bg=PANEL, fg=MUTED, font=('Segoe UI', 9)).pack(anchor='w', pady=(0, 10))
        self.user_entry = tk.Entry(connection, textvariable=self.username, bg='#0A1222', fg=WHITE, insertbackground=WHITE, relief='flat', font=('Segoe UI', 12), bd=0)
        self.user_entry.pack(fill='x', ipady=11, pady=(0, 12))
        self.connect_btn = tk.Button(connection, text='▶   CONECTAR À LIVE', command=self.start, bg='#20C8DA', fg='#07111D', activebackground='#55E2EC', activeforeground='#07111D', relief='flat', bd=0, cursor='hand2', font=('Segoe UI', 10, 'bold'), pady=11)
        self.connect_btn.pack(fill='x', pady=(0, 8))
        tk.Button(connection, text='■   DESCONECTAR', command=self.stop, bg='#25334A', fg=WHITE, activebackground='#344762', activeforeground=WHITE, relief='flat', bd=0, cursor='hand2', font=('Segoe UI', 10, 'bold'), pady=10).pack(fill='x')
        tk.Label(connection, textvariable=self.status, bg=PANEL, fg='#7FDCCB', font=('Segoe UI', 9), wraplength=240).pack(anchor='w', pady=(13, 0))

        tools = tk.Frame(right, bg=PANEL, padx=19, pady=19)
        tools.pack(fill='x', pady=(14, 0))
        tk.Label(tools, text='FERRAMENTAS DO JOGO', bg=PANEL, fg=MUTED, font=('Segoe UI', 9, 'bold')).pack(anchor='w', pady=(0, 12))
        def toolbutton(text, command):
            btn = tk.Button(tools, text=text, command=command, bg='#24334C', fg=WHITE, activebackground='#344762', activeforeground=WHITE, relief='flat', bd=0, cursor='hand2', font=('Segoe UI', 10, 'bold'), pady=11)
            btn.pack(fill='x', pady=(0, 8))
            return btn
        toolbutton('▣   ABRIR TRANSMISSÃO', lambda: self.open_page('screen'))
        self.admin_btn = toolbutton('☷   ABRIR PAINEL', lambda: self.open_page('admin'))
        self.gift_btn = toolbutton('⚙   CONFIGURAR PRESENTES', self.edit_gifts)
        tk.Label(outer, text='© 2026 TKLabs  •  Open Source  •  Jogos independentes  •  Respeite as regras do TikTok LIVE', bg=BG, fg='#72849E', font=('Segoe UI', 9)).pack(anchor='w', pady=(14, 0))
        self.show_game()

    def select_game(self, game_id):
        if self.running_game is not None:
            messagebox.showinfo('Jogo em execução', 'Desconecte antes de trocar de jogo.')
            return
        self.game.set(game_id)
        self.show_game()

    def show_game(self):
        game = self.games.get(self.game.get())
        if hasattr(self, 'desc'):
            self.desc.configure(text=game[1].get('description', '') if game else 'Nenhum jogo encontrado em games/.')
        if hasattr(self, 'game_cards'):
            for gid, (card, icon, label, sub, accent) in self.game_cards.items():
                selected = gid == self.game.get()
                bg = '#22334F' if selected else '#18243A'
                card.configure(bg=bg, highlightbackground=accent if selected else bg)
                for widget in (icon, label, sub):
                    widget.configure(bg=bg)
        if hasattr(self, 'gift_btn'):
            self.gift_btn.configure(state='normal' if game and (game[0] / 'presentes.json').exists() else 'disabled')
        if hasattr(self, 'admin_btn'):
            self.admin_btn.configure(state='normal' if game and game[1].get('admin') else 'disabled')

    def logline(self, line):
        self.log.configure(state='normal')
        self.log.insert('end', line.rstrip() + '\n')
        self.log.see('end')
        self.log.configure(state='disabled')

    def save(self):
        try:
            SETTINGS.parent.mkdir(parents=True, exist_ok=True)
            SETTINGS.write_text(json.dumps({'username': self.username.get().strip().lstrip('@'), 'game': self.game.get(), 'port': self.selected_port}, ensure_ascii=False, indent=2), encoding='utf-8')
        except OSError as exc:
            self.logline('Preferências não salvas: ' + str(exc))

    def start(self):
        if self.proc and self.proc.poll() is None:
            messagebox.showinfo('TikTokLiveGames', 'Um jogo já está conectado. Desconecte antes de trocar.')
            return
        if self.running_game is not None:
            messagebox.showinfo('Aguarde', 'Aguarde o encerramento do jogo anterior.')
            return
        user = self.username.get().strip().lstrip('@')
        if not re.fullmatch(r'[\w.]{2,30}', user, flags=re.ASCII):
            messagebox.showwarning('Usuário inválido', 'Informe o nome de usuário do TikTok, sem @.')
            return
        game = self.games.get(self.game.get())
        if not game:
            messagebox.showerror('Jogo não encontrado', 'Não há um jogo válido selecionado.')
            return
        self.save()
        self.port = None
        self.running_game = game
        self.status.set('Iniciando servidor...')
        self.status_badge.configure(text='●  INICIANDO', fg='#F3C875')
        self.connect_btn.configure(state='disabled')
        threading.Thread(target=self.worker, args=(user, game), daemon=True).start()

    def worker(self, user, game):
        folder, manifest = game
        try:
            if manifest.get('runtime') == 'node':
                import shutil
                node = shutil.which('node')
                if not node:
                    raise RuntimeError('Este jogo precisa do Node.js instalado. Instale Node.js LTS e reinicie o launcher.')
                if not (folder / 'node_modules').is_dir():
                    raise RuntimeError('Dependências do jogo ausentes. Execute INSTALAR-JOGOS-NODE.bat uma vez.')
                import socket
                with socket.socket() as sock:
                    sock.bind(('127.0.0.1', 0))
                    game_port = sock.getsockname()[1]
                command = [node, str(folder / manifest['bridge'])]
                env = os.environ.copy()
                env.update(TLG_USERNAME=user, TLG_PORT=str(game_port), HOST='127.0.0.1', PYTHONIOENCODING='utf-8')
                self.messages.put(('ready', game_port))
                self.messages.put(('status', 'Servidor iniciado; conectando ao TikTok...'))
                self._run_process(command, folder, env, manifest, game_port)
                return
            if getattr(sys, 'frozen', False):
                command = [sys.executable, '--bridge', str(folder / manifest['bridge']), '@' + user, str(self.selected_port)]
            else:
                command = [sys.executable, '-u', str(folder / manifest['bridge']), '@' + user, str(self.selected_port)]
            env = os.environ.copy()
            env['PYTHONUNBUFFERED'] = '1'
            env['PYTHONIOENCODING'] = 'utf-8'
            self._run_process(command, folder, env, manifest, None)
        except Exception as exc:
            self.messages.put(('error', str(exc)))

    def _run_process(self, command, folder, env, manifest, game_port):
        self.proc = subprocess.Popen(command, cwd=str(folder), stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding='utf-8', errors='replace', env=env, creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
        for line in self.proc.stdout:
            self.messages.put(('log', line))
            if line.startswith('SERVER_PORT='):
                self.messages.put(('ready', int(line.strip().split('=', 1)[1])))
            if 'Conectado à live:' in line or 'Conectado à live de' in line or 'Conectado à live de @' in line:
                self.messages.put(('status', 'Conectado ao TikTok LIVE'))
            elif 'Falha TikTok:' in line:
                self.messages.put(('status', 'Reconectando ao TikTok...'))
        code = self.proc.wait()
        self.messages.put(('stopped', 'Servidor encerrado (código {}).'.format(code)))

    def stop(self):
        if self.proc and self.proc.poll() is None:
            self.proc.terminate()
            self.logline('Desconexão solicitada.')
        self.port = None
        self.status.set('Desconectado')
        self.status_badge.configure(text='●  DESCONECTADO', fg='#B7C3D7')

    def open_page(self, kind):
        if self.port is None or self.running_game is None:
            messagebox.showwarning('Servidor desligado', 'Conecte primeiro para abrir o jogo.')
            return
        try:
            endpoint = '/api/events' if self.running_game[1].get('runtime') != 'node' else '/health'
            try:
                urllib.request.urlopen('http://127.0.0.1:{}{}'.format(self.port, endpoint), timeout=2).close()
            except urllib.error.HTTPError as response:
                if response.code != 503:
                    raise
        except Exception:
            messagebox.showwarning('Servidor desligado', 'O servidor não está respondendo.')
            return
        name = self.running_game[1].get(kind)
        if not name:
            messagebox.showinfo('Sem painel', 'Este jogo não possui painel separado.')
            return
        webbrowser.open('http://127.0.0.1:{}/{}'.format(self.port, name))

    def edit_gifts(self):
        game = self.games.get(self.game.get())
        if not game:
            return
        path = game[0] / 'presentes.json'
        if not path.exists():
            messagebox.showinfo('Presentes', 'Este jogo não utiliza presentes configuráveis.')
            return
        try:
            data = json.loads(path.read_text(encoding='utf-8'))
        except (OSError, ValueError) as exc:
            messagebox.showerror('Configuração inválida', str(exc))
            return
        win = tk.Toplevel(self.root)
        win.title('Presentes — ' + game[1]['name'])
        win.geometry('480x310')
        fields = {}
        for side, item in data.get('presentes', {}).items():
            tk.Label(win, text='IDs do lado {} (separados por vírgula)'.format(side), font=('Segoe UI', 10, 'bold')).pack(anchor='w', padx=20, pady=(15, 4))
            var = tk.StringVar(value=', '.join(map(str, item.get('ids', []))))
            ttk.Entry(win, textvariable=var).pack(fill='x', padx=20)
            fields[side] = var
        tk.Label(win, text='Desconecte e reconecte após alterar os IDs.', fg='#555').pack(anchor='w', padx=20, pady=14)
        def save_ids():
            try:
                for side, var in fields.items():
                    tokens = [v.strip() for v in var.get().split(',') if v.strip()]
                    if not tokens or any(not v.isdigit() for v in tokens):
                        raise ValueError('Informe IDs numéricos válidos para {}'.format(side))
                    data['presentes'][side]['ids'] = [int(v) for v in tokens]
                path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')
                messagebox.showinfo('Salvo', 'IDs atualizados.')
                win.destroy()
            except (OSError, ValueError) as exc:
                messagebox.showerror('Erro', str(exc))
        ttk.Button(win, text='SALVAR IDs', command=save_ids).pack(pady=8)

    def poll(self):
        try:
            while True:
                kind, value = self.messages.get_nowait()
                if kind == 'log':
                    self.logline(value)
                elif kind == 'ready':
                    self.port = value
                    self.status.set('Servidor iniciado; conectando ao TikTok...')
                elif kind == 'status':
                    self.status.set(value)
                    self.status_badge.configure(text='●  CONECTADO' if 'Conectado ao TikTok' in value else '●  CONECTANDO', fg='#7FDCCB' if 'Conectado ao TikTok' in value else '#F3C875')
                elif kind in ('stopped', 'error'):
                    self.port = None
                    self.running_game = None
                    self.proc = None
                    self.connect_btn.configure(state='normal')
                    self.status.set('Desconectado')
                    self.status_badge.configure(text='●  DESCONECTADO', fg='#B7C3D7')
                    self.logline(value)
                    if kind == 'error':
                        messagebox.showerror('Erro', value)
        except queue.Empty:
            pass
        self.root.after(150, self.poll)

    def close(self):
        self.stop()
        self.root.destroy()


def main():
    if len(sys.argv) > 1 and sys.argv[1] == '--bridge':
        # Frozen app relaunches itself to run the TikTok bridge as a subprocess.
        bridge = Path(sys.argv[2]).resolve()
        if not bridge.is_file() or bridge.name != 'tiktok_bridge.py' or bridge.parent.parent != GAMES:
            raise SystemExit('Caminho de ponte inválido')
        sys.argv = [str(bridge), *sys.argv[3:]]
        import runpy
        runpy.run_path(str(bridge), run_name='__main__')
        return
    root = tk.Tk()
    App(root)
    root.mainloop()


if __name__ == '__main__':
    main()
