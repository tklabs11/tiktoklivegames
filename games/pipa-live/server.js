require("dotenv").config();

// TK // creator mark

const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const {
    TikTokLiveConnection,
    WebcastEvent
} = require("tiktok-live-connector");

const APP_NAME = "Pipa Combat Live";
const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.TLG_PORT || process.env.PORT || 3000);
const ENABLE_BOTS = String(process.env.ENABLE_BOTS ?? "1").trim().toLowerCase() !== "0";
const SHOW_PARTICIPATION_PROMPT = String(process.env.SHOW_PARTICIPATION_PROMPT ?? "1").trim().toLowerCase() !== "0";
const liveUsernameConfigurado = (process.env.TLG_USERNAME || process.env.TIKTOK_USERNAME || process.argv[2] || "")
    .replace(/^@/, "")
    .trim();
const liveUsername = ["", "seu_usuario", "seu-usuario", "usuario"].includes(
    liveUsernameConfigurado.toLowerCase()
)
    ? ""
    : liveUsernameConfigurado;

const clients = new Set();
const ultimoChatPorUsuario = new Map();
const ultimoPresentePorEvento = new Map();
const INTERVALO_CHAT_MS = 30 * 1000;
const INTERVALO_DUPLICADO_PRESENTE_MS = 1500;
const INTERVALO_LIMPEZA_CACHE_MS = 60 * 1000;
let tiktokConectada = false;

const limpezaCaches = setInterval(() => {
    const limiteChat = Date.now() - INTERVALO_CHAT_MS;
    const limitePresente = Date.now() - INTERVALO_DUPLICADO_PRESENTE_MS;

    for (const [usuario, timestamp] of ultimoChatPorUsuario) {
        if (timestamp < limiteChat) {
            ultimoChatPorUsuario.delete(usuario);
        }
    }

    for (const [evento, timestamp] of ultimoPresentePorEvento) {
        if (timestamp < limitePresente) {
            ultimoPresentePorEvento.delete(evento);
        }
    }
}, INTERVALO_LIMPEZA_CACHE_MS);

const server = http.createServer((request, response) => {
    let requestPath;

    try {
        requestPath = decodeURIComponent(
            new URL(request.url, `http://${request.headers.host || "localhost"}`).pathname
        );
    } catch (error) {
        response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Bad request");
        return;
    }

    if (requestPath === "/health") {
        const statusCode = liveUsername && tiktokConectada ? 200 : 503;

        response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({
            ok: statusCode === 200,
            app: APP_NAME,
            status: statusCode === 200 ? "ready" : liveUsername ? "waiting_for_tiktok" : "missing_tiktok_username",
            tiktokConnected: tiktokConectada,
            clients: clients.size,
            liveUsername: liveUsername || null,
            port: PORT,
            uptimeSeconds: Math.round(process.uptime()),
            enableBots: ENABLE_BOTS,
            showParticipationPrompt: SHOW_PARTICIPATION_PROMPT
        }));
        return;
    }

    if (requestPath === "/config") {
        response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({
            enableBots: ENABLE_BOTS,
            showParticipationPrompt: SHOW_PARTICIPATION_PROMPT,
            liveUsername: liveUsername || null,
            port: PORT
        }));
        return;
    }

    const requestedPath = requestPath === "/"
        ? "/index.html"
        : requestPath.endsWith("/")
            ? `${requestPath}index.html`
            : requestPath;
    const filePath = path.resolve(__dirname, `.${requestedPath}`);
    const workspaceRoot = path.resolve(__dirname);

    if (!filePath.startsWith(`${workspaceRoot}${path.sep}`)) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
    }

    fs.readFile(filePath, (error, data) => {
        if (error) {
            response.writeHead(404);
            response.end("Not found");
            return;
        }

        const extensao =
            path.extname(filePath).toLowerCase();

        const tipos = {
            ".html": "text/html; charset=utf-8",
            ".js": "application/javascript; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".json": "application/manifest+json; charset=utf-8",
            ".svg": "image/svg+xml",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".webp": "image/webp"
        };

        const contentType =
            tipos[extensao] ||
            "text/plain; charset=utf-8";

        const cacheControl = [".html", ".js", ".css", ".json"].includes(extensao)
            ? "no-store, no-cache, must-revalidate, max-age=0"
            : "public, max-age=86400";

        response.writeHead(200, {
            "Content-Type": contentType,
            "Cache-Control": cacheControl
        });
        response.end(data);
    });
});

const webSocketServer = new WebSocket.Server({ server });

webSocketServer.on("connection", (socket) => {
    clients.add(socket);

    socket.send(JSON.stringify({
        type: "status",
        connected: tiktokConectada
    }));

    socket.on("close", () => {
        clients.delete(socket);
    });

    socket.on("error", () => {
        clients.delete(socket);
    });
});

function enviarParaOJogo(evento) {
    const mensagem = JSON.stringify(evento);

    for (const socket of clients) {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(mensagem);
        }
    }
}

function iniciarConexaoTikTok() {
    if (!liveUsername) {
        tiktokConectada = false;
        enviarParaOJogo({ type: "status", connected: false });
        console.warn("TIKTOK_USERNAME não informado. Configure o valor no arquivo .env antes de abrir a live.");
        return;
    }

    const conexao = new TikTokLiveConnection(liveUsername, {
        processInitialData: false
    });

    conexao.on("gift", (presente) => {
        if (presente.giftType === 1 && presente.repeatEnd === false) {
            return;
        }

        const nome =
            presente.user?.uniqueId ||
            presente.user?.nickname ||
            presente.uniqueId ||
            presente.nickname ||
            "Apoiador";

        const giftId =
            presente.giftId ||
            presente.giftName ||
            "presente";

        const repeatCount =
            presente.repeatCount ||
            1;

        const chavePresente =
            `${nome.toLowerCase()}:${giftId}:${repeatCount}`;

        const agora =
            Date.now();

        const ultimoPresente =
            ultimoPresentePorEvento.get(chavePresente) ||
            0;

        if (agora - ultimoPresente < INTERVALO_DUPLICADO_PRESENTE_MS) {
            return;
        }

        ultimoPresentePorEvento.set(
            chavePresente,
            agora
        );

        enviarParaOJogo({
            type: "gift",
            username: nome,
            giftName: presente.giftName || "Presente",
            giftId: presente.giftId,
            repeatCount: repeatCount
        });

        console.log(
            `${nome} enviou ${presente.giftName || "um presente"}`
        );
    });

    conexao.on(WebcastEvent.CHAT, (mensagem) => {
        const nome =
            mensagem.user?.uniqueId ||
            mensagem.user?.nickname ||
            mensagem.user?.displayName ||
            mensagem.uniqueId ||
            mensagem.nickname ||
            "Apoiador";

        const comentario =
            mensagem.comment ||
            mensagem.text ||
            mensagem.content ||
            "";

        const agora = Date.now();
        const chaveUsuario =
            nome.toLowerCase();
        const ehComando =
            comentario.trim().startsWith("!");
        const ultimoChat =
            ultimoChatPorUsuario.get(chaveUsuario) ||
            0;

        if (!ehComando && agora - ultimoChat < INTERVALO_CHAT_MS) {
            console.log(
                `Chat ignorado por cooldown de ${nome}`
            );
            return;
        }

        if (!ehComando) {
            ultimoChatPorUsuario.set(chaveUsuario, agora);
        }

        console.log(
            `Chat recebido de ${nome}: ${comentario}`
        );

        if (!comentario) {
            console.dir(mensagem, { depth: 5 });
        }

        enviarParaOJogo({
            type: "chat",
            username: nome,
            comment: comentario
        });
    });

    conexao.connect()
        .then(() => {
            tiktokConectada = true;
            enviarParaOJogo({ type: "status", connected: true });
            console.log(`Conectado à live de @${liveUsername}`);
        })
        .catch((error) => {
            tiktokConectada = false;
            enviarParaOJogo({ type: "status", connected: false });
            console.error("Não foi possível conectar à live:", error.message);
            setTimeout(iniciarConexaoTikTok, 5000);
        });
}

server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
        console.error(
            `A porta ${PORT} já está em uso. ` +
            "Feche a outra instância ou use PORT=3001."
        );
        process.exit(1);
    }

    if (error.code === "EACCES") {
        console.error(
            `A porta ${PORT} requer permissões elevadas ou está bloqueada pelo sistema.`
        );
        process.exit(1);
    }

    throw error;
});

server.listen(PORT, HOST, () => {
    console.log(`${APP_NAME} iniciou em http://localhost:${PORT}`);
    console.log(`Live configurada: ${liveUsername ? `@${liveUsername}` : "não configurada"}`);
    console.log(`Health check: http://localhost:${PORT}/health`);

    if (!liveUsername) {
        console.warn("Defina TIKTOK_USERNAME no arquivo .env para ativar a ponte com a live.");
    }

    iniciarConexaoTikTok();
});

function encerrarServidor() {
    clearInterval(limpezaCaches);
    webSocketServer.close();
    server.close(() => process.exit(0));
}

process.on("SIGINT", encerrarServidor);
process.on("SIGTERM", encerrarServidor);
