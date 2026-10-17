export class SoundManager {
  constructor() {
    this.context = null;
    this.enabled = true;
  }

  unlock() {
    if (!this.enabled || !window.AudioContext) return;
    if (!this.context) this.context = new AudioContext();
    if (this.context.state === 'suspended') this.context.resume();
  }

  playShot(isGiftWeapon = false) {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;

    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = isGiftWeapon ? 'sawtooth' : 'square';
    oscillator.frequency.setValueAtTime(isGiftWeapon ? 150 : 270, now);
    oscillator.frequency.exponentialRampToValueAtTime(isGiftWeapon ? 70 : 120, now + 0.09);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(isGiftWeapon ? 0.08 : 0.045, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    oscillator.connect(gain);
    gain.connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.11);
  }
}