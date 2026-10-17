export class WebSocketClient {
  constructor({ url, onMessage, onOpen, onClose, onError }) {
    this.url = url;
    this.onMessage = onMessage || (() => {});
    this.onOpen = onOpen || (() => {});
    this.onClose = onClose || (() => {});
    this.onError = onError || (() => {});
    this.socket = null;
    this.reconnectMs = 3000;
    this.connected = false;
  }

  connect() {
    try {
      this.socket = new WebSocket(this.url);
      this.socket.addEventListener('open', () => {
        this.connected = true;
        this.onOpen();
      });

      this.socket.addEventListener('message', (event) => {
        try {
          const payload = JSON.parse(event.data);
          this.onMessage(payload);
        } catch (error) {
          console.warn('Evento WebSocket inválido', error);
        }
      });

      this.socket.addEventListener('close', () => {
        this.connected = false;
        this.onClose();
        setTimeout(() => this.connect(), this.reconnectMs);
      });

      this.socket.addEventListener('error', () => {
        this.connected = false;
        this.onError();
      });
    } catch (error) {
      console.error('Falha ao abrir WebSocket:', error);
      setTimeout(() => this.connect(), this.reconnectMs);
    }
  }

  send(payload) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
    }
  }
}
