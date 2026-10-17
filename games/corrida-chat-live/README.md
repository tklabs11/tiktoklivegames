# CORRIDA DO CHAT

Jogo arcade vertical 9:16 para TikTok LIVE. Esta primeira versão é um laboratório jogável: carros seguem uma pista top-down, completam 5 voltas, colidem, perdem vidas, ativam poderes e atualizam o ranking pela distância real percorrida.

## Executar

O jogo possui servidor e configuração próprios. Na raiz do workspace:

```text
node corrida-chat-live/server.js
```

Abra:

```text
http://localhost:3001/
```

O servidor lê `corrida-chat-live/.env`, incluindo `TIKTOK_USERNAME` e `PORT=3001`.

## Testar

1. Adicione pilotos pelo campo ou pelos botões rápidos.
2. Clique em `Nova corrida`.
3. Use os poderes no painel para testar o feedback.
4. Observe o ranking no canto superior direito do canvas.
5. A corrida tem exatamente 5 voltas e exibe uma tela final.

## Ponte futura com TikTok

A integração foi deixada em duas funções globais no navegador:

```js
window.corridaChat.addPlayer(username)
window.corridaChat.usePower(powerType, username)
```

O bridge TikTok poderá chamar:

```js
chat -> addPlayer(username)
gift -> usePower('turbo', username)
```

Mapeamento sugerido:

- Rose: turbo
- Donut: shield
- Presente médio: bomb
- Presente grande: lightning
- Presente muito grande: nitro

## Arquitetura atual

- `app.js`: corrida, IA, carros, colisões, voltas, ranking, poderes, partículas e HUD.
- `styles.css`: composição responsiva e painel de teste.
- `index.html`: canvas 540x960 e controles de laboratório.
