export class LiveEventManager {
  constructor({ onChat, onGift, onStatus }) {
    this.onChat = onChat || (() => {});
    this.onGift = onGift || (() => {});
    this.onStatus = onStatus || (() => {});
    this.connected = false;
  }

  receiveRawEvent(raw) {
    if (!raw || typeof raw !== 'object') return;

    if (raw.type === 'chat') {
      this.onChat(raw);
      return;
    }

    if (raw.type === 'gift') {
      this.onGift(raw);
      return;
    }

    if (raw.type === 'status') {
      this.connected = !!raw.connected;
      this.onStatus(raw);
    }
  }

  emitDemoChat(username, comment) {
    this.receiveRawEvent({ type: 'chat', username, comment });
  }

  emitDemoGift(username, giftName, repeatCount = 1) {
    this.receiveRawEvent({ type: 'gift', username, giftName, repeatCount });
  }
}
