# CHAT WAR LIVE

Shooter vertical interativo para TikTok LIVE. Mensagens do chat colocam jogadores na arena; presentes promovem o jogador para uma classe ELITE com skin, arma e dano melhores.

## Requisitos

- Node.js 18 ou superior
- Conta TikTok LIVE
- Usuário do TikTok configurado no arquivo `chat-war-live/.env`

## 1. Instalar dependências

Abra o PowerShell na pasta principal `pipa-live`:

```powershell
npm install
```

As dependências ficam na pasta principal, mas a configuração do CHAT WAR LIVE é separada e fica dentro da própria pasta do jogo.

## 2. Configurar o TikTok

Dentro da pasta `chat-war-live`, copie `.env.example` para `.env` e edite:

```env
TIKTOK_USERNAME=seu_usuario
HOST=0.0.0.0
CHAT_WAR_PORT=8082
```

Não coloque `@` no usuário. Exemplo:

```env
TIKTOK_USERNAME=joao23
```

O usuário precisa estar transmitindo para a conexão funcionar. O jogo continua abrindo em modo demo mesmo quando a live está offline.

## Tela inicial do CHAT WAR LIVE

O CHAT WAR LIVE já possui uma tela inicial própria. Nela você informa o usuário, escolhe o modo e seleciona o mapa antes de iniciar:

- `TikTok Live`: inicia a arena com o usuário informado e usa a conexão TikTok configurada no `.env`.
- `Demo Mode`: inicia uma partida local com jogadores de teste.
- `Mapa`: permite escolher entre `Urban Strike` e `Industrial Base`.

Importante: o usuário digitado na tela identifica o jogador inicial. A conta da live que o bridge acompanha continua sendo definida por `TIKTOK_USERNAME` no `chat-war-live/.env`.

## 3. Iniciar o servidor

Na pasta principal `pipa-live`:

```powershell
node .\chat-war-live\server.js
```

Quando iniciar corretamente, abra:

- Jogo: http://localhost:8082/
- Health check: http://localhost:8082/health

O health check deve retornar um JSON semelhante a:

```json
{
  "ok": true,
  "app": "CHAT WAR LIVE",
  "tiktokConnected": true,
  "liveUsername": "seu_usuario",
  "port": 8082
}
```

## 4. Testar sem TikTok

1. Abra http://localhost:8082/
2. Na tela inicial, clique em `Demo` ou selecione `Demo Mode` e clique em `Iniciar`.
3. Use os controles do painel demo:
   - adicionar jogadores;
   - simular chat;
   - simular presente;
   - limpar a arena.

No modo demo, os jogadores patrulham o mapa, procuram inimigos com linha de visão livre, atiram, morrem e aguardam uma nova mensagem ou presente para retornar.

## 5. Como os eventos funcionam

### Chat

Quando um usuário envia uma mensagem, ele entra na arena com uma skin comum. As skins comuns são distribuídas entre as variantes Azure, Crimson, Toxic e Violet.

Depois de morrer, o usuário não reaparece automaticamente. Ele precisa enviar uma nova mensagem após o cooldown para voltar.

### Presente

Quando o usuário envia um presente, ele entra ou retorna como jogador ELITE:

- skin VIP dourada;
- mais vida;
- arma premium;
- dano aumentado;
- projéteis dourados.

## 6. Portas

- `8082`: servidor do CHAT WAR LIVE.


Para alterar a porta do CHAT WAR LIVE:

```env
CHAT_WAR_PORT=8083
```

Se a porta estiver ocupada, descubra o processo no Windows:

```powershell
Get-NetTCPConnection -LocalPort 8082 -State Listen
```

## 7. Parar o servidor

No terminal onde o servidor está rodando, pressione:

```text
Ctrl + C
```

Ou, pelo PowerShell, usando o PID encontrado:

```powershell
Stop-Process -Id NUMERO_DO_PID -Force
```

## Problemas comuns

### `TIKTOK_USERNAME não configurado`

Confira se o arquivo `.env` está dentro de `chat-war-live`, ao lado de `server.js`.

### TikTok offline

O usuário informado precisa estar ao vivo. Verifique também se o nome está correto e sem `@`.

### A porta 8082 já está em uso

Use outro valor em `CHAT_WAR_PORT` ou encerre o processo que está escutando na porta.

### O site abriu sem estilo

Acesse a URL pelo servidor, não abrindo o arquivo diretamente. Use:

```text
http://localhost:8082/
```

### Os botões Demo não respondem

Recarregue a página e confirme que está usando o servidor novo em `8082`. O painel Demo aparece depois de clicar em `Demo`.

## Estrutura principal

```text
chat-war-live/
├── assets/
│   ├── icons/
│   └── sprites/
├── src/
│   ├── config/
│   ├── game/
│   ├── live/
│   └── ui/
├── index.html
├── manifest.json
├── server.js
└── sw.js
```

## Comando rápido

Na pasta principal:

```powershell
npm install
node .\chat-war-live\server.js
```

Depois abra http://localhost:8082/.
