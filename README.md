<div align="center">

# 🎮 TikTokLiveGames

### Jogos interativos para transformar o chat da sua LIVE em parte da diversão.

**Desenvolvido por TKLabs** · Open source · Windows

![Status](https://img.shields.io/badge/status-beta-00c8db?style=flat-square) ![Licença do launcher](https://img.shields.io/badge/launcher-MIT-64748b?style=flat-square) ![Jogos](https://img.shields.io/badge/jogos-4-111827?style=flat-square)

**[Começar](#-como-começar)** · **[Jogos](#-biblioteca-de-jogos)** · **[Contribuir](#-contribua)**

</div>

---

## ✨ O que é?

O **TikTokLiveGames** é uma coleção de jogos interativos para transmissões no TikTok LIVE. Com o **TikTokLiveGames Launcher**, você escolhe um jogo, informa o usuário da sua LIVE e abre a tela para transmitir. Cada jogo tem suas próprias regras e interações: comentários, presentes ou outras ações dos espectadores.

> **🧪 Projeto em beta:** os jogos estão disponíveis para testes da comunidade. O **Corrida do Chat** ainda precisa de uma validação mais completa em LIVE real. A integração usa ferramentas não oficiais e pode sofrer alterações conforme o TikTok mudar seus serviços.

## 🕹️ Biblioteca de jogos

| Jogo | Como o público participa | Observações |
|:--|:--|:--|
| 🗳️ **URNA LIVE** | Enviando presentes específicos | Simulador **fictício** de votação; Rosa (`5655`) → 13; White Rose (`10602`) → 22 |
| 🪁 **Pipa Combat Live** | Comentários e presentes | Pipas aparecem na arena; há mecânicas de combate e poderes |
| ⚔️ **Chat War Live** | Chat e presentes | Espectadores entram na arena de combate |
| 🏎️ **Corrida do Chat** | Interações com a corrida | Servidor disponível; eventos TikTok ainda precisam de mais testes |

As configurações de presentes **não são universais**: cada jogo utiliza apenas os eventos relevantes para sua mecânica.

## 🚀 Como começar

### Pré-requisitos

- **Windows** com **Python 3.10 ou superior** instalado.
- **Node.js LTS** para executar Pipa Combat, Chat War e Corrida do Chat.
- Conexão com a internet e uma LIVE TikTok compatível.

### Passo a passo

1. Baixe o projeto e **extraia a pasta**.
2. Para jogar os títulos baseados em Node.js, execute **`INSTALAR-JOGOS-NODE.bat`** uma vez para instalar as dependências.
3. Abra **`INICIAR-LAUNCHER.bat`**.
4. Escolha o jogo na biblioteca e informe seu **usuário TikTok**.
5. Clique em **Conectar** e, após o servidor iniciar, em **Abrir transmissão**.
6. Adicione a janela ou página do jogo à sua ferramenta de transmissão, como OBS ou TikTok LIVE Studio.

**URNA LIVE:** se o Python indicar dependência ausente, instale-a pelo terminal na pasta do projeto:

```bash
py -3 -m pip install -r requirements.txt
```

> O botão **Configurar presentes** é específico da URNA LIVE. Os demais jogos não exigem essa configuração no launcher.

## 📦 Criar o executável para Windows

Na pasta do projeto, execute:

```text
tools/GERAR-EXE-WINDOWS.bat
```

O script usa PyInstaller e tenta gerar:

```text
dist/TikTokLiveGamesLauncher/TikTokLiveGamesLauncher.exe
```

**Distribua a pasta `TikTokLiveGamesLauncher` inteira**, não somente o `.exe`. Os jogos Node.js ainda dependem do Node e de seus pacotes; eles **não ficam totalmente embutidos** no executável do launcher. A compilação deve ser testada em um PC Windows antes de publicar um Release.

## 🗂️ Estrutura

```text
TikTokLiveGames/
├── launcher.py
├── INICIAR-LAUNCHER.bat
├── INSTALAR-JOGOS-NODE.bat
├── requirements.txt
├── games/
│   ├── urna-live/
│   ├── pipa-live/
│   ├── chat-war-live/
│   └── corrida-chat-live/
├── tools/
│   └── GERAR-EXE-WINDOWS.bat
├── LICENSE
└── README.md
```

## 🛠️ Desenvolvimento

O launcher inicia **um jogo por vez**. Nesta versão, os jogos baseados em Node.js ainda usam suas **próprias conexões** com o TikTok; uma conexão única compartilhada entre todos os jogos ainda não foi implementada.

Para incluir um novo jogo, organize seus arquivos em `games/` e siga o formato de configuração `game.json` dos jogos existentes. A integração depende do tipo de evento e do servidor usado por cada jogo.

## 🤝 Contribua

O projeto é aberto para melhorias, novos jogos, correções e testes. Você pode:

- Abrir uma **Issue** explicando o problema e incluindo logs sem dados pessoais.
- Enviar um **Pull Request** com uma correção ou recurso.
- Testar especialmente a **Corrida do Chat** e relatar quais eventos funcionam.
- Propor melhorias na interface, acessibilidade e experiência de instalação.

Ao reportar erros, informe o jogo, a versão do Windows, a versão do Python/Node (quando aplicável) e os passos para reproduzir.

## ⚖️ Licenças e avisos

O **launcher** é disponibilizado sob licença **MIT**. Antes de redistribuir os jogos e recursos gráficos, verifique as licenças e permissões específicas de cada componente. Nunca envie arquivos `.env` com credenciais ou dados privados ao repositório.

Este é um projeto independente da **TKLabs**, **sem afiliação ou endosso do TikTok**. Respeite as regras do TikTok LIVE, inclusive as relativas a presentes e monetização. A URNA LIVE é uma simulação fictícia, sem ligação com processos eleitorais oficiais.

---

<div align="center">

**Feito com criatividade por TKLabs** 💠

*Criar, compartilhar e deixar a comunidade jogar.*

</div>
