# 🗳 URNA LIVE — Open Source

Simulador **fictício** de votação para transmissões verticais. Não representa uma eleição ou votação oficial.

## 🚀 Iniciar no Windows (sem terminal)

1. Instale o [Python 3.10 ou superior](https://www.python.org/downloads/) e marque **Add Python to PATH** na instalação.
2. Extraia **todo** o ZIP para uma pasta.
3. Dê dois cliques em **`INICIAR-URNA-LIVE.bat`**.
4. Informe o **@usuário** da conta que está fazendo a LIVE e clique **CONECTAR À LIVE**.
5. Na primeira execução, o aplicativo instala automaticamente a biblioteca necessária. **Precisa de internet**.
6. Clique em **Abrir tela da LIVE** e **Abrir painel**.
7. No TikTok LIVE Studio ou OBS, adicione a tela da LIVE como fonte de navegador, em **1080 × 1920**. **Não mostre o painel** ao público.

> É necessário que a conta informada esteja transmitindo ao vivo. A integração usa a biblioteca comunitária TikTokLive, não uma API oficial do TikTok, e pode parar de funcionar com mudanças na plataforma.

## 🎁 Presentes

| Presente | ID | Simulação |
|---|---:|---|
| 🌹 Rose | `5655` | 13 |
| 🤍 White Rose | `10602` | 22 |

Edite `presentes.json` para mudar IDs ou nomes. O projeto identifica presentes por **ID ou nome**. Confirme os IDs recebidos no registro da conexão. Combos são contabilizados quando terminam.

## 🧪 Teste sem presentes

Abra o **painel administrativo** e use os botões de teste para acionar as urnas. Para ver a tela e o painel sem iniciar a conexão TikTok, execute `python -m http.server 8080` na pasta e abra `http://127.0.0.1:8080/index.html` e `/admin.html` (nesse modo, não há detecção de presentes).

## 🛠 Para desenvolvedores

- `index.html`: visual vertical da transmissão.
- `admin.html`: controles manuais e registros.
- `launcher.py`: interface gráfica do Windows/Linux/macOS (Tkinter).
- `tiktok_bridge.py`: servidor local e leitura de eventos da LIVE.
- `presentes.json`: mapeamento dos presentes.
- `requirements.txt`: dependências.

Início via terminal: `python -m pip install -r requirements.txt` e depois `python tiktok_bridge.py @usuario`.

## 🔒 Privacidade e segurança

O servidor atende apenas em `127.0.0.1:8080` (computador local). Não abra portas do roteador nem exponha o painel à internet. Não é necessário informar senha da conta TikTok. O nome de usuário fica salvo localmente em `configuracao.json` (criado ao usar o iniciador; ignorar no Git). A biblioteca externa pode acessar serviços do TikTok.

## 🤝 Contribuições

Sugestões, correções e pull requests são bem-vindos. Antes de enviar alterações, teste com o painel e, quando possível, numa LIVE de testes. Consulte `CONTRIBUTING.md`.

## 📄 Licença

Código sob licença MIT (consulte `LICENSE`). Recursos visuais de terceiros, marcas, retratos e imagens de candidatos **não são automaticamente cobertos** por essa licença; substitua-os por material com direitos adequados antes de redistribuir. TikTok não patrocina nem endossa o projeto.

## Porta local bloqueada no Windows
Se a porta 8080 estiver ocupada ou reservada (WinError 10013), o programa tenta automaticamente as portas 8081–8110 e uma porta livre atribuída pelo sistema. Os botões de abrir tela e painel usam a porta efetivamente escolhida. Não é necessário executar como administrador.

### v20 — Reconexão TikTok

Corrigido o erro `You can only make one connection per client!`: cada tentativa usa uma instância nova do cliente TikTokLive. A porta alternativa automática permanece disponível.


## 🔊 v21 — Sons realistas

A tela agora possui efeitos eletrônicos **originais e sintetizados no navegador** para teclas numéricas, CONFIRMA, presente, mudança de liderança e últimos 10 segundos do cronômetro. Não são gravações oficiais de urnas.

1. Abra a **tela da transmissão** no navegador.
2. Clique em **🔊 ATIVAR SONS** uma vez; ajuste o volume no controle ao lado.
3. Faça um voto de teste pelo painel e confira o som.
4. **OBS/TikTok LIVE Studio:** confira se a fonte de navegador está capturando o áudio. O navegador pode bloquear áudio até receber um clique; em fontes de navegador pode ser necessário interagir com a fonte ou abrir a tela numa janela capturada com áudio.

O botão de som fica fora do enquadramento da arte vertical quando há espaço lateral; em fontes 1080×1920 ele aparece no canto inferior direito. Pode ser ocultado via CSS para transmissão após ativar o áudio. O áudio não é garantido em todas as configurações de captura; teste antes da LIVE.

Próxima etapa planejada: empacotar em `.exe` com instalação simplificada.
