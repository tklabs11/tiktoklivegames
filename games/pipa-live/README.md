# Pipa Combat Live

Jogo vertical interativo de TikTok LIVE em navegador. Comentários criam pipas com o nome do espectador; presentes ativam poderes; cortes geram ranking, combos e eventos especiais.

## Requisitos

- Windows 10 ou 11
- Node.js 18+
- TikTok LIVE Studio
- Conta pública da live com acesso ao fluxo da transmissão

## Instalação rápida

### Para quem vai usar o jogo

1. Instale o Node.js LTS em [nodejs.org](https://nodejs.org/).
2. Extraia a pasta do Pipa Combat Live.
3. Execute `CONFIGURAR-PIPA-LIVE.bat` e informe o usuario publico da conta que fara a live.
4. Execute `INICIAR-PIPA-LIVE.bat`.
5. No TikTok LIVE Studio, adicione `http://localhost:3000` como fonte de navegador vertical.

Na primeira execucao, o launcher instala automaticamente os componentes do jogo, abre o navegador e inicia a ponte com o TikTok. A janela preta precisa permanecer aberta durante a live; fecha-la encerra o jogo.

### Para quem desenvolve ou atualiza o projeto

Se o PowerShell bloquear execução de scripts no Windows, rode a sessão com política local temporária:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
npm install
```

Crie um arquivo `.env` a partir do exemplo:

```powershell
Copy-Item .env.example .env
```

Edite o `.env` e defina a conta da live:

```env
TIKTOK_USERNAME=seu_usuario_da_live
PORT=3000
```

Inicie o projeto:

```powershell
npm start
```

Abra `http://localhost:3000` no navegador ou adicione essa URL como fonte de navegador no TikTok LIVE Studio.

## Entrega comercial

O pacote deve ser entregue com estes arquivos na mesma pasta:

- `INICIAR-PIPA-LIVE.bat`
- `CONFIGURAR-PIPA-LIVE.bat`
- `package.json` e `package-lock.json`
- arquivos do jogo e do servidor

O arquivo `.env` e a conta do TikTok pertencem ao comprador. Nunca distribua o seu `.env` pessoal junto com o produto.

## Health check e operação

O projeto expõe um endpoint para monitoramento operacional:

```powershell
Invoke-WebRequest http://localhost:3000/health
```

Se a live estiver conectada e o usuário configurado, a resposta deve indicar `status: "ready"`.

## Bots e incentivo de participação

No arquivo `.env` você pode controlar a arena:

```env
ENABLE_BOTS=1
SHOW_PARTICIPATION_PROMPT=1
```

- `ENABLE_BOTS=1`: ativa rivais automáticos para dar movimento e vida à arena.
- `ENABLE_BOTS=0`: deixa a arena sem bots e a ação depende mais da interação do chat.
- `SHOW_PARTICIPATION_PROMPT=1`: mostra uma mensagem chamativa no centro da tela quando não houver nenhuma pipa ativa.

A mensagem aparece apenas em momentos vazios da arena para incentivar novos jogadores a digitar qualquer coisa na live e criar a sua pipa.

## Comandos do chat

- Qualquer comentário: cria uma pipa, respeitando o cooldown por usuário.
- `!atacar`: ataca a pipa inimiga mais próxima.
- `!ranking`: enfatiza o ranking atual.
- `!vento`: ativa vento temporário.
- `!mapa1` e `!mapa2`: votam no mapa da próxima rodada.

## Checklist de operação

1. Inicie a live no TikTok LIVE Studio.
2. Rode `npm start` em um terminal.
3. Confirme no HUD a indicação de conexão com a live.
4. Use `http://localhost:3000` como fonte vertical.
5. Verifique o endpoint `http://localhost:3000/health` antes de abrir a transmissão para público.
