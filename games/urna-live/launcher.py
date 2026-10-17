"""Interface amigável da URNA LIVE; usa apenas a biblioteca padrão do Python."""
import json
import os
import queue
import subprocess
import sys
import threading
import tkinter as tk
from tkinter import messagebox, ttk
from pathlib import Path
import urllib.request
import webbrowser

ROOT = Path(__file__).resolve().parent
CONFIG = ROOT / 'configuracao.json'
DEFAULT = {'usuario': '', 'porta': 8080}

class Launcher:
    def __init__(self, root):
        self.root = root
        root.title('URNA LIVE | Iniciar transmissão')
        root.geometry('670x560')
        root.minsize(570, 480)
        root.configure(bg='#0d1729')
        self.proc = None
        self.messages = queue.Queue()
        try:
            saved = {**DEFAULT, **json.loads(CONFIG.read_text(encoding='utf-8'))}
        except (OSError, ValueError):
            saved = DEFAULT
        self.user = tk.StringVar(value=saved['usuario'])
        self.status = tk.StringVar(value='● Desconectado')
        self.port = int(saved.get('porta', 8080))
        self.server_ready = False
        style = ttk.Style()
        style.theme_use('clam')
        style.configure('TButton', font=('Segoe UI', 11), padding=9)
        frame = tk.Frame(root, bg='#0d1729', padx=24, pady=18)
        frame.pack(fill='both', expand=True)
        tk.Label(frame,text='🗳 URNA LIVE',fg='white',bg='#0d1729',font=('Segoe UI',23,'bold')).pack(anchor='w')
        tk.Label(frame,text='Conecte sua LIVE sem precisar digitar comandos.',fg='#a8b9d0',bg='#0d1729',font=('Segoe UI',11)).pack(anchor='w',pady=(0,17))
        tk.Label(frame,text='Seu usuário do TikTok (sem @)',fg='white',bg='#0d1729',font=('Segoe UI',11)).pack(anchor='w')
        entry=ttk.Entry(frame,textvariable=self.user,font=('Segoe UI',14));entry.pack(fill='x',pady=(5,12));entry.focus_set()
        tk.Label(frame,textvariable=self.status,fg='#77d2ff',bg='#0d1729',font=('Segoe UI',11,'bold')).pack(anchor='w',pady=(0,10))
        row=tk.Frame(frame,bg='#0d1729');row.pack(fill='x',pady=(0,8))
        self.start_btn=ttk.Button(row,text='▶ CONECTAR À LIVE',command=self.start);self.start_btn.pack(side='left',padx=(0,8))
        ttk.Button(row,text='■ Parar',command=self.stop).pack(side='left')
        row2=tk.Frame(frame,bg='#0d1729');row2.pack(fill='x',pady=(0,12))
        ttk.Button(row2,text='📺 Abrir tela da LIVE',command=lambda:self.open_page('index.html')).pack(side='left',padx=(0,8))
        ttk.Button(row2,text='⚙ Abrir painel',command=lambda:self.open_page('admin.html')).pack(side='left')
        tk.Label(frame,text='Registro de conexão e presentes',fg='white',bg='#0d1729',font=('Segoe UI',10,'bold')).pack(anchor='w')
        self.log=tk.Text(frame,height=12,bg='#101f37',fg='#d8e8f8',insertbackground='white',relief='flat',font=('Consolas',10),state='disabled',wrap='word')
        self.log.pack(fill='both',expand=True,pady=(5,8))
        tk.Label(frame,text='🤍 Rosa branca (ID 10602) → 22    |    🌹 Rosa (ID 5655) → 13',fg='#c5d2e2',bg='#0d1729',font=('Segoe UI',10)).pack(anchor='w')
        tk.Label(frame,text='Simulação fictícia de entretenimento. Não é uma votação oficial.',fg='#899bb3',bg='#0d1729',font=('Segoe UI',9)).pack(anchor='w',pady=(5,0))
        self.root.protocol('WM_DELETE_WINDOW',self.close)
        self.root.after(200,self.poll)

    def add_log(self, line):
        self.log.configure(state='normal');self.log.insert('end',line.rstrip()+'\n');self.log.see('end');self.log.configure(state='disabled')

    def start(self):
        if self.proc and self.proc.poll() is None:
            messagebox.showinfo('URNA LIVE','A conexão já está sendo executada.');return
        user=self.user.get().strip().lstrip('@')
        if not user or any(ch.isspace() for ch in user):
            messagebox.showwarning('Usuário inválido','Informe o @usuário da sua conta TikTok.');return
        try:
            CONFIG.write_text(json.dumps({'usuario':user,'porta':self.port},indent=2,ensure_ascii=False),encoding='utf-8')
        except OSError as exc:
            self.add_log('Não foi possível salvar preferências: '+str(exc))
        self.server_ready = False
        self.status.set('● Preparando conexão...')
        self.start_btn.configure(state='disabled')
        threading.Thread(target=self.launch_worker,args=(user,),daemon=True).start()

    def launch_worker(self,user):
        try:
            import TikTokLive
        except ImportError:
            self.messages.put(('log','Instalando dependência TikTokLive (primeira execução)...'))
            try:
                p=subprocess.Popen([sys.executable,'-m','pip','install','-r',str(ROOT/'requirements.txt')],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,encoding='utf-8',errors='replace')
                for line in p.stdout:self.messages.put(('log',line))
                if p.wait()!=0:raise RuntimeError('Falha na instalação. Confira internet, Python e permissões.')
            except Exception as exc:
                self.messages.put(('error',str(exc)));return
        try:
            env=os.environ.copy();env['PYTHONUNBUFFERED']='1'
            self.proc=subprocess.Popen([sys.executable,'-u',str(ROOT/'tiktok_bridge.py'),'@'+user,str(self.port)],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,encoding='utf-8',errors='replace',env=env)
            for line in self.proc.stdout:
                self.messages.put(('log',line))
                if line.startswith('SERVER_PORT='):
                    self.messages.put(('ready',line.strip().split('=',1)[1]))
                if 'Conectado à live:' in line:self.messages.put(('status','● Conectado ao TikTok LIVE'))
                elif 'Falha TikTok:' in line:self.messages.put(('status','● Tentando reconectar...'))
            code=self.proc.wait()
            self.messages.put(('stopped',f'Processo encerrado (código {code}).'))
        except Exception as exc:self.messages.put(('error',str(exc)))

    def stop(self):
        if self.proc and self.proc.poll() is None:
            self.proc.terminate()
            self.add_log('Solicitado encerramento da conexão.')
        self.server_ready = False
        self.status.set('● Desconectado')

    def open_page(self,page):
        if not self.server_ready:
            messagebox.showwarning('Servidor desligado','Clique em CONECTAR À LIVE e aguarde o servidor iniciar.');return
        url=f'http://127.0.0.1:{self.port}/{page}'
        try:urllib.request.urlopen(f'http://127.0.0.1:{self.port}/api/events',timeout=1).close()
        except Exception:
            messagebox.showwarning('Servidor desligado','Clique em CONECTAR À LIVE primeiro.');return
        webbrowser.open(url)

    def poll(self):
        try:
            while True:
                kind,msg=self.messages.get_nowait()
                if kind=='log':self.add_log(msg)
                elif kind=='status':self.status.set(msg)
                elif kind=='ready':
                    self.port = int(msg)
                    self.server_ready = True
                    self.status.set('● Servidor iniciado; conectando ao TikTok...')
                    self.start_btn.configure(state='normal')
                elif kind in ('error','stopped'):
                    self.server_ready = False
                    self.status.set('● Desconectado');self.start_btn.configure(state='normal');self.add_log(msg)
                    if kind=='error':messagebox.showerror('Falha ao iniciar',msg)
        except queue.Empty:pass
        self.root.after(200,self.poll)

    def close(self):
        self.stop();self.root.destroy()

if __name__=='__main__':
    root=tk.Tk();Launcher(root);root.mainloop()
